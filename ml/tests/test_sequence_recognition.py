# pyrefly: ignore [missing-import]
import cv2
import torch
import torch.nn as nn
import json
import time
from collections import deque
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
import os

_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(_DIR, "..", "models", "sequence_model.pth")
LABELS_PATH = os.path.join(_DIR, "..", "models", "sequence_labels.json")
MP_MODEL_PATH = os.path.join(_DIR, "..", "models", "hand_landmarker.task")
WEBCAM_INDEX = 0
FRAMES_PER_SEQUENCE = 30

class SequenceLSTM(nn.Module):
    def __init__(self, input_size, hidden_size, num_layers, num_classes):
        super(SequenceLSTM, self).__init__()
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
        self.fc = nn.Sequential(
            nn.Linear(hidden_size, 64),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(64, num_classes)
        )
        
    def forward(self, x):
        out, _ = self.lstm(x)
        out = out[:, -1, :]
        out = self.fc(out)
        return out

def load_labels():
    try:
        with open(LABELS_PATH, 'r') as f:
            class_to_idx = json.load(f)
            idx_to_class = {v: k for k, v in class_to_idx.items()}
            return idx_to_class
    except FileNotFoundError:
        print(f"Error: {LABELS_PATH} not found. Did you run train_sequence_model.py first?")
        return None

def main():
    idx_to_class = load_labels()
    if idx_to_class is None:
        return
        
    num_classes = len(idx_to_class)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    
    print("Loading sequence model...")
    model = SequenceLSTM(63, 64, 2, num_classes)
    
    try:
        model.load_state_dict(torch.load(MODEL_PATH, map_location=device))
    except FileNotFoundError:
        print(f"Error: {MODEL_PATH} not found. Please run train_sequence_model.py first.")
        return
        
    model = model.to(device)
    model.eval()

    cap = cv2.VideoCapture(WEBCAM_INDEX)
    if not cap.isOpened():
        print("Error: Could not open webcam.")
        return

    print("\n--- INSTRUCTIONS ---")
    print("1. Position your hand in front of the camera.")
    print("2. The system tracks your hand motion over time.")
    print("3. Press 'q' to exit.")
    print("--------------------\n")

    # Initialize the Hand Landmarker for video mode
    base_options = python.BaseOptions(model_asset_path=MP_MODEL_PATH)
    options = vision.HandLandmarkerOptions(
        base_options=base_options,
        running_mode=vision.RunningMode.VIDEO,
        num_hands=1
    )
    detector = vision.HandLandmarker.create_from_options(options)

    last_timestamp_ms = 0
    frame_buffer = deque(maxlen=FRAMES_PER_SEQUENCE)

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        frame = cv2.flip(frame, 1)
        display_frame = frame.copy()

        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb)

        timestamp_ms = int(time.time() * 1000)
        if timestamp_ms <= last_timestamp_ms:
            timestamp_ms = last_timestamp_ms + 1
        last_timestamp_ms = timestamp_ms

        detection_result = detector.detect_for_video(mp_image, timestamp_ms)

        predicted_label = "None"
        confidence = 0.0
        current_features = [0.0] * 63  # Default to zeros if no hand found

        if detection_result.hand_landmarks:
            hand_landmarks = detection_result.hand_landmarks[0]

            mp_drawing.draw_landmarks(
                display_frame,
                hand_landmarks,
                HandLandmarksConnections.HAND_CONNECTIONS
            )
            
            wrist = hand_landmarks[0]
            current_features = []
            for lm in hand_landmarks:
                current_features.extend([
                    lm.x - wrist.x,
                    lm.y - wrist.y,
                    lm.z - wrist.z
                ])

        # Add features to our rolling buffer
        frame_buffer.append(current_features)

        # Only predict if we have a full sequence of frames
        if len(frame_buffer) == FRAMES_PER_SEQUENCE:
            # frame_buffer is a list of 30 lists, each having 63 features
            input_tensor = torch.tensor(list(frame_buffer), dtype=torch.float32).unsqueeze(0).to(device)
            
            with torch.no_grad():
                outputs = model(input_tensor)
                probabilities = torch.nn.functional.softmax(outputs[0], dim=0)
                top_prob, top_class_idx = torch.max(probabilities, 0)
                
                confidence = top_prob.item() * 100
                predicted_label = idx_to_class[top_class_idx.item()]

        # Display prediction
        if confidence > 50:
            text = f"Sign: {predicted_label.upper()} ({confidence:.1f}%)"
            color = (0, 255, 0)
        else:
            text = "Sign: None / Unsure"
            color = (0, 0, 255)

        # If buffer is filling up, show a loading status
        if len(frame_buffer) < FRAMES_PER_SEQUENCE:
            text = f"Buffering... {len(frame_buffer)}/{FRAMES_PER_SEQUENCE}"
            color = (0, 165, 255)

        cv2.putText(display_frame, text, (10, 40), 
                    cv2.FONT_HERSHEY_SIMPLEX, 1, color, 3)

        cv2.imshow('Motion Sign Recognition', display_frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
