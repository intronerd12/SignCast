const express = require("express");
const { createSupabaseAdminClient } = require("../utils/supabaseClient");
const router = express.Router();

// GET /api/v1/scores/:userId
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from("fsl_scores")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      if (error.code === '42P01') {
        // Table doesn't exist yet, return empty
        return res.json({ highest_score: 0, scores: [] });
      }
      return res.status(400).json({ success: false, message: error.message });
    }

    const highestScore = data && data.length > 0 ? Math.max(...data.map(d => d.score)) : 0;
    return res.json({ highest_score: highestScore, scores: data || [] });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/scores
router.post("/", async (req, res) => {
  try {
    const { user_id, score, test_type } = req.body;

    if (!user_id || score === undefined) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("fsl_scores")
      .insert([
        {
          user_id,
          score,
          test_type: test_type || "alphabet",
          created_at: new Date().toISOString()
        }
      ]);

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(201).json({ success: true, message: "Score saved" });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
