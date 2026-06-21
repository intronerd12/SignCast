const express = require("express");

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

router.post("/interpret", (req, res) => {
  const hint = normalizeHint(req.body?.hint);
  const match = knownSigns[hint] || knownSigns.hello;

  return res.json({
    ...match,
    source: "prototype-rule-engine",
    receivedLandmarks: Array.isArray(req.body?.landmarks) ? req.body.landmarks.length : 0,
    timestamp: new Date().toISOString(),
  });
});

router.get("/library", (req, res) => {
  return res.json(Object.values(knownSigns));
});

module.exports = router;
