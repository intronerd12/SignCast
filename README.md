# SignCast

SignCast is a sign language recognition and learning platform. This repository contains the frontend web application, backend API, and machine learning components.

## System Dependencies

Before you begin, ensure you have the following installed on your system:

- **Node.js**: (v18.0.0 or higher recommended) - required for running both the frontend and backend.
- **npm** (Node Package Manager) - comes with Node.js.
- **Python**: (v3.8 or higher) - required for running the machine learning (ML) scripts.
- **pip** (Python Package Installer).
- **Git**: For cloning the repository.

## Installation Process

Follow these steps to set up the project locally.

### 1. Clone the Repository

```bash
git clone <repository-url>
cd SignCast
```

### 2. Frontend Setup

The frontend is built with React and Vite.

```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend` directory based on the provided `.env.example` file and fill in the necessary API keys (Firebase, etc.).

### 3. Backend Setup

The backend is built with Express (Node.js) and integrates with Supabase.

```bash
cd ../backend
npm install
```

Create a `.env` file in the `backend` directory based on the provided `.env.example` file and fill in the necessary environment variables (Supabase URL/Key, Cloudinary credentials, Database connection strings, etc.).

### 4. Machine Learning Setup

The machine learning component uses PyTorch, MediaPipe, and OpenCV.

```bash
cd ../ml
```

Install the required Python dependencies. You can do this globally or preferably within a virtual environment.

```bash
# Optional: Create and activate a virtual environment
# python -m venv venv
# source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install torch torchvision torchaudio opencv-python mediapipe onnx onnxruntime Pillow requests inference_sdk
```

### 5. Mobile App Setup (Optional)

The mobile application is built with React Native and Expo.

```bash
cd ../app
npm install
```

Create a `.env` file in the `app` directory if necessary based on the provided examples.

## Automated Installation (Windows)

For Windows users, an automated installation script is provided in the root directory. You can double-click `install.bat` or run it from the terminal to automatically install the dependencies for all the subprojects (frontend, backend, app, and ml).

```bash
.\install.bat
```

## Running the Application

### Start the Backend Server

```bash
cd backend
npm run dev
```
Alternatively, you can run the backend from the root directory using:
```bash
npm run dev
```

### Start the Frontend Server

In a new terminal window:

```bash
cd frontend
npm run dev
```

The frontend should now be running at `http://localhost:5173` (or the port specified by Vite), and the backend at its configured port.

### Start the Mobile App

In a new terminal window:

```bash
cd app
npm run dev
```

You can use the Expo Go app on your phone or an emulator to test the mobile application.
