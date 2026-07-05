const express = require("express");
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
      recentEvents: [],
      samplesByCategory: [],
    };

    // 1. Total scores count + breakdown by type
    const { data: scoresData, error: scoresErr } = await supabase
      .from("fsl_scores")
      .select("id, score, test_type, created_at, user_id");

    if (!scoresErr && scoresData) {
      stats.totalScores = scoresData.length;

      // Scores by test type
      const typeMap = {};
      scoresData.forEach((s) => {
        const t = s.test_type || "alphabet";
        typeMap[t] = (typeMap[t] || 0) + 1;
      });
      stats.scoresByType = Object.entries(typeMap).map(([type, count]) => ({ type, count }));

      // Daily score averages (last 30 days, grouped by day)
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
        .slice(-12); // Last 12 data points for the chart

      // Top scorers (aggregate by user_id, take top 5)
      const userScoreMap = {};
      scoresData.forEach((s) => {
        if (!s.user_id) return;
        if (!userScoreMap[s.user_id] || s.score > userScoreMap[s.user_id].score) {
          userScoreMap[s.user_id] = { user_id: s.user_id, score: s.score, test_type: s.test_type };
        }
      });
      const topScorerIds = Object.values(userScoreMap)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      // Resolve user emails for top scorers
      for (const scorer of topScorerIds) {
        try {
          const { data: userData } = await supabase.auth.admin.getUserById(scorer.user_id);
          scorer.email = userData?.user?.email || "Unknown";
          scorer.name = userData?.user?.user_metadata?.name || "";
        } catch {
          scorer.email = "Unknown";
          scorer.name = "";
        }
      }
      stats.topScorers = topScorerIds;
    }

    // 2. FSL sign samples stats
    const { data: samplesData, error: samplesErr } = await supabase
      .from("fsl_sign_samples")
      .select("id, label, category, is_verified");

    if (!samplesErr && samplesData) {
      stats.totalSamples = samplesData.length;
      stats.verifiedSamples = samplesData.filter((s) => s.is_verified).length;

      // Unique labels
      const labelSet = new Set(samplesData.map((s) => s.label));
      stats.uniqueLabels = labelSet.size;

      // Samples by category
      const catMap = {};
      samplesData.forEach((s) => {
        const cat = s.category || "uncategorized";
        if (!catMap[cat]) catMap[cat] = { labels: new Set(), count: 0 };
        catMap[cat].labels.add(s.label);
        catMap[cat].count += 1;
      });
      stats.samplesByCategory = Object.entries(catMap).map(([category, { labels, count }]) => ({
        category,
        count,
        uniqueLabels: labels.size,
        labels: Array.from(labels).slice(0, 10), // First 10 labels per category
      }));
    }

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
        recentEvents: [],
        samplesByCategory: [],
      });
    }
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
