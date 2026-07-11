import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import User from "../models/User.js";
import { requireAuth, signToken } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: "Too many attempts. Try again in 15 minutes." },
});

const signupSchema = z.object({
  name: z.string().min(2, "Name needs at least 2 characters."),
  email: z.string().email("Enter a valid email."),
  password: z.string().min(8, "Password needs at least 8 characters."),
  role: z.enum(["student", "faculty"]).default("student"), // admins are seeded, never self-registered
  department: z.string().min(1).default("General"),
  interests: z.array(z.string()).default([]),
});

router.post("/signup", authLimiter, validate(signupSchema), async (req, res, next) => {
  try {
    const existing = await User.findOne({ email: req.body.email });
    if (existing) return res.status(409).json({ error: "An account with that email already exists." });
    const user = await User.create(req.body);
    res.status(201).json({ token: signToken(user), user: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
});

const loginSchema = z.object({
  email: z.string().email("Enter a valid email."),
  password: z.string().min(1, "Enter your password."),
});

router.post("/login", authLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email }).select("+password");
    if (!user || !(await user.comparePassword(req.body.password))) {
      return res.status(401).json({ error: "Email or password is incorrect." });
    }
    res.json({ token: signToken(user), user: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
});

router.get("/me", requireAuth, async (req, res) => {
  const populated = await req.user.populate("clubs", "name category");
  res.json({ user: populated.toSafeJSON() });
});

export default router;
