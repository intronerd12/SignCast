import cv2
import torch
import torch.nn as nn
from torchvision import transforms, models
from PIL import Image
import json

# Configuration
MODEL_PATH = "sign_model.pth"
LABELS_PATH = "labels.json"
WEBCAM_INDEX = 0

def load_labels():
    try:
        with open(LABELS_PATH, 'r') as f:
            class_to_idx = json.load(f)
            # Invert the dictionary to get idx_to_class
            idx_to_class = {v: k for k, v in class_to_idx.items()}
            return idx_to_class
    except FileNotFoundError:
        print(f"Error: {LABELS_PATH} not found. Did you run train_model.py first?")
        return None

def build_model(num_classes, device):
    print("Loading model architecture...")
    model = models.mobilenet_v2(pretrained=False) # No need to download pretrained weights since we will load our own
    num_ftrs = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(num_ftrs, num_classes)
    
    print(f"Loading trained weights from {MODEL_PATH}...")
    try:
        model.load_state_dict(torch.load(MODEL_PATH, map_location=device))
    except FileNotFoundError:
        print(f"Error: {MODEL_PATH} not found. Please run train_model.py first.")
        return None
        
    model = model.to(device)
    model.eval() # Set to evaluation mode
    return model

def main():
    idx_to_class = load_labels()
    if idx_to_class is None:
        return
        
    num_classes = len(idx_to_class)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    
    model = build_model(num_classes, device)
    if model is None:
        return

    # Same transform as training (but without data augmentation)
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    cap = cv2.VideoCapture(WEBCAM_INDEX)
    if not cap.isOpened():
        print("Error: Could not open webcam.")
        return

    print("\n--- INSTRUCTIONS ---")
    print("1. Position your hand in front of the camera.")
    print("2. The system will predict the sign in real-time.")
    print("3. Press 'q' to exit.")
    print("--------------------\n")

    while True:
        ret, frame = cap.read()
        if not ret:
            print("Failed to grab frame")
            break

        # Flip horizontally for a mirror effect
        frame = cv2.flip(frame, 1)
        display_frame = frame.copy()

        # Convert OpenCV BGR frame to PIL RGB Image
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        pil_img = Image.fromarray(rgb_frame)

        # Preprocess the image
        input_tensor = transform(pil_img).unsqueeze(0).to(device) # Add batch dimension

        # Run inference
        with torch.no_grad():
            outputs = model(input_tensor)
            probabilities = torch.nn.functional.softmax(outputs[0], dim=0)
            
            # Get the top prediction
            top_prob, top_class_idx = torch.max(probabilities, 0)
            top_prob_val = top_prob.item() * 100
            predicted_label = idx_to_class[top_class_idx.item()]

        # Display the result on the screen
        if top_prob_val > 60: # Confidence threshold
            text = f"Prediction: {predicted_label.upper()} ({top_prob_val:.1f}%)"
            color = (0, 255, 0) # Green if confident
        else:
            text = f"Prediction: None / Unsure"
            color = (0, 0, 255) # Red if unsure

        cv2.putText(display_frame, text, (10, 40), 
                    cv2.FONT_HERSHEY_SIMPLEX, 1, color, 3)

        cv2.imshow('Sign Language Recognition', display_frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
