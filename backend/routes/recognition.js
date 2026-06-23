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
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const normalizeUserId = (value) => {
  const candidate = (value || "").toString().trim();
  if (!candidate) return null;
  return UUID_REGEX.test(candidate) ? candidate : null;
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
    source: "prototype-rule-engine",
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

router.post("/interpret", async (req, res) => {
  const hint = normalizeHint(req.body?.hint);
  const match = knownSigns[hint] || knownSigns.hello;
  const receivedLandmarks = Array.isArray(req.body?.landmarks) ? req.body.landmarks.length : 0;
  const matchedExact = Boolean(knownSigns[hint]);
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
    source: "prototype-rule-engine",
    receivedLandmarks,
    eventStored: true,
    timestamp: new Date().toISOString(),
  });
});

router.get("/library", (req, res) => {
  return res.json(Object.values(knownSigns));
});

module.exports = router;
