/**
 * signRecognizer.js — In-browser hand sign recognition engine.
 *
 * Uses MediaPipe HandLandmarker for hand detection and ONNX Runtime
 * for classification with the trained landmark MLP model.
 *
 * Files are fetched from Supabase Storage (with local fallback).
 */
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import * as ort from "onnxruntime-web";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";

// Local fallback paths (in frontend/public/models/)
const LOCAL_MODEL_PATH = "/models/landmark_model.onnx";
const LOCAL_LABELS_PATH = "/models/landmark_labels.json";
const LOCAL_HAND_LANDMARKER_PATH = "/models/hand_landmarker.task";

let handLandmarker = null;
let onnxSession = null;
let labelMap = null; // { index: label }
let isInitialized = false;
let isInitializing = false;

/**
 * Resolve model file URLs.
 * Tries the backend /recognition/model-urls endpoint first (Supabase Storage),
 * then falls back to local public/models/ files.
 */
async function resolveModelUrls() {
  try {
    const response = await fetch(`${API_BASE}/recognition/model-urls`);
    const data = await response.json();

    if (data.success && data.files) {
      return {
        onnx: data.files["landmark_model.onnx"] || LOCAL_MODEL_PATH,
        labels: data.files["landmark_labels.json"] || LOCAL_LABELS_PATH,
        handLandmarker: data.files["hand_landmarker.task"] || LOCAL_HAND_LANDMARKER_PATH,
      };
    }
  } catch {
    // Backend unavailable — use local fallback
  }

  return {
    onnx: LOCAL_MODEL_PATH,
    labels: LOCAL_LABELS_PATH,
    handLandmarker: LOCAL_HAND_LANDMARKER_PATH,
  };
}

/**
 * Initialize the recognition pipeline.
 * Loads MediaPipe HandLandmarker + ONNX model + label map.
 *
 * @param {function} onProgress - Optional callback: (stage: string) => void
 * @returns {Promise<boolean>} true if init succeeded
 */
export async function init(onProgress) {
  if (isInitialized) return true;
  if (isInitializing) return false;

  isInitializing = true;

  try {
    onProgress?.("Resolving model URLs...");
    const urls = await resolveModelUrls();

    // 1. Load MediaPipe HandLandmarker
    onProgress?.("Loading hand detection model...");
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: urls.handLandmarker,
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numHands: 1,
    });

    // 2. Load labels
    onProgress?.("Loading sign labels...");
    const labelsResponse = await fetch(urls.labels);
    const labelsData = await labelsResponse.json();

    // labelsData is { "a": 0, "b": 1, ... } — invert to { 0: "a", 1: "b", ... }
    labelMap = {};
    for (const [label, index] of Object.entries(labelsData)) {
      labelMap[index] = label;
    }

    // 3. Load ONNX model
    onProgress?.("Loading recognition model...");

    // Configure ONNX Runtime to use the correct WASM path
    ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@latest/dist/";

    onnxSession = await ort.InferenceSession.create(urls.onnx, {
      executionProviders: ["wasm"],
    });

    isInitialized = true;
    isInitializing = false;
    onProgress?.("Ready");
    return true;
  } catch (error) {
    console.error("signRecognizer init failed:", error);
    isInitializing = false;
    onProgress?.(`Error: ${error.message}`);
    return false;
  }
}

/**
 * Process a single video frame for hand sign recognition.
 *
 * @param {HTMLVideoElement} videoElement - The webcam video element
 * @param {number} timestampMs - Current timestamp in ms (performance.now())
 * @returns {{ label: string, confidence: number, landmarks: Array } | null}
 */
export function processFrame(videoElement, timestampMs) {
  if (!isInitialized || !handLandmarker || !onnxSession || !labelMap) {
    return null;
  }

  // 1. Detect hand landmarks with MediaPipe
  const result = handLandmarker.detectForVideo(videoElement, timestampMs);

  if (!result.landmarks || result.landmarks.length === 0) {
    return null;
  }

  const landmarks = result.landmarks[0]; // First hand

  // 2. Extract wrist-relative features (same math as capture_dataset.py)
  const wrist = landmarks[0];
  const features = [];
  for (const lm of landmarks) {
    features.push(lm.x - wrist.x, lm.y - wrist.y, lm.z - wrist.z);
  }

  // 3. Run ONNX inference
  try {
    const inputTensor = new ort.Tensor("float32", new Float32Array(features), [1, features.length]);
    const feeds = {};
    feeds[onnxSession.inputNames[0]] = inputTensor;

    // Use synchronous run if available, else we'll need to handle async
    // Note: onnxruntime-web run() is async, so we queue and return last result
    // For real-time, we use a cached approach
    runInferenceAsync(feeds, landmarks);

    // Return the last cached result
    return lastResult;
  } catch (error) {
    console.warn("Inference error:", error);
    return null;
  }
}

