# pyrefly: ignore [missing-import]
import cv2
# pyrefly: ignore [missing-import]
import mediapipe as mp
# pyrefly: ignore [missing-import]
from mediapipe.tasks import python
# pyrefly: ignore [missing-import]
from mediapipe.tasks.python import vision
# pyrefly: ignore [missing-import]
from mediapipe.framework.formats import landmark_pb2 
import json
import os
import time

# Configuration
DATA_DIR = "dataset_landmarks"
FRAMES_TO_CAPTURE = 60  # Number of frames to record per gesture sequence
WEBCAM_INDEX = 0
MP_MODEL_PATH = "hand_landmarker.task"

# Drawing utilities
mp_drawing = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_styles
mp_hands_connections = mp.solutions.hands

def main():
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)

    if not os.path.exists(MP_MODEL_PATH):
        print(f"Error: {MP_MODEL_PATH} not found. Please download the hand_landmarker.task model.")
        return

    sign_name = input("\nEnter the sign you are capturing (e.g., 'enye', 'j', 'z'): ").strip().lower()
    
    sign_dir = os.path.join(DATA_DIR, sign_name)
    if not os.path.exists(sign_dir):
        os.makedirs(sign_dir)
        print(f"Created directory: {sign_dir}")

    cap = cv2.VideoCapture(WEBCAM_INDEX)
    if not cap.isOpened():
        print("Error: Could not open webcam.")
        return

    print("\n--- INSTRUCTIONS ---")
    print("1. This tool tracks the SKELETAL MOVEMENT of your hands using MediaPipe.")
    print("2. It's designed for complex, moving signs like 'enye' or 'j'.")
    print("3. Position your hands in view.")
    print(f"4. Press 'SPACEBAR', then perform the movement. It will record for {FRAMES_TO_CAPTURE} frames.")
    print("5. It saves the 3D hand coordinates to a JSON file for AI training.")
    print("6. Press 'q' at any time to quit.")
    print("--------------------\n")

    capturing = False
    frame_count = 0
    sequence_data = []  # Will store landmarks for all frames in one sequence

    # Initialize the Hand Landmarker for video mode
    base_options = python.BaseOptions(model_asset_path=MP_MODEL_PATH)
    options = vision.HandLandmarkerOptions(
        base_options=base_options,
        running_mode=vision.RunningMode.VIDEO,
        num_hands=2
    )
    detector = vision.HandLandmarker.create_from_options(options)

    last_timestamp_ms = 0

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            print("Failed to grab frame")
            break

        # Flip the frame horizontally for a selfie-view display.
        frame = cv2.flip(frame, 1)
        display_frame = frame.copy()

        # Convert to MediaPipe Image
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb)

        # Generate a strictly increasing timestamp
        timestamp_ms = int(time.time() * 1000)
        if timestamp_ms <= last_timestamp_ms:
            timestamp_ms = last_timestamp_ms + 1
        last_timestamp_ms = timestamp_ms

        detection_result = detector.detect_for_video(mp_image, timestamp_ms)

        frame_landmarks_data = []

        if detection_result.hand_landmarks:
            for hand_idx, hand_landmarks in enumerate(detection_result.hand_landmarks):
                # Convert to proto format for drawing
                hand_landmarks_proto = landmark_pb2.NormalizedLandmarkList()
                hand_landmarks_proto.landmark.extend([
                    landmark_pb2.NormalizedLandmark(x=lm.x, y=lm.y, z=lm.z)
                    for lm in hand_landmarks
                ])

                mp_drawing.draw_landmarks(
                    display_frame,
                    hand_landmarks_proto,
                    mp_hands_connections.HAND_CONNECTIONS,
                    mp_drawing_styles.get_default_hand_landmarks_style(),
                    mp_drawing_styles.get_default_hand_connections_style()
                )
                
                # Extract landmark coordinates
                hand_data = []
                for lm in hand_landmarks:
                    hand_data.append({
                        "x": lm.x,
                        "y": lm.y,
                        "z": lm.z
                    })
                
                # Determine left/right hand
                handedness = detection_result.handedness[hand_idx][0].display_name
                frame_landmarks_data.append({
                    "handedness": handedness,
                    "landmarks": hand_data
                })

        if not capturing:
            cv2.putText(display_frame, f"Ready to capture: '{sign_name}'", (10, 30), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            cv2.putText(display_frame, "Press SPACE to start moving", (10, 60), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
        else:
            cv2.putText(display_frame, f"RECORDING MOVEMENT: {frame_count}/{FRAMES_TO_CAPTURE}", (10, 30), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
            
            # Append the frame's landmark data to our sequence
            sequence_data.append({
                "frame": frame_count,
                "hands": frame_landmarks_data
            })
            frame_count += 1

            if frame_count >= FRAMES_TO_CAPTURE:
                capturing = False
                
                # Save the sequence to a JSON file
                timestamp = int(time.time() * 1000)
                filename = os.path.join(sign_dir, f"{sign_name}_sequence_{timestamp}.json")
                with open(filename, 'w') as f:
                    json.dump({
                        "label": sign_name,
                        "frames": FRAMES_TO_CAPTURE,
                        "sequence": sequence_data
                    }, f)
                
                print(f"Successfully recorded movement sequence to {filename}!")
                
                print("\nDo you want to capture another sign? (Close the window with 'q' to exit)")
                next_sign = input("Enter the next sign name (or press enter to skip/wait): ").strip().lower()
                if next_sign:
                    sign_name = next_sign
                    sign_dir = os.path.join(DATA_DIR, sign_name)
                    if not os.path.exists(sign_dir):
                        os.makedirs(sign_dir)

        cv2.imshow('Landmark Collection', display_frame)

        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
        
        if key == 32 and not capturing:
            capturing = True
            frame_count = 0
            sequence_data = []  # Reset for the new recording
            print("Started recording skeletal movement...")

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
