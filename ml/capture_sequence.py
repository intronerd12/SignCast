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
_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(_DIR, "data", "dataset_sequence")
SEQUENCE_FILE = os.path.join(_DIR, "data", "sequence_dataset.json")
MP_MODEL_PATH = os.path.join(_DIR, "models", "hand_landmarker.task")
REFERENCE_CHART = os.path.join(_DIR, "references", "sign_language_chart.png")
FRAMES_PER_SEQUENCE = 30
WEBCAM_INDEX = 0

def load_existing_sequences():
    """Load existing sequence data so we can append to it."""
    if os.path.exists(SEQUENCE_FILE):
        with open(SEQUENCE_FILE, 'r') as f:
            return json.load(f)
    return []

def save_sequences(data):
    """Save sequence data to disk."""
    with open(SEQUENCE_FILE, 'w') as f:
        json.dump(data, f)

def get_dataset_summary(sequences):
    """Return a summary of how many sequence samples exist per label."""
    counts = {}
    for item in sequences:
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

    # Load existing sequence data so new captures append to it
    all_sequences = load_existing_sequences()
    if all_sequences:
        counts = get_dataset_summary(all_sequences)
        print(f"\nExisting dataset: {len(all_sequences)} total sequences")
        for label in sorted(counts):
            print(f"  '{label}': {counts[label]} sequences")

    print("\n========================================")
    print("  SignCast - Sequence Capture Tool")
    print("========================================")
    print("This tool captures 30-frame *sequences* for")
    print("moving signs like 'J' and 'Z'.")
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
    print("SPACEBAR  = Start capturing a 30-frame sequence")
    print("N         = Switch to next sign")
    print("H         = Toggle reference chart")
    print("R         = Reset (delete data for current sign)")
    print("*         = Save and quit")
    print("----------------\n")

    # Load the reference chart
    ref_chart = None
    if os.path.exists(REFERENCE_CHART):
        ref_chart = cv2.imread(REFERENCE_CHART)
        if ref_chart is not None:
            chart_h, chart_w = ref_chart.shape[:2]
            max_h = 600
            if chart_h > max_h:
                scale = max_h / chart_h
                ref_chart = cv2.resize(ref_chart, (int(chart_w * scale), max_h))
    
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
    current_sequence = []
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
        else:
            # If no hand is detected, we can pad with zeros to maintain sequence length
            current_features = [0.0] * 63

        # Count existing samples for this sign
        current_count = sum(1 for item in all_sequences if item['label'] == sign_name)

        # Status bar at the top
        h, w = display_frame.shape[:2]
        cv2.rectangle(display_frame, (0, 0), (w, 90), (0, 0, 0), -1)

        if not capturing:
            status_color = (0, 255, 0) if hand_detected else (0, 100, 255)
            hand_status = "Hand OK" if hand_detected else "No Hand"
            cv2.putText(display_frame, f"Sign: '{sign_name.upper()}'  |  {hand_status}  |  Sequences: {current_count}", (10, 30), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, status_color, 2)
            cv2.putText(display_frame, "SPACE=Capture Sequence  N=Next  H=Reference  *=Quit", (10, 60), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.55, (200, 200, 200), 1)
        else:
            progress = len(current_sequence) / FRAMES_PER_SEQUENCE
            bar_width = int(progress * (w - 20))
            cv2.rectangle(display_frame, (10, 70), (10 + bar_width, 85), (0, 255, 0), -1)
            cv2.rectangle(display_frame, (10, 70), (w - 10, 85), (100, 100, 100), 2)
            
            cv2.putText(display_frame, f"CAPTURING '{sign_name.upper()}': {len(current_sequence)}/{FRAMES_PER_SEQUENCE}", (10, 30), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)

        # Show/hide reference chart
        if show_reference and ref_chart is not None:
            cv2.imshow('ASL Reference Chart', ref_chart)

        cv2.imshow('SignCast - Sequence Capture', display_frame)

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

        # Start/stop capture
        if key == 32 and not capturing:
            if not hand_detected:
                print("Please show your hand before capturing!")
            else:
                capturing = True
                current_sequence = []
                print(f">>> Capturing sequence for '{sign_name}'...")

        # Switch to next sign
        if key == ord('n') and not capturing:
            save_sequences(all_sequences)
            counts = get_dataset_summary(all_sequences)
            print(f"\nDataset so far: {len(all_sequences)} total sequences")
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
            removed = len([x for x in all_sequences if x['label'] == sign_name])
            all_sequences = [x for x in all_sequences if x['label'] != sign_name]
            print(f"Removed {removed} sequences for '{sign_name}'. Press SPACE to recapture.")

        # Capture logic (runs every frame without delay)
        if capturing:
            current_sequence.append(current_features)

            if len(current_sequence) >= FRAMES_PER_SEQUENCE:
                capturing = False
                all_sequences.append({
                    "label": sign_name,
                    "sequence": current_sequence
                })
                save_sequences(all_sequences)
                current_count = sum(1 for item in all_sequences if item['label'] == sign_name)
                print(f"Sequence saved! '{sign_name}' now has {current_count} sequences.")

    # Final save
    save_sequences(all_sequences)
    counts = get_dataset_summary(all_sequences)
    print(f"\n========================================")
    print(f"  Final Dataset Summary")
    print(f"========================================")
    print(f"Total: {len(all_sequences)} sequences")
    for label in sorted(counts):
        print(f"  '{label}': {counts[label]} sequences")
    print(f"Saved to: {SEQUENCE_FILE}")
    print(f"========================================")
    print(f"\nNext step: Run 'python train_sequence_model.py' to train!")
    
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