// Async inference with result caching for real-time performance
let lastResult = null;
let inferenceRunning = false;

async function runInferenceAsync(feeds, landmarks) {
  if (inferenceRunning) return; // Skip if previous inference still running
  inferenceRunning = true;

  try {
    const output = await onnxSession.run(feeds);
    const scores = output[onnxSession.outputNames[0]].data;

    // Softmax to get probabilities
    const maxScore = Math.max(...scores);
    const expScores = Array.from(scores).map((s) => Math.exp(s - maxScore));
    const sumExp = expScores.reduce((a, b) => a + b, 0);
    const probabilities = expScores.map((s) => s / sumExp);

    // Find best prediction
    let bestIdx = 0;
    let bestProb = 0;
    for (let i = 0; i < probabilities.length; i++) {
      if (probabilities[i] > bestProb) {
        bestProb = probabilities[i];
        bestIdx = i;
      }
    }

    lastResult = {
      label: labelMap[bestIdx] || `unknown_${bestIdx}`,
      confidence: Math.round(bestProb * 100),
      landmarks,
    };
  } catch (error) {
    console.warn("Async inference error:", error);
  } finally {
    inferenceRunning = false;
  }
}

/**
 * Process a frame and return the result asynchronously.
 * Prefer this over processFrame() when you can await the result.
 *
 * @param {HTMLVideoElement} videoElement
 * @param {number} timestampMs
 * @returns {Promise<{ label: string, confidence: number, landmarks: Array } | null>}
 */
export async function processFrameAsync(videoElement, timestampMs) {
  if (!isInitialized || !handLandmarker || !onnxSession || !labelMap) {
    return null;
  }

  // 1. Detect hand landmarks
  const result = handLandmarker.detectForVideo(videoElement, timestampMs);

  if (!result.landmarks || result.landmarks.length === 0) {
    return null;
  }

  const landmarks = result.landmarks[0];

  // 2. Extract wrist-relative features
  const wrist = landmarks[0];
  const features = [];
  for (const lm of landmarks) {
    features.push(lm.x - wrist.x, lm.y - wrist.y, lm.z - wrist.z);
  }

  // 3. Run ONNX inference
  try {
    const inputTensor = new ort.Tensor("float32", new Float32Array(features), [1, features.length]);
    const feeds = {};
    feeds[onnxSession.inputNames[0]] = inputTensor;

    const output = await onnxSession.run(feeds);
    const scores = output[onnxSession.outputNames[0]].data;

    // Softmax
    const maxScore = Math.max(...scores);
    const expScores = Array.from(scores).map((s) => Math.exp(s - maxScore));
    const sumExp = expScores.reduce((a, b) => a + b, 0);
    const probabilities = expScores.map((s) => s / sumExp);

    let bestIdx = 0;
    let bestProb = 0;
    for (let i = 0; i < probabilities.length; i++) {
      if (probabilities[i] > bestProb) {
        bestProb = probabilities[i];
        bestIdx = i;
      }
    }

    const recognitionResult = {
      label: labelMap[bestIdx] || `unknown_${bestIdx}`,
      confidence: Math.round(bestProb * 100),
      landmarks,
    };

    // Update cached result too
    lastResult = recognitionResult;

    return recognitionResult;
  } catch (error) {
    console.warn("Inference error:", error);
    return null;
  }
}

/**
 * Get the number of known signs the model can recognize.
 */
export function getSignCount() {
  return labelMap ? Object.keys(labelMap).length : 0;
}

/**
 * Get all known sign labels.
 */
export function getSignLabels() {
  if (!labelMap) return [];
  return Object.values(labelMap).sort();
}

/**
 * Check if the recognizer is ready.
 */
export function isReady() {
  return isInitialized;
}

/**
 * Clean up all resources.
 */
export function dispose() {
  if (handLandmarker) {
    handLandmarker.close();
    handLandmarker = null;
  }
  if (onnxSession) {
    onnxSession.release();
    onnxSession = null;
  }
  labelMap = null;
  lastResult = null;
  isInitialized = false;
  isInitializing = false;
}
