import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { computeEngagement, recommendForUser } from "../services/recommender.js";

const router = Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const recs = await recommendForUser(req.user);
    res.json({
      recommendations: recs.map((r) => ({
        event: r.event,
        score: +r.score.toFixed(1),
        reasons: r.reasons,
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.get("/engagement", requireAuth, async (req, res, next) => {
  try {
    const score = await computeEngagement(req.user._id);
    res.json({ engagementScore: score });
  } catch (err) {
    next(err);
  }
});

export default router;
