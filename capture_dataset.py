# pyrefly: ignore [missing-import]
import cv2
import os
import json
import time
# pyrefly: ignore [missing-import]
import mediapipe as mp
# pyrefly: ignore [missing-import]
from mediapipe.tasks import python
# pyrefly: ignore [missing-import]
from mediapipe.tasks.python import vision
# pyrefly: ignore [missing-import]
from mediapipe.tasks.python.vision import drawing_utils as mp_drawing
# pyrefly: ignore [missing-import]
from mediapipe.tasks.python.vision import HandLandmarksConnections

# Configuration
DATA_DIR = "dataset"
LANDMARK_FILE = "landmark_dataset.json"
MP_MODEL_PATH = "hand_landmarker.task"
REFERENCE_CHART = "references/sign_language_chart.png"
FRAMES_TO_CAPTURE = 100
WEBCAM_INDEX = 0
CAPTURE_DELAY = 0.1  # Delay between captures (~10 fps)

def load_existing_landmarks():
    """Load existing landmark data so we can append to it."""
    if os.path.exists(LANDMARK_FILE):
        with open(LANDMARK_FILE, 'r') as f:
            return json.load(f)
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

def main():
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)

    if not os.path.exists(MP_MODEL_PATH):
        print(f"Error: {MP_MODEL_PATH} not found.")
        print("Please download it with:")
        print(f"  curl -o {MP_MODEL_PATH} https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task")
        return

    # Load existing landmark data so new captures append to it
    all_landmarks = load_existing_landmarks()
    if all_landmarks:
        counts = get_dataset_summary(all_landmarks)
        print(f"\nExisting dataset: {len(all_landmarks)} total landmarks")
        for label in sorted(counts):
            print(f"  '{label}': {counts[label]} samples")

    print("\n========================================")
    print("  SignCast - Dataset Capture Tool")
    print("========================================")
    print("You can capture ANY sign name: letters (a-z),")
    print("words (hello, thanks), or custom signs (enye).")
    print("Type 'done' when finished capturing all signs.")
    print("========================================\n")

    sign_name = input("Enter sign name to capture: ").strip().lower()
    if sign_name == 'done' or not sign_name:
        print("Nothing to capture. Exiting.")
        return

    sign_dir = os.path.join(DATA_DIR, sign_name)
    if not os.path.exists(sign_dir):
        os.makedirs(sign_dir)

    cap = cv2.VideoCapture(WEBCAM_INDEX)
    if not cap.isOpened():
        print("Error: Could not open webcam.")
        return

    print("\n--- CONTROLS ---")
    print("SPACEBAR  = Start/stop capturing")
    print("N         = Switch to next sign (type new name in terminal)")
    print("H         = Toggle reference chart (ASL alphabet)")
    print("R         = Reset (delete data for current sign)")
    print("*         = Save and quit")
    print("----------------\n")

    # Load the reference chart
    ref_chart = None
    if os.path.exists(REFERENCE_CHART):
        ref_chart = cv2.imread(REFERENCE_CHART)
        if ref_chart is not None:
            # Resize to a reasonable window size
            chart_h, chart_w = ref_chart.shape[:2]
            max_h = 600
            if chart_h > max_h:
                scale = max_h / chart_h
                ref_chart = cv2.resize(ref_chart, (int(chart_w * scale), max_h))
    else:
        print(f"Note: No reference chart found at '{REFERENCE_CHART}'.")
        print("  Place an ASL chart image there and press H to view it.\n")
    
    show_reference = False

    # Initialize the Hand Landmarker for video mode
    base_options = python.BaseOptions(model_asset_path=MP_MODEL_PATH)
    options = vision.HandLandmarkerOptions(
        base_options=base_options,
        running_mode=vision.RunningMode.VIDEO,
        num_hands=1
    )
    detector = vision.HandLandmarker.create_from_options(options)

    capturing = False
    captured_landmarks = 0
    last_capture_time = 0
    last_timestamp_ms = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            print("Failed to grab frame")
            break

        frame = cv2.flip(frame, 1)
        display_frame = frame.copy()

        # Run hand detection on every frame for skeleton overlay
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb)
        
        timestamp_ms = int(time.time() * 1000)
        if timestamp_ms <= last_timestamp_ms:
            timestamp_ms = last_timestamp_ms + 1
        last_timestamp_ms = timestamp_ms

        detection_result = detector.detect_for_video(mp_image, timestamp_ms)

        hand_detected = False
        current_features = None

        if detection_result.hand_landmarks:
            hand_landmarks = detection_result.hand_landmarks[0]
            hand_detected = True

            # Draw the skeleton
            mp_drawing.draw_landmarks(
                display_frame,
                hand_landmarks,
                HandLandmarksConnections.HAND_CONNECTIONS
            )

            # Extract wrist-relative features
            wrist = hand_landmarks[0]
            current_features = []
            for lm in hand_landmarks:
                current_features.extend([
                    lm.x - wrist.x,
                    lm.y - wrist.y,
                    lm.z - wrist.z
                ])

        # Count existing samples for this sign
        current_count = sum(1 for item in all_landmarks if item['label'] == sign_name)

        # Status bar at the top
        h, w = display_frame.shape[:2]
        
        # Draw dark background bar for text readability
        cv2.rectangle(display_frame, (0, 0), (w, 90), (0, 0, 0), -1)

        if not capturing:
            status_color = (0, 255, 0) if hand_detected else (0, 100, 255)
            hand_status = "Hand OK" if hand_detected else "No Hand"
            cv2.putText(display_frame, f"Sign: '{sign_name.upper()}'  |  {hand_status}  |  Saved: {current_count}", (10, 30), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, status_color, 2)
            cv2.putText(display_frame, "SPACE=Capture  N=Next  H=Reference  *=Quit", (10, 60), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.55, (200, 200, 200), 1)
        else:
            progress = captured_landmarks / FRAMES_TO_CAPTURE
            bar_width = int(progress * (w - 20))
            cv2.rectangle(display_frame, (10, 70), (10 + bar_width, 85), (0, 255, 0), -1)
            cv2.rectangle(display_frame, (10, 70), (w - 10, 85), (100, 100, 100), 2)
            
            cv2.putText(display_frame, f"CAPTURING '{sign_name.upper()}': {captured_landmarks}/{FRAMES_TO_CAPTURE}", (10, 30), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
            if not hand_detected:
                cv2.putText(display_frame, "Show your hand!", (10, 55), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 100, 255), 2)

        # Show/hide reference chart
        if show_reference and ref_chart is not None:
            cv2.imshow('ASL Reference Chart', ref_chart)

        cv2.imshow('SignCast - Dataset Capture', display_frame)

        key = cv2.waitKey(1) & 0xFF

        # Quit
        if key == ord('*'):
            print("Saving and quitting...")
            break

        # Toggle reference chart
        if key == ord('h'):
            show_reference = not show_reference
            if not show_reference:
                try:
                    cv2.destroyWindow('ASL Reference Chart')
                except cv2.error:
                    pass
            elif ref_chart is None:
                print("No reference chart found. Place an image at: references/sign_language_chart.png")
                show_reference = False

        # Start/stop capture
        if key == 32 and not capturing:
            capturing = True
            captured_landmarks = 0
            print(f">>> Capturing '{sign_name}'...")

        # Switch to next sign
        if key == ord('n') and not capturing:
            save_landmarks(all_landmarks)
            counts = get_dataset_summary(all_landmarks)
            print(f"\nDataset so far: {len(all_landmarks)} total samples")
            for label in sorted(counts):
                print(f"  '{label}': {counts[label]}")
            sign_name = input("\nEnter next sign name (or 'done' to finish): ").strip().lower()
            if sign_name == 'done' or not sign_name:
                print("Finishing capture session...")
                break
            sign_dir = os.path.join(DATA_DIR, sign_name)
            if not os.path.exists(sign_dir):
                os.makedirs(sign_dir)
            print(f"Switched to '{sign_name}'. Press SPACE to capture.")

        # Reset current sign data
        if key == ord('r') and not capturing:
            removed = len([x for x in all_landmarks if x['label'] == sign_name])
            all_landmarks = [x for x in all_landmarks if x['label'] != sign_name]
            print(f"Removed {removed} samples for '{sign_name}'. Press SPACE to recapture.")

        # Capture logic
        if capturing and hand_detected and current_features is not None:
            current_time = time.time()
            if current_time - last_capture_time >= CAPTURE_DELAY:
                all_landmarks.append({
                    "label": sign_name,
                    "features": current_features
                })
                
                # Save image for reference
                image_filename = os.path.join(sign_dir, f"{sign_name}_{captured_landmarks:03d}.jpg")
                cv2.imwrite(image_filename, frame)
                
                captured_landmarks += 1
                last_capture_time = current_time

            if captured_landmarks >= FRAMES_TO_CAPTURE:
                capturing = False
                save_landmarks(all_landmarks)
                current_count = sum(1 for item in all_landmarks if item['label'] == sign_name)
                print(f"Done! '{sign_name}' now has {current_count} samples.")
                print(f"Press N for next sign, SPACE to capture more of '{sign_name}', or * to quit.")

    # Final save
    save_landmarks(all_landmarks)
    counts = get_dataset_summary(all_landmarks)
    print(f"\n========================================")
    print(f"  Final Dataset Summary")
    print(f"========================================")
    print(f"Total: {len(all_landmarks)} landmark samples")
    for label in sorted(counts):
        print(f"  '{label}': {counts[label]} samples")
    print(f"Saved to: {LANDMARK_FILE}")
    print(f"========================================")
    print(f"\nNext step: Run 'python train_landmark_model.py' to train!")
    
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
