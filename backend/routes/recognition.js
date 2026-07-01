const express = require("express");
const { createSupabaseAdminClient } = require("../utils/supabaseClient");

const router = express.Router();

const knownSigns = {
  hello: {
    phrase: "Hello",
    confidence: 94,
    gloss: "HELLO",
  },
  "thank you": {
    phrase: "Thank you",
    confidence: 91,
    gloss: "THANK-YOU",
  },
  please: {
    phrase: "Please",
    confidence: 87,
    gloss: "PLEASE",
  },
  yes: {
    phrase: "Yes",
    confidence: 89,
    gloss: "YES",
  },
};

const normalizeHint = (value) => (value || "").toString().trim().toLowerCase();
const normalizeLimit = (value, fallback = 20, max = 100) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
};
const parsePositiveInt = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
};
const sanitizeText = (value, maxLength = 120) =>
  (value || "").toString().trim().replace(/\s+/g, " ").slice(0, maxLength);
const toGloss = (value) => sanitizeText(value).toUpperCase().replace(/\s+/g, "-");
const capitalizeLabel = (value) => {
  const text = sanitizeText(value);
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
};
// quality_score is stored as 0.00–1.00; confidence is 1–100
const qualityScoreToConfidence = (score, fallback = 80) => {
  const parsed = Number(score);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed <= 1) return Math.max(1, Math.min(100, Math.round(parsed * 100)));
  return Math.max(1, Math.min(100, Math.round(parsed)));
};
const confidenceToQualityScore = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const pct = Math.max(1, Math.min(100, Math.round(parsed)));
  return parseFloat((pct / 100).toFixed(2));
};
const isMissingSignTableError = (message = "") => {
  const normalized = message.toLowerCase();
  return normalized.includes("fsl_sign_samples")
    && (normalized.includes("does not exist") || normalized.includes("could not find"));
};
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const normalizeUserId = (value) => {
  const candidate = (value || "").toString().trim();
  if (!candidate) return null;
  return UUID_REGEX.test(candidate) ? candidate : null;
};

const getKnownMatch = (hint) => {
  if (!hint) return null;
  const entry = knownSigns[hint];
  if (!entry) return null;
  return {
    ...entry,
    source: "prototype-rule-engine",
  };
};

const getDefaultMatch = () => ({
  ...knownSigns.hello,
  source: "prototype-rule-engine",
});

const findLearnedMatch = async (hint) => {
  if (!hint) return null;

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("fsl_sign_samples")
      .select("label,quality_score,notes,is_verified,created_at")
      .eq("label", hint)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      if (isMissingSignTableError(error.message)) {
        return null;
      }
      throw new Error(error.message);
    }

    const sample = Array.isArray(data) && data.length > 0 ? data[0] : null;
    if (!sample) return null;

    return {
      phrase: capitalizeLabel(sample.label),
      confidence: qualityScoreToConfidence(sample.quality_score, 82),
      gloss: toGloss(sample.label),
      source: "learned-dataset",
    };
  } catch (error) {
    console.warn(`Learned sign lookup failed: ${error.message}`);
    return null;
  }
};

const logInterpretationEvent = async ({ userId, hint, match, receivedLandmarks, matchedExact }) => {
  const supabase = createSupabaseAdminClient();
  const payload = {
    hint,
    phrase: match.phrase,
    confidence: match.confidence,
    gloss: match.gloss,
    matchedExact,
    receivedLandmarks,
    source: match.source || "prototype-rule-engine",
  };

  const insertEvent = async (candidateUserId) =>
    supabase.from("app_events").insert({
      user_id: candidateUserId,
      category: "recognition",
      action: "interpret",
      payload,
    });

  let { error } = await insertEvent(userId);

  if (error && error.message && error.message.includes("app_events_user_id_fkey")) {
    ({ error } = await insertEvent(null));
  }

  if (error) {
    throw new Error(`Failed to store recognition event: ${error.message}`);
  }

  return true;
};

router.post("/teach", async (req, res) => {
  const label = normalizeHint(req.body?.label || req.body?.phrase);
  const category = sanitizeText(req.body?.category, 40) || null;
  const notes = sanitizeText(req.body?.notes, 500) || null;
  const videoUrl = sanitizeText(req.body?.videoUrl, 300) || null;
  const thumbnailUrl = sanitizeText(req.body?.thumbnailUrl, 300) || null;
  const source = sanitizeText(req.body?.source, 80) || "user";
  const device = sanitizeText(req.body?.device, 40) || null;
  const recordedBy = normalizeUserId(req.body?.userId);
  const qualityScore = confidenceToQualityScore(req.body?.confidence);
  const durationMs = parsePositiveInt(req.body?.durationMs);
  const frameCount = parsePositiveInt(req.body?.frameCount);
  const landmarks = Array.isArray(req.body?.landmarks) ? req.body.landmarks : null;

  if (!label) {
    return res.status(400).json({
      success: false,
      message: "label is required",
    });
  }

  if (Array.isArray(landmarks) && landmarks.length > 1000) {
    return res.status(400).json({
      success: false,
      message: "landmarks array is too large for a single sample",
    });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("fsl_sign_samples")
      .insert({
        recorded_by: recordedBy,
        label,
        category,
        source,
        device,
        notes,
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl,
        duration_ms: durationMs,
        frame_count: frameCount,
        landmarks: landmarks && landmarks.length > 0 ? landmarks : null,
        quality_score: qualityScore,
      })
      .select("id,recorded_by,label,category,source,device,notes,video_url,thumbnail_url,duration_ms,frame_count,quality_score,is_verified,created_at")
      .single();

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
        hint: isMissingSignTableError(error.message)
          ? "Run backend/supabase/init.sql in Supabase SQL Editor to create fsl_sign_samples."
          : undefined,
      });
    }

    const phrase = data ? capitalizeLabel(data.label) : null;
    const gloss = data ? toGloss(data.label) : null;

    return res.status(201).json({
      success: true,
      sample: data ? { ...data, phrase, gloss } : data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Unable to store taught sign sample",
    });
  }
});

