import { Router } from "express";
import mongoose from "mongoose";
import Task from "../models/Task.js";
import Project from "../models/Project.js";
import User from "../models/User.js";
import auth from "../middleware/auth.js";

const router = Router();
router.use(auth);

async function accessibleTask(taskId, userId) {
  if (!mongoose.isValidObjectId(taskId)) return null;
  const task = await Task.findById(taskId);
  if (!task) return null;
  const project = await Project.findOne({ _id: task.project, $or: [{ owner: userId }, { members: userId }] });
  return project ? { task, project } : null;
}

router.patch("/tasks/:taskId", async (req, res, next) => {
  try {
    const found = await accessibleTask(req.params.taskId, req.user.id);
    if (!found) return res.status(404).json({ message: "Task not found or access denied." });
    const allowed = ["title", "description", "status", "priority", "dueDate"];
    for (const key of allowed) if (req.body[key] !== undefined) found.task[key] = req.body[key];
    if (req.body.assigneeEmail !== undefined) {
      if (!req.body.assigneeEmail) found.task.assignee = null;
      else {
        const person = await User.findOne({ email: req.body.assigneeEmail.toLowerCase().trim() });
        if (!person) return res.status(404).json({ message: "Assignee account not found. Ask them to register first." });
        found.task.assignee = person.id;
        if (!found.project.members.some(id => String(id) === String(person.id))) {
          found.project.members.push(person.id); await found.project.save();
        }
      }
    }
    await found.task.save();
    const task = await found.task.populate([{ path: "assignee", select: "name email" }, { path: "createdBy", select: "name" }, { path: "comments.author", select: "name" }]);
    req.app.get("io")?.to(`project:${found.project.id}`).emit("task-updated", task);
    res.json({ task });
  } catch (e) { next(e); }
});

router.delete("/tasks/:taskId", async (req, res, next) => {
  try {
    const found = await accessibleTask(req.params.taskId, req.user.id);
    if (!found) return res.status(404).json({ message: "Task not found or access denied." });
    await found.task.deleteOne();
    req.app.get("io")?.to(`project:${found.project.id}`).emit("task-deleted", { taskId: req.params.taskId });
    res.json({ message: "Task deleted." });
  } catch (e) { next(e); }
});

router.post("/tasks/:taskId/comments", async (req, res, next) => {
  try {
    const found = await accessibleTask(req.params.taskId, req.user.id);
    if (!found) return res.status(404).json({ message: "Task not found or access denied." });
    if (!req.body.text?.trim()) return res.status(400).json({ message: "Comment cannot be empty." });
    found.task.comments.push({ author: req.user.id, text: req.body.text.trim() });
    await found.task.save();
    const task = await found.task.populate("comments.author", "name");
    req.app.get("io")?.to(`project:${found.project.id}`).emit("comment-added", { taskId: task.id });
    res.status(201).json({ task });
  } catch (e) { next(e); }
});
export default router;
