import "dotenv/config";
import http from "http";
import app from "./app.js";
import { Server } from "socket.io";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import User from "./models/User.js";
import Project from "./models/Project.js";
import { sessionTokenFromCookie } from "./middleware/auth.js";
import { corsOptions } from "./cors.js";

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || /^(replace|change|example)/i.test(process.env.JWT_SECRET)) {
  throw new Error("Set JWT_SECRET to a unique random value of at least 32 characters.");
}

const server = http.createServer(app);
const io = new Server(server, {
  cors: { ...corsOptions, methods: ["GET", "POST", "PATCH", "DELETE"] }
});
app.set("io", io);
io.use(async (socket, next) => {
  try {
    const token = sessionTokenFromCookie(socket.handshake.headers.cookie) || socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication required."));
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id).select("_id");
    if (!user) return next(new Error("Authentication required."));
    socket.data.userId = user.id;
    next();
  } catch {
    next(new Error("Invalid or expired session."));
  }
});
io.on("connection", socket => {
  socket.on("join-project", async (projectId, acknowledge) => {
    if (typeof projectId !== "string" || !mongoose.isValidObjectId(projectId)) {
      acknowledge?.(false);
      return;
    }
    try {
      const project = await Project.exists({
        _id: projectId,
        $or: [{ owner: socket.data.userId }, { members: socket.data.userId }]
      });
      if (project) socket.join(`project:${projectId}`);
      acknowledge?.(Boolean(project));
    } catch {
      acknowledge?.(false);
    }
  });
});

const port = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI)
  .then(() => server.listen(port, () => console.log(`TaskFlow API running on http://localhost:${port}`)))
  .catch(err => { console.error("MongoDB connection failed:", err.message); process.exit(1); });