router.get("/teach", async (req, res) => {
  const label = normalizeHint(req.query.label);
  const limit = normalizeLimit(req.query.limit, 20, 200);
  const onlyVerified = req.query.verified === "true";

  try {
    const supabase = createSupabaseAdminClient();
    let query = supabase
      .from("fsl_sign_samples")
      .select("id,recorded_by,label,category,source,device,notes,video_url,thumbnail_url,duration_ms,frame_count,quality_score,is_verified,created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (onlyVerified) {
      query = query.eq("is_verified", true);
    }

    if (label) {
      query = query.eq("label", label);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
        hint: isMissingSignTableError(error.message)
          ? "Run backend/supabase/init.sql in Supabase SQL Editor to create fsl_sign_samples."
          : undefined,
      });
    }

    const samples = (data || []).map((sample) => ({
      ...sample,
      phrase: capitalizeLabel(sample.label),
      gloss: toGloss(sample.label),
    }));

    return res.status(200).json({
      success: true,
      count: samples.length,
      samples,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Unable to load taught sign samples",
    });
  }
});

router.get("/teach/stats", async (req, res) => {
  const limit = normalizeLimit(req.query.limit, 500, 2000);

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("fsl_sign_samples")
      .select("label,is_verified,created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
        hint: isMissingSignTableError(error.message)
          ? "Run backend/supabase/init.sql in Supabase SQL Editor to create fsl_sign_samples."
          : undefined,
      });
    }

    const byLabelMap = new Map();
    let verifiedCount = 0;

    for (const sample of data || []) {
      const key = normalizeHint(sample.label);
      if (!key) continue;

      if (sample.is_verified) verifiedCount += 1;

      const current = byLabelMap.get(key) || {
        label: key,
        phrase: capitalizeLabel(key),
        total: 0,
        verified: 0,
      };

      current.total += 1;
      if (sample.is_verified) current.verified += 1;
      byLabelMap.set(key, current);
    }

    const byLabel = Array.from(byLabelMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 50);

    return res.status(200).json({
      success: true,
      totalSamples: (data || []).length,
      verifiedSamples: verifiedCount,
      uniqueLabels: byLabel.length,
      byLabel,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Unable to load training statistics",
    });
  }
});

router.post("/interpret", async (req, res) => {
  const hint = normalizeHint(req.body?.hint);
  const knownMatch = getKnownMatch(hint);
  const learnedMatch = knownMatch ? null : await findLearnedMatch(hint);
  const match = knownMatch || learnedMatch || getDefaultMatch();
  const receivedLandmarks = Array.isArray(req.body?.landmarks) ? req.body.landmarks.length : 0;
  const matchedExact = Boolean(knownMatch || learnedMatch);
  const userId = normalizeUserId(req.body?.userId);

  try {
    await logInterpretationEvent({
      userId,
      hint,
      match,
      receivedLandmarks,
      matchedExact,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }

  return res.json({
    ...match,
    source: match.source || "prototype-rule-engine",
    receivedLandmarks,
    eventStored: true,
    timestamp: new Date().toISOString(),
  });
});

router.get("/library", async (req, res) => {
  const staticLibrary = Object.values(knownSigns).map((item) => ({
    ...item,
    source: "prototype-rule-engine",
  }));

  const limit = normalizeLimit(req.query.limit, 40, 200);

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("fsl_sign_samples")
      .select("label,quality_score,is_verified,category,created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      if (isMissingSignTableError(error.message)) {
        return res.json(staticLibrary);
      }

      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    const seen = new Set(staticLibrary.map((item) => normalizeHint(item.phrase)));
    const learnedLibrary = [];

    for (const sample of data || []) {
      const key = normalizeHint(sample.label);
      if (!key || seen.has(key)) continue;

      seen.add(key);
      learnedLibrary.push({
        phrase: capitalizeLabel(sample.label),
        confidence: qualityScoreToConfidence(sample.quality_score, 82),
        gloss: toGloss(sample.label),
        category: sample.category || null,
        source: "learned-dataset",
      });
    }

    return res.json([...staticLibrary, ...learnedLibrary]);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Unable to load recognition library",
    });
  }
});

router.get("/model-urls", async (req, res) => {
  const modelFiles = ["landmark_model.onnx", "landmark_labels.json", "hand_landmarker.task"];
  const bucketName = "signcast-models";

  try {
    const supabase = createSupabaseAdminClient();

    const urls = {};
    for (const fileName of modelFiles) {
      const { data } = supabase.storage.from(bucketName).getPublicUrl(fileName);
      const key = fileName.replace(/[.-]/g, "_").replace(/_\w+$/, "");
      urls[fileName] = data?.publicUrl || null;
    }

    return res.json({
      success: true,
      bucket: bucketName,
      files: urls,
    });
  } catch (error) {
    // Supabase Storage not configured — frontend will use local fallback
    return res.json({
      success: false,
      message: error.message || "Storage not available",
      files: {},
    });
  }
});

module.exports = router;
