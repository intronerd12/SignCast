import os
import glob
import json
import shutil
import argparse
import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

_DIR = os.path.dirname(os.path.abspath(__file__))
IMAGE_DATA_DIR = os.path.join(_DIR, "data", "dataset")
LANDMARK_FILE = os.path.join(_DIR, "data", "landmark_dataset.json")
MP_MODEL_PATH = os.path.join(_DIR, "models", "hand_landmarker.task")

def load_existing_landmarks():
    """Load existing landmark data so we can append to it."""
    if os.path.exists(LANDMARK_FILE):
        with open(LANDMARK_FILE, 'r') as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return []
    return []

def save_landmarks(data):
    """Save landmark data to disk."""
    with open(LANDMARK_FILE, 'w') as f:
        json.dump(data, f)

def get_dataset_summary(landmarks):
    """Return a summary of how many samples exist per label."""
    counts = {}
    for item in landmarks:
        label = item['label']
        counts[label] = counts.get(label, 0) + 1
    return counts

def import_dataset(source_dir):
    if not os.path.exists(source_dir):
        print(f"Error: Source directory '{source_dir}' does not exist.")
        return

    if not os.path.exists(MP_MODEL_PATH):
        print(f"Error: {MP_MODEL_PATH} not found.")
        print("Please ensure the MediaPipe model is downloaded.")
        return

    # Ensure output directories exist
    os.makedirs(IMAGE_DATA_DIR, exist_ok=True)

    # Initialize Hand Landmarker
    print("Initializing MediaPipe Hand Landmarker...")
    base_options = python.BaseOptions(model_asset_path=MP_MODEL_PATH)
    options = vision.HandLandmarkerOptions(
        base_options=base_options,
        running_mode=vision.RunningMode.IMAGE,
        num_hands=1
    )
    detector = vision.HandLandmarker.create_from_options(options)

    all_landmarks = load_existing_landmarks()
    print(f"Loaded {len(all_landmarks)} existing landmark samples.")

    # Find all images in the source directory
    image_paths = []
    for ext in ('*.jpg', '*.jpeg', '*.png'):
        image_paths.extend(glob.glob(os.path.join(source_dir, '**', ext), recursive=True))
    
    if not image_paths:
        print(f"No images found in '{source_dir}'.")
        return

    print(f"Found {len(image_paths)} images to process.")

    total_images_copied = 0
    total_landmarks_added = 0
    processed_classes = set()

    for img_path in image_paths:
        # Determine class name by looking at the parent directory of the image
        # This handles both flat folders (source/A/img.jpg) and Roboflow split folders (source/train/A/img.jpg)
        cls_name = os.path.basename(os.path.dirname(img_path))
        cls_name_lower = cls_name.lower().strip()
        
        # If the parent directory is just 'train', 'test', 'valid', or 'images', it means the dataset 
        # is probably an object detection dataset (YOLO) not a classification dataset.
        if cls_name_lower in ['train', 'valid', 'test', 'images']:
            print(f"Warning: Skipping {img_path} - ensure you export from Roboflow as a 'Classification' dataset in 'Folder' format.")
            continue

        target_cls_dir = os.path.join(IMAGE_DATA_DIR, cls_name_lower)
        os.makedirs(target_cls_dir, exist_ok=True)
        processed_classes.add(cls_name_lower)

        filename = os.path.basename(img_path)
        # Create a unique filename to avoid overwrites
        unique_filename = f"imported_{filename}"
        target_img_path = os.path.join(target_cls_dir, unique_filename)

        # Copy image for the image-based dataset
        shutil.copy2(img_path, target_img_path)
        total_images_copied += 1

        # Load image for MediaPipe
        image = cv2.imread(img_path)
        if image is None:
            continue

        # MediaPipe expects RGB
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)

        # Detect landmarks
        detection_result = detector.detect(mp_image)

        if detection_result.hand_landmarks:
            hand_landmarks = detection_result.hand_landmarks[0]
            
            # Extract wrist-relative features
            wrist = hand_landmarks[0]
            current_features = []
            for lm in hand_landmarks:
                current_features.extend([
                    lm.x - wrist.x,
                    lm.y - wrist.y,
                    lm.z - wrist.z
                ])
            
            # Append to landmark dataset
            all_landmarks.append({
                "label": cls_name_lower,
                "features": current_features
            })
            total_landmarks_added += 1
            
        # Optional: Print progress every 100 images
        if total_images_copied % 100 == 0:
            print(f"Processed {total_images_copied}/{len(image_paths)} images...")

    print(f"\nImported classes: {sorted(list(processed_classes))}")

    # Save updated landmarks
    print(f"\nSaving updated landmarks to {LANDMARK_FILE}...")
    save_landmarks(all_landmarks)
    
    print("\n========================================")
    print("  Import Complete")
    print("========================================")
    print(f"Total images copied to image dataset: {total_images_copied}")
    print(f"Total landmark samples added: {total_landmarks_added}")
    print("\nNew Landmark Dataset Summary:")
    counts = get_dataset_summary(all_landmarks)
    for label in sorted(counts):
        print(f"  '{label}': {counts[label]} samples")
    print("========================================")
    print("You can now run 'python train_model.py' or 'python train_landmark_model.py'!")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Import an online sign language dataset.")
    parser.add_argument("source_dir", help="Path to the extracted dataset directory (must contain subfolders for each sign/class)")
    args = parser.parse_args()

    import_dataset(args.source_dir)
