import { Router } from "express";
import mongoose from "mongoose";
import Project from "../models/Project.js";
import Task from "../models/Task.js";
import User from "../models/User.js";
import auth from "../middleware/auth.js";

const router = Router();
router.use(auth);

router.get("/", async (req, res, next) => {
  try {
    const projects = await Project.find({ $or: [{ owner: req.user.id }, { members: req.user.id }] })
      .populate("owner", "name email").populate("members", "name email").sort({ updatedAt: -1 });
    const ids = projects.map(p => p._id);
    const tasks = await Task.find({ project: { $in: ids } }).select("project status");
    const result = projects.map(p => {
      const ownTasks = tasks.filter(t => String(t.project) === String(p._id));
      return { ...p.toObject(), taskCount: ownTasks.length, completedCount: ownTasks.filter(t => t.status === "done").length };
    });
    res.json({ projects: result });
  } catch (e) { next(e); }
});

router.post("/", async (req, res, next) => {
  try {
    const { name, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Project name is required." });
    const project = await Project.create({ name, description: description || "", owner: req.user.id, members: [req.user.id] });
    res.status(201).json({ project: await project.populate("owner", "name email") });
  } catch (e) { next(e); }
});

router.get("/:projectId/tasks", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.projectId)) return res.status(400).json({ message: "Invalid project ID." });
    const project = await Project.findOne({ _id: req.params.projectId, $or: [{ owner: req.user.id }, { members: req.user.id }] });
    if (!project) return res.status(404).json({ message: "Project not found or access denied." });
    const tasks = await Task.find({ project: project.id }).populate("assignee", "name email").populate("createdBy", "name").populate("comments.author", "name").sort({ createdAt: -1 });
    res.json({ tasks });
  } catch (e) { next(e); }
});

router.post("/:projectId/tasks", async (req, res, next) => {
  try {
    const project = await Project.findOne({ _id: req.params.projectId, $or: [{ owner: req.user.id }, { members: req.user.id }] });
    if (!project) return res.status(404).json({ message: "Project not found or access denied." });
    const { title, description, priority, dueDate, assigneeEmail } = req.body;
    if (!title?.trim()) return res.status(400).json({ message: "Task title is required." });
    let assignee = null;
    if (assigneeEmail?.trim()) {
      assignee = await User.findOne({ email: assigneeEmail.toLowerCase().trim() });
      if (!assignee) return res.status(404).json({ message: "No registered user found with that assignee email." });
      if (!project.members.some(id => String(id) === String(assignee.id))) {
        project.members.push(assignee.id); await project.save();
      }
    }
    const task = await Task.create({ title, description, priority, dueDate: dueDate || null, project: project.id, createdBy: req.user.id, assignee: assignee?.id || null });
    const populated = await task.populate([{ path: "assignee", select: "name email" }, { path: "createdBy", select: "name" }]);
    req.app.get("io")?.to(`project:${project.id}`).emit("task-created", populated);
    res.status(201).json({ task: populated });
  } catch (e) { next(e); }
});
export default router;
