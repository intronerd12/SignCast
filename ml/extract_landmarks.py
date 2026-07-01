import os
import glob
import json
# pyrefly: ignore [missing-import]
import mediapipe as mp
# pyrefly: ignore [missing-import]
from mediapipe.tasks import python
# pyrefly: ignore [missing-import]
from mediapipe.tasks.python import vision

_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(_DIR, "data", "dataset")
OUTPUT_FILE = os.path.join(_DIR, "data", "landmark_dataset.json")
MODEL_PATH = os.path.join(_DIR, "models", "hand_landmarker.task")

def main():
    if not os.path.exists(DATA_DIR):
        print(f"Error: {DATA_DIR} does not exist.")
        return
        
    if not os.path.exists(MODEL_PATH):
        print(f"Error: {MODEL_PATH} not found. Please download the hand_landmarker.task model.")
        return

    classes = sorted([d for d in os.listdir(DATA_DIR) if os.path.isdir(os.path.join(DATA_DIR, d))])
    if not classes:
        print(f"Error: No class folders found in {DATA_DIR}.")
        return

    print(f"Found classes: {classes}")
    
    dataset_data = []
    
    # Initialize the Hand Landmarker using the Tasks API
    base_options = python.BaseOptions(model_asset_path=MODEL_PATH)
    options = vision.HandLandmarkerOptions(base_options=base_options, num_hands=1)
    detector = vision.HandLandmarker.create_from_options(options)
    
    for cls_name in classes:
        cls_dir = os.path.join(DATA_DIR, cls_name)
        image_paths = []
        for ext in ('*.jpg', '*.jpeg', '*.png'):
            image_paths.extend(glob.glob(os.path.join(cls_dir, '**', ext), recursive=True))
        
        print(f"Processing class '{cls_name}' ({len(image_paths)} images)...")
        
        success_count = 0
        for path in image_paths:
            # Read image using MediaPipe Image
            mp_image = mp.Image.create_from_file(path)
            
            # Detect hand landmarks
            detection_result = detector.detect(mp_image)

            if not detection_result.hand_landmarks:
                continue
            
            # Use the first hand found
            hand_landmarks = detection_result.hand_landmarks[0]
            
            # Extract the 21 landmarks into a flat list of 63 values
            # Normalize relative to the wrist (landmark 0) for position-invariance
            wrist = hand_landmarks[0]
            
            features = []
            for lm in hand_landmarks:
                features.extend([
                    lm.x - wrist.x,
                    lm.y - wrist.y,
                    lm.z - wrist.z
                ])
                
            dataset_data.append({
                "label": cls_name,
                "features": features
            })
            success_count += 1
            
        print(f"  -> Extracted landmarks from {success_count}/{len(image_paths)} images.")

    with open(OUTPUT_FILE, 'w') as f:
        json.dump(dataset_data, f)
        
    print(f"\nDone! Extracted total {len(dataset_data)} landmark vectors and saved to {OUTPUT_FILE}.")

if __name__ == "__main__":
    main()
