import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { rateLimit } from "express-rate-limit";
import User from "../models/User.js";
import auth from "../middleware/auth.js";

const router = Router();
const makeToken = id => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
const sessionCookie = "taskflow_session";
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000
};
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts. Please try again in 15 minutes." }
});

function signIn(res, user, status = 200) {
  res.cookie(sessionCookie, makeToken(user.id), cookieOptions);
  res.status(status).json({ user: { id: user.id, name: user.name, email: user.email } });
}

router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (typeof name !== "string" || !name.trim() || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || typeof password !== "string" || password.length < 12 || password.length > 128)
      return res.status(400).json({ message: "Enter your name, a valid email, and a password between 12 and 128 characters." });
    const normalizedEmail = email.trim().toLowerCase();
    if (await User.findOne({ email: normalizedEmail }))
      return res.status(409).json({ message: "An account with this email already exists." });
    const user = await User.create({ name: name.trim(), email: normalizedEmail, password: await bcrypt.hash(password, 12) });
    signIn(res, user, 201);
  } catch (e) { next(e); }
});

router.post("/login", loginLimiter, async (req, res, next) => {
  try {
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ message: "Incorrect email or password." });
    signIn(res, user);
  } catch (e) { next(e); }
});

router.get("/me", auth, (req, res) => res.json({ user: req.user }));
router.post("/logout", (_req, res) => {
  res.clearCookie(sessionCookie, { ...cookieOptions, maxAge: undefined });
  res.json({ message: "Signed out." });
});
export default router;
