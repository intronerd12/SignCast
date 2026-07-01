"""
Export the trained PyTorch landmark model to ONNX format for browser inference.
Run: python export_onnx.py
"""
import json
import os
import sys

# Fix Unicode encoding issues on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    os.environ["PYTHONIOENCODING"] = "utf-8"

# pyrefly: ignore [missing-import]
import torch
# pyrefly: ignore [missing-import]
import torch.nn as nn

_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(_DIR, "models", "landmark_model.pth")
LABELS_PATH = os.path.join(_DIR, "models", "landmark_labels.json")
ONNX_PATH = os.path.join(_DIR, "models", "landmark_model.onnx")


class LandmarkMLP(nn.Module):
    """Must match the architecture in train_landmark_model.py exactly."""
    def __init__(self, input_size, num_classes):
        super(LandmarkMLP, self).__init__()
        self.network = nn.Sequential(
            nn.Linear(input_size, 128),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(64, num_classes),
        )

    def forward(self, x):
        return self.network(x)


def main():
    # Load labels to determine num_classes
    with open(LABELS_PATH, "r") as f:
        labels = json.load(f)

    num_classes = len(labels)
    input_size = 63  # 21 landmarks * 3 coordinates (x, y, z)

    print(f"Model: {num_classes} classes, {input_size} input features")
    print(f"Labels: {list(labels.keys())}")

    # Recreate model and load weights
    model = LandmarkMLP(input_size, num_classes)
    model.load_state_dict(torch.load(MODEL_PATH, map_location="cpu", weights_only=True))
    model.eval()

    # Create dummy input matching the expected shape
    dummy_input = torch.randn(1, input_size)

    # Export to ONNX
    torch.onnx.export(
        model,
        dummy_input,
        ONNX_PATH,
        export_params=True,
        opset_version=18,
        do_constant_folding=True,
        input_names=["landmarks"],
        output_names=["scores"],
        dynamic_axes={
            "landmarks": {0: "batch_size"},
            "scores": {0: "batch_size"},
        },
    )

    file_size = os.path.getsize(ONNX_PATH)
    print(f"\nExport complete!")
    print(f"  ONNX file: {ONNX_PATH} ({file_size:,} bytes)")
    print(f"  Input shape: (batch, {input_size})")
    print(f"  Output shape: (batch, {num_classes})")

    # Ensure weights are embedded in the ONNX file instead of separate external data
    import onnx
    onnx_model = onnx.load(ONNX_PATH)
    onnx.save_model(onnx_model, ONNX_PATH, save_as_external_data=False, all_tensors_to_one_file=True)
    
    # Remove external data file if it exists
    data_path = ONNX_PATH + ".data"
    if os.path.exists(data_path):
        os.remove(data_path)



if __name__ == "__main__":
    main()
