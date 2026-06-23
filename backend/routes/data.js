const express = require("express");
const { createSupabaseAdminClient } = require("../utils/supabaseClient");

const router = express.Router();

const normalizeLimit = (value, fallback = 20) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, 100);
};

router.post("/events", async (req, res) => {
  try {
    const { userId = null, category, action, payload = {} } = req.body || {};

    if (!category || !action) {
      return res.status(400).json({
        success: false,
        message: "category and action are required",
      });
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("app_events")
      .insert({
        user_id: userId,
        category,
        action,
        payload,
      })
      .select("id,user_id,category,action,payload,created_at")
      .single();

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
        hint: "If relation does not exist, run backend/supabase/init.sql in Supabase SQL Editor.",
      });
    }

    return res.status(201).json({ success: true, event: data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Unable to store event" });
  }
});

router.get("/events", async (req, res) => {
  try {
    const limit = normalizeLimit(req.query.limit, 20);
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("app_events")
      .select("id,user_id,category,action,payload,created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
        hint: "If relation does not exist, run backend/supabase/init.sql in Supabase SQL Editor.",
      });
    }

    return res.status(200).json({ success: true, events: data || [] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || "Unable to list events" });
  }
});

module.exports = router;