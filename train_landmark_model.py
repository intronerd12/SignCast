import json
import random
# pyrefly: ignore [missing-import]
import torch
# pyrefly: ignore [missing-import]
import torch.nn as nn
# pyrefly: ignore [missing-import]
import torch.optim as optim
# pyrefly: ignore [missing-import]
from torch.utils.data import Dataset, DataLoader

DATA_FILE = "landmark_dataset.json"
MODEL_SAVE_PATH = "landmark_model.pth"
LABELS_SAVE_PATH = "landmark_labels.json"
BATCH_SIZE = 32
NUM_EPOCHS = 100
LEARNING_RATE = 0.005

class LandmarkDataset(Dataset):
    def __init__(self, features, labels):
        self.features = torch.tensor(features, dtype=torch.float32)
        self.labels = torch.tensor(labels, dtype=torch.long)
        
    def __len__(self):
        return len(self.labels)
        
    def __getitem__(self, idx):
        return self.features[idx], self.labels[idx]

class LandmarkMLP(nn.Module):
    def __init__(self, input_size, num_classes):
        super(LandmarkMLP, self).__init__()
        self.network = nn.Sequential(
            nn.Linear(input_size, 128),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(64, num_classes)
        )
        
    def forward(self, x):
        return self.network(x)

def main():
    try:
        with open(DATA_FILE, 'r') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"Error: {DATA_FILE} not found. Please run extract_landmarks.py first.")
        return
        
    if not data:
        print("Error: Dataset is empty.")
        return
        
    # Extract unique labels
    classes = sorted(list(set(item['label'] for item in data)))
    class_to_idx = {cls_name: i for i, cls_name in enumerate(classes)}
    
    print(f"Found {len(data)} total samples across {len(classes)} classes: {classes}")
    
    features = []
    labels = []
    for item in data:
        features.append(item['features'])
        labels.append(class_to_idx[item['label']])
        
    # Split into train/validation sets
    combined = list(zip(features, labels))
    random.seed(42)
    random.shuffle(combined)
    split_idx = int(len(combined) * 0.9)
    train_data = combined[:split_idx]
    val_data = combined[split_idx:]
    
    X_train = [x[0] for x in train_data]
    y_train = [x[1] for x in train_data]
    X_val = [x[0] for x in val_data]
    y_val = [x[1] for x in val_data]
    
    train_dataset = LandmarkDataset(X_train, y_train)
    val_dataset = LandmarkDataset(X_val, y_val)
    
    train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE, shuffle=False)
    
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")
    
    # 21 landmarks * 3 coordinates (x,y,z) = 63
    input_size = len(features[0]) 
    model = LandmarkMLP(input_size, len(classes)).to(device)
    
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=LEARNING_RATE)
    
    print("\nStarting Training Phase...")
    best_val_loss = float('inf')
    
    for epoch in range(NUM_EPOCHS):
        model.train()
        train_loss = 0.0
        train_correct = 0
        train_total = 0
        
        for inputs, targets in train_loader:
            inputs, targets = inputs.to(device), targets.to(device)
            
            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, targets)
            loss.backward()
            optimizer.step()
            
            train_loss += loss.item() * inputs.size(0)
            _, predicted = torch.max(outputs.data, 1)
            train_total += targets.size(0)
            train_correct += (predicted == targets).sum().item()
            
        model.eval()
        val_loss = 0.0
        val_correct = 0
        val_total = 0
        
        with torch.no_grad():
            for inputs, targets in val_loader:
                inputs, targets = inputs.to(device), targets.to(device)
                outputs = model(inputs)
                loss = criterion(outputs, targets)
                
                val_loss += loss.item() * inputs.size(0)
                _, predicted = torch.max(outputs.data, 1)
                val_total += targets.size(0)
                val_correct += (predicted == targets).sum().item()
                
        train_acc = 100 * train_correct / train_total
        val_acc = 100 * val_correct / val_total
        avg_train_loss = train_loss / train_total
        avg_val_loss = val_loss / val_total
        
        if (epoch + 1) % 10 == 0:
            print(f"Epoch {epoch+1:03d}/{NUM_EPOCHS} - Train Loss: {avg_train_loss:.4f}, Train Acc: {train_acc:.1f}% | Val Loss: {avg_val_loss:.4f}, Val Acc: {val_acc:.1f}%")
            
    # Save the model
    torch.save(model.state_dict(), MODEL_SAVE_PATH)
    
    # Save labels
    with open(LABELS_SAVE_PATH, 'w') as f:
        json.dump(class_to_idx, f)
        
    print(f"\nTraining Complete!")
    print(f"Model saved to {MODEL_SAVE_PATH}")
    print(f"Labels saved to {LABELS_SAVE_PATH}")

if __name__ == "__main__":
    main()
