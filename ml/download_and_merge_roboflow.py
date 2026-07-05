import os
import json
import cv2
import yaml
import glob
from roboflow import Roboflow
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_JSON = os.path.join(_DIR, "data", "landmark_dataset.json")
MP_MODEL_PATH = os.path.join(_DIR, "models", "hand_landmarker.task")
DOWNLOAD_DIR = os.path.join(_DIR, "data", "roboflow_download")

ROBOFLOW_API_KEY = "vSmtDSumhDVW5oZg72Ef"
WORKSPACE_NAME   = "ianzaes-workspace"
PROJECT_NAME     = "filipino-sign-language-dataset-h0guf"
VERSION          = 1

def main():
    print("1. Downloading dataset from Roboflow...")
    rf = Roboflow(api_key=ROBOFLOW_API_KEY)
    project = rf.workspace(WORKSPACE_NAME).project(PROJECT_NAME)
    
    # Download as yolov8 which gives images and labels directories + data.yaml
    dataset = project.version(VERSION).download("yolov8", location=DOWNLOAD_DIR)
    
    print("\n2. Parsing data.yaml to get class names...")
    yaml_path = os.path.join(DOWNLOAD_DIR, "data.yaml")
    if not os.path.exists(yaml_path):
        print(f"Error: {yaml_path} not found.")
        return
        
    with open(yaml_path, 'r') as f:
        data_yaml = yaml.safe_load(f)
        
    class_names = data_yaml.get("names", [])
    print(f"Classes found: {class_names}")
    
    print("\n3. Initializing MediaPipe...")
    base_options = python.BaseOptions(model_asset_path=MP_MODEL_PATH)
    options = vision.HandLandmarkerOptions(
        base_options=base_options,
        running_mode=vision.RunningMode.IMAGE,
        num_hands=1
    )
    detector = vision.HandLandmarker.create_from_options(options)
    
    print("\n4. Loading existing local dataset...")
    local_data = []
    if os.path.exists(DATASET_JSON):
        with open(DATASET_JSON, 'r') as f:
            local_data = json.load(f)
            
    starting_count = len(local_data)
    print(f"Loaded {starting_count} existing local samples.")
    
    print("\n5. Processing Roboflow images...")
    processed_count = 0
    skipped_count = 0
    
    for split in ["train", "valid", "test"]:
        images_dir = os.path.join(DOWNLOAD_DIR, split, "images")
        labels_dir = os.path.join(DOWNLOAD_DIR, split, "labels")
        
        if not os.path.exists(images_dir):
            continue
            
        for img_path in glob.glob(os.path.join(images_dir, "*.jpg")):
            basename = os.path.basename(img_path)
            txt_name = basename.replace(".jpg", ".txt")
            txt_path = os.path.join(labels_dir, txt_name)
            
            if not os.path.exists(txt_path):
                skipped_count += 1
                continue
                
            # Read label to get class index
            with open(txt_path, 'r') as f:
                lines = f.readlines()
                if not lines:
                    skipped_count += 1
                    continue
                # YOLO format: class_id x_center y_center width height
                parts = lines[0].strip().split()
                class_id = int(parts[0])
                label_name = class_names[class_id].lower()
                
            # Run MediaPipe
            frame = cv2.imread(img_path)
            if frame is None:
                skipped_count += 1
                continue
                
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb)
            
            detection_result = detector.detect(mp_image)
            
            if not detection_result.hand_landmarks:
                # No hand detected in this image
                skipped_count += 1
                continue
                
            hand_landmarks = detection_result.hand_landmarks[0]
            wrist = hand_landmarks[0]
            
            features = []
            for lm in hand_landmarks:
                features.extend([
                    lm.x - wrist.x,
                    lm.y - wrist.y,
                    lm.z - wrist.z
                ])
                
            local_data.append({
                "label": label_name,
                "features": features
            })
            processed_count += 1
            
    print(f"\nDone! Processed and added {processed_count} new samples. Skipped {skipped_count} images (no hand or label).")
    print(f"Total dataset size is now: {len(local_data)}")
    
    print("\n6. Saving merged dataset...")
    with open(DATASET_JSON, 'w') as f:
        json.dump(local_data, f)
        
    print("Merge complete! You can now run `python train_model.py` to train on the unified dataset.")

if __name__ == "__main__":
    main()
