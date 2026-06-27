import os
import glob
import json
import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import transforms, models
from torch.utils.data import Dataset, DataLoader
from PIL import Image

# Configuration
DATA_DIR = "dataset"
BATCH_SIZE = 16
NUM_EPOCHS = 10
LEARNING_RATE = 0.001
MODEL_SAVE_PATH = "sign_model.pth"
LABELS_SAVE_PATH = "labels.json"

class SignLanguageDataset(Dataset):
    def __init__(self, data_dir, transform=None):
        self.data_dir = data_dir
        self.transform = transform
        self.image_paths = []
        self.labels = []
        
        # Discover classes
        self.classes = sorted([d for d in os.listdir(data_dir) if os.path.isdir(os.path.join(data_dir, d))])
        self.class_to_idx = {cls_name: i for i, cls_name in enumerate(self.classes)}
        
        # Gather all images
        for cls_name in self.classes:
            cls_dir = os.path.join(data_dir, cls_name)
            # Find all images in the class directory (including subdirectories like 'images/')
            for ext in ('*.jpg', '*.jpeg', '*.png'):
                self.image_paths.extend(glob.glob(os.path.join(cls_dir, '**', ext), recursive=True))
                
        for path in self.image_paths:
            # The class name is the immediate subdirectory of DATA_DIR
            rel_path = os.path.relpath(path, data_dir)
            cls_name = rel_path.split(os.sep)[0]
            self.labels.append(self.class_to_idx[cls_name])

    def __len__(self):
        return len(self.image_paths)

    def __getitem__(self, idx):
        img_path = self.image_paths[idx]
        image = Image.open(img_path).convert('RGB')
        label = self.labels[idx]
        
        if self.transform:
            image = self.transform(image)
            
        return image, label

def main():
    print(f"Scanning '{DATA_DIR}' for dataset...")
    
    # Preprocessing transformations
    # MobileNetV2 expects 224x224 and normalization using ImageNet stats
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(p=0.5), # Data augmentation
        transforms.RandomRotation(10), # Data augmentation
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    dataset = SignLanguageDataset(DATA_DIR, transform=transform)
    
    if len(dataset) == 0:
        print(f"Error: No images found in {DATA_DIR}. Please capture some signs first.")
        return

    print(f"Found {len(dataset)} images across {len(dataset.classes)} classes: {dataset.classes}")
    
    # Save labels for testing later
    with open(LABELS_SAVE_PATH, 'w') as f:
        json.dump(dataset.class_to_idx, f)
    
    dataloader = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=True)
    
    # Load MobileNetV2 (fast and accurate for webcams)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")
    
    print("Loading MobileNetV2 architecture...")
    model = models.mobilenet_v2(pretrained=True)
    
    # Replace the final layer to match our number of classes
    num_ftrs = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(num_ftrs, len(dataset.classes))
    model = model.to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=LEARNING_RATE)

    print("\nStarting Training Phase...")
    for epoch in range(NUM_EPOCHS):
        model.train()
        running_loss = 0.0
        correct = 0
        total = 0
        
        for inputs, labels in dataloader:
            inputs = inputs.to(device)
            labels = labels.to(device)
            
            optimizer.zero_grad()
            
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            
            running_loss += loss.item() * inputs.size(0)
            
            _, predicted = torch.max(outputs.data, 1)
            total += labels.size(0)
            correct += (predicted == labels).sum().item()
            
        epoch_loss = running_loss / len(dataset)
        epoch_acc = 100 * correct / total
        print(f"Epoch {epoch+1}/{NUM_EPOCHS} - Loss: {epoch_loss:.4f} - Accuracy: {epoch_acc:.2f}%")

    # Save the trained model
    torch.save(model.state_dict(), MODEL_SAVE_PATH)
    print(f"\nTraining Complete! Model saved to {MODEL_SAVE_PATH}")
    print(f"Labels saved to {LABELS_SAVE_PATH}")
    print("You can now run 'test_recognition.py' to try it out!")

if __name__ == "__main__":
    main()
