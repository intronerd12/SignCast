import json
import random
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader

DATA_FILE = "sequence_dataset.json"
MODEL_SAVE_PATH = "sequence_model.pth"
LABELS_SAVE_PATH = "sequence_labels.json"
BATCH_SIZE = 16
NUM_EPOCHS = 100
LEARNING_RATE = 0.001

class SequenceDataset(Dataset):
    def __init__(self, sequences, labels):
        # sequences shape: (N, 30, 63)
        self.sequences = torch.tensor(sequences, dtype=torch.float32)
        self.labels = torch.tensor(labels, dtype=torch.long)
        
    def __len__(self):
        return len(self.labels)
        
    def __getitem__(self, idx):
        return self.sequences[idx], self.labels[idx]

class SequenceLSTM(nn.Module):
    def __init__(self, input_size, hidden_size, num_layers, num_classes):
        super(SequenceLSTM, self).__init__()
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        
        # LSTM expects: (batch_size, seq_length, input_size) when batch_first=True
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True, dropout=0.2 if num_layers > 1 else 0.0)
        
        self.fc = nn.Sequential(
            nn.Linear(hidden_size, 64),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(64, num_classes)
        )
        
    def forward(self, x):
        # Forward propagate LSTM
        # out: tensor of shape (batch_size, seq_length, hidden_size)
        out, _ = self.lstm(x)
        
        # Decode the hidden state of the last time step
        out = out[:, -1, :]
        out = self.fc(out)
        return out

def main():
    try:
        with open(DATA_FILE, 'r') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"Error: {DATA_FILE} not found. Please run capture_sequence.py first.")
        return
        
    if not data:
        print("Error: Dataset is empty.")
        return
        
    # Extract unique labels
    classes = sorted(list(set(item['label'] for item in data)))
    class_to_idx = {cls_name: i for i, cls_name in enumerate(classes)}
    
    print(f"Found {len(data)} total sequences across {len(classes)} classes: {classes}")
    
    sequences = []
    labels = []
    for item in data:
        sequences.append(item['sequence'])
        labels.append(class_to_idx[item['label']])
        
    # Split into train/validation sets
    combined = list(zip(sequences, labels))
    random.seed(42)
    random.shuffle(combined)
    split_idx = int(len(combined) * 0.9)
    train_data = combined[:split_idx]
    val_data = combined[split_idx:]
    
    if not train_data:
        print("Not enough data to train. Please capture more sequences.")
        return

    X_train = [x[0] for x in train_data]
    y_train = [x[1] for x in train_data]
    X_val = [x[0] for x in val_data] if val_data else X_train
    y_val = [x[1] for x in val_data] if val_data else y_train
    
    train_dataset = SequenceDataset(X_train, y_train)
    val_dataset = SequenceDataset(X_val, y_val)
    
    train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE, shuffle=False)
    
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")
    
    # 21 landmarks * 3 coordinates = 63
    input_size = 63 
    hidden_size = 64
    num_layers = 2
    
    model = SequenceLSTM(input_size, hidden_size, num_layers, len(classes)).to(device)
    
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=LEARNING_RATE)
    
    print("\nStarting Training Phase...")
    
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
