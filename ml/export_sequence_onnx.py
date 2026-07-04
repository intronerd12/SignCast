import json
import os
import sys
import torch
import torch.nn as nn

# Fix Unicode encoding issues on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    os.environ["PYTHONIOENCODING"] = "utf-8"

_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(_DIR, "models", "sequence_model.pth")
LABELS_PATH = os.path.join(_DIR, "models", "sequence_labels.json")
ONNX_PATH = os.path.join(_DIR, "models", "sequence_model.onnx")

class SequenceLSTM(nn.Module):
    def __init__(self, input_size, hidden_size, num_layers, num_classes):
        super(SequenceLSTM, self).__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True, dropout=0.2 if num_layers > 1 else 0.0)
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

def main():
    if not os.path.exists(LABELS_PATH):
        print("Sequence labels not found. Run train_sequence_model.py first.")
        return

    with open(LABELS_PATH, "r") as f:
        labels = json.load(f)

    num_classes = len(labels)
    input_size = 63  # 21 landmarks * 3 coords
    hidden_size = 64
    num_layers = 2
    seq_length = 30

    print(f"Model: {num_classes} classes, {input_size} input features, {seq_length} sequence length")
    print(f"Labels: {list(labels.keys())}")

    model = SequenceLSTM(input_size, hidden_size, num_layers, num_classes)
    model.load_state_dict(torch.load(MODEL_PATH, map_location="cpu", weights_only=True))
    model.eval()

    dummy_input = torch.randn(1, seq_length, input_size)

    torch.onnx.export(
        model,
        dummy_input,
        ONNX_PATH,
        export_params=True,
        opset_version=18,
        do_constant_folding=True,
        input_names=["sequence"],
        output_names=["scores"],
        dynamic_axes={
            "sequence": {0: "batch_size"},
            "scores": {0: "batch_size"},
        },
    )

    file_size = os.path.getsize(ONNX_PATH)
    print(f"\nExport complete!")
    print(f"  ONNX file: {ONNX_PATH} ({file_size:,} bytes)")

    import onnx
    onnx_model = onnx.load(ONNX_PATH)
    onnx.save_model(onnx_model, ONNX_PATH, save_as_external_data=False, all_tensors_to_one_file=True)

if __name__ == "__main__":
    main()
