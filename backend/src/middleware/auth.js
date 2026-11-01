import jwt from "jsonwebtoken";
import User from "../models/User.js";

export function sessionTokenFromCookie(cookieHeader = "") {
  const entry = cookieHeader.split(";").map(part => part.trim()).find(part => part.startsWith("taskflow_session="));
  if (!entry) return null;
  try { return decodeURIComponent(entry.slice("taskflow_session=".length)); }
  catch { return null; }
}

export default async function auth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = sessionTokenFromCookie(req.headers.cookie) || (header.startsWith("Bearer ") ? header.slice(7) : null);
    if (!token) return res.status(401).json({ message: "Please login to continue." });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id).select("-password");
    if (!user) return res.status(401).json({ message: "User not found." });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired session. Please login again." });
  }
}
