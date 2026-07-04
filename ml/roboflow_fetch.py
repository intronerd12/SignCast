"""
roboflow_fetch.py - Fetch predictions from Roboflow Workflows API.

Uses `requests` directly instead of `inference-sdk` to avoid
the Python <3.13 version constraint.

Usage:
    # Run on a single image
    python roboflow_fetch.py path/to/image.jpg

    # Run on a directory of images
    python roboflow_fetch.py path/to/images/

    # Save results to a custom location
    python roboflow_fetch.py path/to/image.jpg -o results.json
"""

import os
import sys
import json
import base64
import glob
import argparse
import requests

# ── Configuration ──────────────────────────────────────────────────────────────
_DIR = os.path.dirname(os.path.abspath(__file__))

ROBOFLOW_API_URL = "https://serverless.roboflow.com"
ROBOFLOW_API_KEY = "vSmtDSumhDVW5oZg72Ef"
WORKSPACE_NAME   = "ianzaes-workspace"
WORKFLOW_ID      = "filipino-sign-language-dataset-vfilipino-sign-language-dataset-h0guf-1-yolo11n-t1-logic"

RESULTS_DIR = os.path.join(_DIR, "data", "roboflow_results")


# ── Helpers ────────────────────────────────────────────────────────────────────

def encode_image_base64(image_path):
    """Read an image file and return its base64 encoding."""
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def find_images(path):
    """Find all image files at the given path (single file or directory)."""
    if os.path.isfile(path):
        return [path]

    image_paths = []
    for ext in ("*.jpg", "*.jpeg", "*.png", "*.bmp", "*.webp"):
        image_paths.extend(
            glob.glob(os.path.join(path, "**", ext), recursive=True)
        )
    return sorted(image_paths)


# ── Roboflow API ───────────────────────────────────────────────────────────────

def run_workflow_on_image(image_path):
    """
    Send a single image to the Roboflow Workflow and return the raw result.

    This replicates what InferenceHTTPClient.run_workflow() does internally,
    but using plain `requests` so it works on any Python version.
    """
    url = (
        f"{ROBOFLOW_API_URL}/infer/workflows/"
        f"{WORKSPACE_NAME}/{WORKFLOW_ID}"
    )

    image_b64 = encode_image_base64(image_path)

    payload = {
        "api_key": ROBOFLOW_API_KEY,
        "inputs": {
            "image": {
                "type": "base64",
                "value": image_b64,
            }
        },
    }

    headers = {"Content-Type": "application/json"}

    response = requests.post(url, json=payload, headers=headers, timeout=60)
    response.raise_for_status()
    return response.json()


def run_workflow_batch(image_paths):
    """Run the workflow on a list of images and collect all results."""
    results = []
    total = len(image_paths)

    for i, img_path in enumerate(image_paths, 1):
        basename = os.path.basename(img_path)
        print(f"  [{i}/{total}] {basename} ... ", end="", flush=True)
        try:
            result = run_workflow_on_image(img_path)
            results.append({
                "image": os.path.abspath(img_path),
                "filename": basename,
                "predictions": result,
            })
            print("OK")
        except requests.exceptions.HTTPError as e:
            print(f"HTTP Error ({e.response.status_code})")
            results.append({
                "image": os.path.abspath(img_path),
                "filename": basename,
                "error": f"HTTP {e.response.status_code}: {e.response.text[:200]}",
            })
        except requests.exceptions.ConnectionError:
            print("Connection failed")
            results.append({
                "image": os.path.abspath(img_path),
                "filename": basename,
                "error": "Could not connect to Roboflow API. Check your internet connection.",
            })
        except Exception as e:
            print(f"Error: {e}")
            results.append({
                "image": os.path.abspath(img_path),
                "filename": basename,
                "error": str(e),
            })

    return results


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Fetch predictions from a Roboflow Workflow (no inference-sdk needed)."
    )
    parser.add_argument(
        "image_path",
        help="Path to an image file or a directory containing images.",
    )
    parser.add_argument(
        "--output", "-o",
        default=None,
        help="Path to save prediction results as JSON. "
             "Defaults to ml/data/roboflow_results/predictions.json",
    )
    args = parser.parse_args()

    # Resolve output path
    output_path = args.output or os.path.join(RESULTS_DIR, "predictions.json")

    # Discover images
    image_paths = find_images(args.image_path)
    if not image_paths:
        print(f"Error: No images found at '{args.image_path}'")
        sys.exit(1)

    print("=" * 55)
    print("  Roboflow Workflow Runner")
    print("=" * 55)
    print(f"  Workspace : {WORKSPACE_NAME}")
    print(f"  Workflow   : {WORKFLOW_ID}")
    print(f"  Images     : {len(image_paths)}")
    print(f"  Output     : {output_path}")
    print("=" * 55)
    print()

    # Run the workflow
    results = run_workflow_batch(image_paths)

    # Save results
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(results, f, indent=2)

    # Print summary
    successes = sum(1 for r in results if "error" not in r)
    failures  = sum(1 for r in results if "error" in r)

    print()
    print("=" * 55)
    print("  Results Summary")
    print("=" * 55)
    print(f"  Processed : {len(results)} images")
    print(f"  Success   : {successes}")
    print(f"  Failed    : {failures}")
    print(f"  Saved to  : {output_path}")
    print("=" * 55)

    # Preview first successful result
    for r in results:
        if "error" not in r:
            print("\n  Preview (first result):")
            print(json.dumps(r["predictions"], indent=2)[:500])
            break

    if failures > 0:
        print(f"\n  Warning: {failures} image(s) failed. Check the output JSON for details.")


if __name__ == "__main__":
    main()
