#!/bin/bash

echo "========================================================"
echo "SignCast - Automated Installation Script for Dependencies"
echo "========================================================"
echo ""

echo "[1/4] Installing Frontend Dependencies..."
cd frontend || exit
npm install
cd ..
echo "Frontend installation complete!"
echo ""

echo "[2/4] Installing Backend Dependencies..."
cd backend || exit
npm install
cd ..
echo "Backend installation complete!"
echo ""

echo "[3/4] Installing Mobile App Dependencies..."
cd app || exit
npm install
cd ..
echo "Mobile App installation complete!"
echo ""

echo "[4/4] Installing Machine Learning (Python) Dependencies..."
cd ml || exit
pip install torch torchvision torchaudio opencv-python mediapipe onnx onnxruntime Pillow requests inference_sdk
cd ..
echo "Machine Learning dependencies installed!"
echo ""

echo "========================================================"
echo "Installation Process Complete!"
echo "Make sure to set up your .env files in each directory."
echo "========================================================"
