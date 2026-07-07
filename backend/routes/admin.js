const express = require("express");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { createSupabaseAdminClient } = require("../utils/supabaseClient");
const router = express.Router();

// GET /api/v1/admin/stats
// Returns aggregated dashboard statistics for the admin panel
router.get("/stats", async (req, res) => {
  try {
    const supabase = createSupabaseAdminClient();
    const stats = {
      totalScores: 0,
      totalSamples: 0,
      verifiedSamples: 0,
      uniqueLabels: 0,
      scoresByType: [],
      dailyScores: [],
      topScorers: [],
      userTestPerformance: [],
      userModelContributions: [],
      recentEvents: [],
      samplesByCategory: [],
    };

    const userProfileMap = new Map();
    const userIds = new Set();

    // 1. Total scores count + score analytics
    const { data: scoresData, error: scoresErr } = await supabase
      .from("fsl_scores")
      .select("id, score, test_type, created_at, user_id");

    if (!scoresErr && scoresData) {
      stats.totalScores = scoresData.length;

      const typeMap = {};
      const userScoreMap = {};
      scoresData.forEach((s) => {
        const t = s.test_type || "alphabet";
        typeMap[t] = (typeMap[t] || 0) + 1;

        if (!s.user_id) return;
        userIds.add(s.user_id);
        if (!userScoreMap[s.user_id]) {
          userScoreMap[s.user_id] = {
            user_id: s.user_id,
            attempts: 0,
            totalScore: 0,
            highestScore: Number.NEGATIVE_INFINITY,
            highestScoreType: "n/a",
            lastTestAt: null,
            testTypes: new Set(),
          };
        }

        const entry = userScoreMap[s.user_id];
        const scoreValue = Number(s.score || 0);
        entry.attempts += 1;
        entry.totalScore += scoreValue;
        entry.testTypes.add(t);

        if (scoreValue > entry.highestScore) {
          entry.highestScore = scoreValue;
          entry.highestScoreType = t;
        }

        if (!entry.lastTestAt || new Date(s.created_at) > new Date(entry.lastTestAt)) {
          entry.lastTestAt = s.created_at;
        }
      });
      stats.scoresByType = Object.entries(typeMap).map(([type, count]) => ({ type, count }));

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentScores = scoresData.filter(
        (s) => new Date(s.created_at) >= thirtyDaysAgo
      );

      const dayMap = {};
      recentScores.forEach((s) => {
        const day = new Date(s.created_at).toISOString().split("T")[0];
        if (!dayMap[day]) dayMap[day] = { total: 0, count: 0 };
        dayMap[day].total += s.score;
        dayMap[day].count += 1;
      });

      stats.dailyScores = Object.entries(dayMap)
        .map(([date, { total, count }]) => ({
          date,
          avg: Math.round(total / count),
          count,
        }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-12);

      stats.userTestPerformance = Object.values(userScoreMap)
        .map((entry) => ({
          user_id: entry.user_id,
          attempts: entry.attempts,
          averageScore: Math.round(entry.totalScore / Math.max(1, entry.attempts)),
          highestScore: entry.highestScore === Number.NEGATIVE_INFINITY ? 0 : entry.highestScore,
          highestScoreType: entry.highestScoreType,
          lastTestAt: entry.lastTestAt,
          testTypes: Array.from(entry.testTypes),
        }))
        .sort((a, b) => {
          if (b.highestScore !== a.highestScore) return b.highestScore - a.highestScore;
          if (b.averageScore !== a.averageScore) return b.averageScore - a.averageScore;
          return b.attempts - a.attempts;
        });
    }

    // 2. FSL sign samples stats
    const { data: samplesData, error: samplesErr } = await supabase
      .from("fsl_sign_samples")
      .select("id, label, category, is_verified, created_at, recorded_by");

    if (!samplesErr && samplesData) {
      stats.totalSamples = samplesData.length;
      stats.verifiedSamples = samplesData.filter((s) => s.is_verified).length;

      const labelSet = new Set(samplesData.map((s) => s.label));
      stats.uniqueLabels = labelSet.size;

      const catMap = {};
      const modelContributionMap = {};
      samplesData.forEach((s) => {
        const cat = s.category || "uncategorized";
        if (!catMap[cat]) catMap[cat] = { labels: new Set(), count: 0 };
        catMap[cat].labels.add(s.label);
        catMap[cat].count += 1;

        if (!s.recorded_by) return;
        userIds.add(s.recorded_by);
        if (!modelContributionMap[s.recorded_by]) {
          modelContributionMap[s.recorded_by] = {
            user_id: s.recorded_by,
            totalSamples: 0,
            verifiedSamples: 0,
            labels: new Set(),
            lastSampleAt: null,
          };
        }

        const entry = modelContributionMap[s.recorded_by];
        entry.totalSamples += 1;
        if (s.is_verified) entry.verifiedSamples += 1;
        if (s.label) entry.labels.add(s.label);
        if (!entry.lastSampleAt || new Date(s.created_at) > new Date(entry.lastSampleAt)) {
          entry.lastSampleAt = s.created_at;
        }
      });
      stats.samplesByCategory = Object.entries(catMap).map(([category, { labels, count }]) => ({
        category,
        count,
        uniqueLabels: labels.size,
        labels: Array.from(labels).slice(0, 10),
      }));

      stats.userModelContributions = Object.values(modelContributionMap)
        .map((entry) => ({
          user_id: entry.user_id,
          totalSamples: entry.totalSamples,
          verifiedSamples: entry.verifiedSamples,
          unverifiedSamples: entry.totalSamples - entry.verifiedSamples,
          uniqueLabels: entry.labels.size,
          lastSampleAt: entry.lastSampleAt,
        }))
        .sort((a, b) => {
          if (b.verifiedSamples !== a.verifiedSamples) return b.verifiedSamples - a.verifiedSamples;
          if (b.totalSamples !== a.totalSamples) return b.totalSamples - a.totalSamples;
          return b.uniqueLabels - a.uniqueLabels;
        });
    }

    // Resolve names/emails for users appearing in report records.
    const profileIds = Array.from(userIds);
    if (profileIds.length > 0) {
      const { data: profilesData, error: profilesErr } = await supabase
        .from("user_profiles")
        .select("id, full_name, email")
        .in("id", profileIds);

      if (!profilesErr && profilesData) {
        profilesData.forEach((profile) => {
          userProfileMap.set(profile.id, {
            name: profile.full_name || "",
            email: profile.email || "",
          });
        });
      }
    }

    stats.userTestPerformance = stats.userTestPerformance.map((entry) => {
      const profile = userProfileMap.get(entry.user_id);
      return {
        ...entry,
        name: profile?.name || "",
        email: profile?.email || "Unknown",
      };
    });

    stats.topScorers = stats.userTestPerformance.slice(0, 5).map((entry) => ({
      user_id: entry.user_id,
      name: entry.name,
      email: entry.email,
      score: entry.highestScore,
      test_type: entry.highestScoreType,
    }));

    stats.userModelContributions = stats.userModelContributions.map((entry) => {
      const profile = userProfileMap.get(entry.user_id);
      return {
        ...entry,
        name: profile?.name || "",
        email: profile?.email || "Unknown",
      };
    });

    // 3. Recent app events (last 20)
    const { data: eventsData, error: eventsErr } = await supabase
      .from("app_events")
      .select("id, user_id, category, action, payload, created_at")
      .order("created_at", { ascending: false })
      .limit(20);

    if (!eventsErr && eventsData) {
      stats.recentEvents = eventsData;
    }

    return res.json({ success: true, ...stats });
  } catch (error) {
    // If tables don't exist yet, return empty stats gracefully
    if (error.message && error.message.includes("42P01")) {
      return res.json({
        success: true,
        totalScores: 0,
        totalSamples: 0,
        verifiedSamples: 0,
        uniqueLabels: 0,
        scoresByType: [],
        dailyScores: [],
        topScorers: [],
        userTestPerformance: [],
        userModelContributions: [],
        recentEvents: [],
        samplesByCategory: [],
      });
    }
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/admin/pending
// Returns a list of all unverified images in ml/data/pending
router.get("/pending", async (req, res) => {
  try {
    const pendingDir = path.join(__dirname, "../../ml/data/pending");
    if (!fs.existsSync(pendingDir)) return res.json({ success: true, pending: [] });

    const labels = fs.readdirSync(pendingDir);
    let pendingSamples = [];

    for (const label of labels) {
      const labelDir = path.join(pendingDir, label);
      if (fs.statSync(labelDir).isDirectory()) {
        const files = fs.readdirSync(labelDir).filter(f => f.endsWith('.jpg'));
        for (const file of files) {
          const timestamp = file.split('_')[1].split('.')[0];
          // We don't read the image content here to save bandwidth, just the metadata
          pendingSamples.push({ label, filename: file, timestamp });
        }
      }
    }

    // Sort by newest first
    pendingSamples.sort((a, b) => b.timestamp - a.timestamp);

    return res.json({ success: true, pending: pendingSamples });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/admin/pending/image/:label/:filename
// Serve the pending image directly
router.get("/pending/image/:label/:filename", (req, res) => {
  const { label, filename } = req.params;
  const imagePath = path.join(__dirname, "../../ml/data/pending", label, filename);
  if (fs.existsSync(imagePath)) {
    return res.sendFile(imagePath);
  }
  return res.status(404).send("Image not found");
});

// POST /api/v1/admin/verify
router.post("/verify", async (req, res) => {
  try {
    const { label, filename, approved } = req.body;
    if (!label || !filename) return res.status(400).json({ success: false, message: "Missing label or filename" });

    const pendingDir = path.join(__dirname, "../../ml/data/pending", label);
    const jsonFilename = filename.replace('.jpg', '.json');
    
    const imagePath = path.join(pendingDir, filename);
    const jsonPath = path.join(pendingDir, jsonFilename);

    if (!fs.existsSync(imagePath) || !fs.existsSync(jsonPath)) {
      return res.status(404).json({ success: false, message: "Files not found in pending" });
    }

    if (approved) {
      const mlDataDir = path.join(__dirname, "../../ml/data");
      const datasetDir = path.join(mlDataDir, "dataset", label);
      const landmarkFile = path.join(mlDataDir, "landmark_dataset.json");

      if (!fs.existsSync(datasetDir)) fs.mkdirSync(datasetDir, { recursive: true });

      // Move Image
      const existingFiles = fs.readdirSync(datasetDir).filter(f => f.endsWith('.jpg'));
      const index = existingFiles.length;
      const newImageFilename = `${label}_${String(index).padStart(3, '0')}.jpg`;
      fs.renameSync(imagePath, path.join(datasetDir, newImageFilename));

      // Append Features
      const featureData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
      let allLandmarks = [];
      if (fs.existsSync(landmarkFile)) {
        try { allLandmarks = JSON.parse(fs.readFileSync(landmarkFile, "utf-8")); } catch (err) {}
      }
      allLandmarks.push({ label: featureData.label, features: featureData.features });
      fs.writeFileSync(landmarkFile, JSON.stringify(allLandmarks, null, 2));
    } else {
      // Reject: Just delete from pending
      fs.unlinkSync(imagePath);
    }
    
    // Always delete the pending JSON once processed (or if rejected)
    if (fs.existsSync(jsonPath)) fs.unlinkSync(jsonPath);

    return res.json({ success: true, message: approved ? "Approved and merged" : "Rejected and deleted" });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/admin/verify/bulk
router.post("/verify/bulk", async (req, res) => {
  try {
    const { label, approved } = req.body;
    if (!label) return res.status(400).json({ success: false, message: "Missing label" });

    const pendingDir = path.join(__dirname, "../../ml/data/pending", label);
    if (!fs.existsSync(pendingDir)) return res.status(404).json({ success: false, message: "Pending folder not found" });

    const files = fs.readdirSync(pendingDir).filter(f => f.endsWith('.jpg'));
    if (files.length === 0) return res.status(404).json({ success: false, message: "No images found for this label" });
    
    if (approved) {
      const mlDataDir = path.join(__dirname, "../../ml/data");
      const datasetDir = path.join(mlDataDir, "dataset", label);
      const landmarkFile = path.join(mlDataDir, "landmark_dataset.json");

      if (!fs.existsSync(datasetDir)) fs.mkdirSync(datasetDir, { recursive: true });

      let allLandmarks = [];
      if (fs.existsSync(landmarkFile)) {
        try { allLandmarks = JSON.parse(fs.readFileSync(landmarkFile, "utf-8")); } catch (err) {}
      }

      for (const filename of files) {
        const jsonFilename = filename.replace('.jpg', '.json');
        const imagePath = path.join(pendingDir, filename);
        const jsonPath = path.join(pendingDir, jsonFilename);

        if (!fs.existsSync(imagePath) || !fs.existsSync(jsonPath)) continue;

        // Move Image
        const existingFiles = fs.readdirSync(datasetDir).filter(f => f.endsWith('.jpg'));
        const newImageFilename = `${label}_${String(existingFiles.length).padStart(3, '0')}.jpg`;
        fs.renameSync(imagePath, path.join(datasetDir, newImageFilename));

        // Append Features
        const featureData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
        allLandmarks.push({ label: featureData.label, features: featureData.features });
        fs.unlinkSync(jsonPath);
      }
      fs.writeFileSync(landmarkFile, JSON.stringify(allLandmarks, null, 2));
    } else {
      // Reject: delete all
      for (const filename of files) {
        const jsonFilename = filename.replace('.jpg', '.json');
        const imagePath = path.join(pendingDir, filename);
        const jsonPath = path.join(pendingDir, jsonFilename);
        if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
        if (fs.existsSync(jsonPath)) fs.unlinkSync(jsonPath);
      }
    }

    // Clean up empty directory
    try { fs.rmdirSync(pendingDir); } catch(e) {}

    return res.json({ success: true, message: approved ? `Approved ${files.length} frames for '${label}'` : `Rejected ${files.length} frames for '${label}'` });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/admin/train
router.post("/train", async (req, res) => {
  try {
    const mlDir = path.join(__dirname, "../../ml");
    // 1. Train the PyTorch model
    exec("python train_landmark_model.py", { cwd: mlDir }, (error, stdout, stderr) => {
      if (error) {
        return res.status(500).json({ success: false, message: error.message, output: stdout + stderr });
      }

      // 2. Export the trained model to ONNX format
      exec("python export_onnx.py", { cwd: mlDir }, (onnxError, onnxStdout, onnxStderr) => {
        if (onnxError) {
          return res.status(500).json({ success: false, message: "ONNX Export failed: " + onnxError.message, output: stdout + "\n" + onnxStdout + onnxStderr });
        }

        // 3. Copy the exported ONNX model and labels to the frontend public folder
        try {
          const frontendModelsDir = path.join(__dirname, "../../frontend/public/models");
          if (!fs.existsSync(frontendModelsDir)) {
            fs.mkdirSync(frontendModelsDir, { recursive: true });
          }

          fs.copyFileSync(
            path.join(mlDir, "models/landmark_model.onnx"),
            path.join(frontendModelsDir, "landmark_model.onnx")
          );
          fs.copyFileSync(
            path.join(mlDir, "models/landmark_labels.json"),
            path.join(frontendModelsDir, "landmark_labels.json")
          );

          return res.json({ 
            success: true, 
            message: "Training and export complete. Models copied to frontend.", 
            output: stdout + "\n" + onnxStdout 
          });
        } catch (copyErr) {
          return res.status(500).json({ success: false, message: "Failed to copy models to frontend: " + copyErr.message, output: stdout + "\n" + onnxStdout });
        }
      });
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
