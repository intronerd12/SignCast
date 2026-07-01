"""
Sync local model files and dataset to Supabase.

Uploads:
  1. Model files (ONNX, labels, MediaPipe task) → Supabase Storage (signcast-models bucket)
  2. Dataset landmarks → fsl_sign_samples table

Usage:
  python sync_to_supabase.py              # upload everything
  python sync_to_supabase.py --models     # upload model files only
  python sync_to_supabase.py --dataset    # upload dataset only

Reads SUPABASE_URL and SUPABASE_SECRET_KEY from backend/.env
"""
import argparse
import json
import os
import sys

try:
    # pyrefly: ignore [missing-import]
    from dotenv import load_dotenv
except ImportError:
    print("Installing python-dotenv...")
    os.system(f"{sys.executable} -m pip install python-dotenv -q")
    from dotenv import load_dotenv # pyrefly: ignore

try:
    # pyrefly: ignore [missing-import]
    from supabase import create_client
except ImportError:
    print("Installing supabase-py...")
    os.system(f"{sys.executable} -m pip install supabase -q")
    # pyrefly: ignore [missing-import]
    from supabase import create_client

# Load env from backend/.env
_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_PATH = os.path.join(_DIR, "..", "backend", ".env")
load_dotenv(ENV_PATH)

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SECRET_KEY")
BUCKET_NAME = "signcast-models"
TABLE_NAME = "fsl_sign_samples"

MODEL_FILES = [
    {"local": os.path.join(_DIR, "models", "landmark_model.onnx"), "remote": "landmark_model.onnx", "mime": "application/octet-stream"},
    {"local": os.path.join(_DIR, "models", "landmark_labels.json"), "remote": "landmark_labels.json", "mime": "application/json"},
    {"local": os.path.join(_DIR, "models", "hand_landmarker.task"), "remote": "hand_landmarker.task", "mime": "application/octet-stream"},
]

DATASET_FILE = os.path.join(_DIR, "data", "landmark_dataset.json")


def upload_models(supabase):
    """Upload model files to Supabase Storage."""
    print("\n=== Uploading Model Files ===")

    for item in MODEL_FILES:
        local_path = item["local"]
        remote_path = item["remote"]

        if not os.path.exists(local_path):
            print(f"  SKIP: {local_path} not found")
            continue

        file_size = os.path.getsize(local_path)
        print(f"  Uploading {local_path} ({file_size:,} bytes) -> {BUCKET_NAME}/{remote_path}")

        with open(local_path, "rb") as f:
            file_data = f.read()

        # Remove existing file first (upsert)
        try:
            supabase.storage.from_(BUCKET_NAME).remove([remote_path])
        except Exception:
            pass  # File may not exist yet

        try:
            supabase.storage.from_(BUCKET_NAME).upload(
                remote_path,
                file_data,
                file_options={"content-type": item["mime"]},
            )
            # Get public URL
            public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(remote_path)
            print(f"    [OK] Uploaded -> {public_url}")
        except Exception as e:
            error_msg = str(e)
            if "Duplicate" in error_msg or "already exists" in error_msg:
                # Try update instead
                try:
                    supabase.storage.from_(BUCKET_NAME).update(
                        remote_path,
                        file_data,
                        file_options={"content-type": item["mime"]},
                    )
                    public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(remote_path)
                    print(f"    [OK] Updated -> {public_url}")
                except Exception as e2:
                    print(f"    [ERR] Failed to update: {e2}")
            else:
                print(f"    [ERR] Failed: {e}")


def upload_dataset(supabase):
    """Upload dataset landmarks to fsl_sign_samples table."""
    print("\n=== Uploading Dataset ===")

    if not os.path.exists(DATASET_FILE):
        print(f"  SKIP: {DATASET_FILE} not found")
        return

    with open(DATASET_FILE, "r") as f:
        data = json.load(f)

    print(f"  Loaded {len(data)} samples from {DATASET_FILE}")

    # Group by label
    by_label = {}
    for item in data:
        label = item["label"]
        if label not in by_label:
            by_label[label] = []
        by_label[label].append(item["features"])

    print(f"  Labels: {sorted(by_label.keys())}")

    # Upload each label group as a single fsl_sign_samples row
    # (landmarks column stores the full array of feature vectors)
    uploaded = 0
    for label, features_list in sorted(by_label.items()):
        sample_count = len(features_list)

        row = {
            "label": label,
            "category": "alphabet" if len(label) == 1 else "phrase",
            "source": "dataset",
            "device": "webcam",
            "landmarks": features_list,
            "frame_count": sample_count,
            "quality_score": 0.99,
            "is_verified": True,
            "notes": f"Bulk upload: {sample_count} landmark samples",
        }

        try:
            # Check if a dataset entry for this label already exists
            existing = (
                supabase.table(TABLE_NAME)
                .select("id")
                .eq("label", label)
                .eq("source", "dataset")
                .limit(1)
                .execute()
            )

            if existing.data and len(existing.data) > 0:
                # Update existing row
                result = (
                    supabase.table(TABLE_NAME)
                    .update(row)
                    .eq("id", existing.data[0]["id"])
                    .execute()
                )
                print(f"    Updated '{label}': {sample_count} samples")
            else:
                # Insert new row
                result = supabase.table(TABLE_NAME).insert(row).execute()
                print(f"    Inserted '{label}': {sample_count} samples")

            uploaded += 1
        except Exception as e:
            print(f"    [ERR] Failed '{label}': {e}")

    print(f"\n  Done: {uploaded}/{len(by_label)} labels uploaded")


def main():
    parser = argparse.ArgumentParser(description="Sync model files and dataset to Supabase")
    parser.add_argument("--models", action="store_true", help="Upload model files only")
    parser.add_argument("--dataset", action="store_true", help="Upload dataset only")
    args = parser.parse_args()

    # Default: upload everything
    do_models = args.models or (not args.models and not args.dataset)
    do_dataset = args.dataset or (not args.models and not args.dataset)

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Error: SUPABASE_URL and SUPABASE_SECRET_KEY must be set in backend/.env")
        sys.exit(1)

    print(f"Supabase URL: {SUPABASE_URL}")
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    if do_models:
        upload_models(supabase)

    if do_dataset:
        upload_dataset(supabase)

    print("\n=== Sync Complete ===")


if __name__ == "__main__":
    main()
