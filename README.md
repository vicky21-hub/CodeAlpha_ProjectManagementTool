# TaskFlow — CodeAlpha Task 3: Project Management Tool

A full-stack project management application starter built with React + TypeScript, Express, MongoDB, JWT, and Socket.IO.

## Features included
- Register, login, and logout with HttpOnly JWT session cookies
- Rate-limited login and 12-character minimum passwords
- Create and view projects
- Add tasks to projects
- Assign tasks to team members by email
- Update task status: To Do, In Progress, Completed
- Edit and delete tasks
- Task comments
- Dashboard counts and project progress
- Authenticated Socket.IO task updates scoped to project members

## Requirements
- Node.js 20+
- npm
- MongoDB local installation or MongoDB Atlas connection string

## 1. Configure backend
```bash
cd backend
copy .env.example .env
```
On macOS/Linux use `cp .env.example .env`.

Edit `.env`:
- `MONGO_URI`: your MongoDB connection string
- `JWT_SECRET`: generate a unique secret with the command below; the server requires at least 32 characters and rejects the example value
- `CLIENT_URL`: `http://localhost:5173`

Generate a JWT secret in a terminal and paste the output into `.env`:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

For persistent data with MongoDB Atlas:
1. Create an Atlas cluster and a database user.
2. In Network Access, allow your current IP address.
3. Copy the application connection string and set its database path to `taskflow`, for example `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/taskflow?retryWrites=true&w=majority`.
4. Put that URI in `MONGO_URI` in `backend/.env`. URL-encode special characters in the database password.

Keep `.env` private. Do not use `0.0.0.0/0` for Atlas Network Access on a production database.

## 2. Start backend
```bash
cd backend
npm install
npm run dev
```
Backend runs at `http://localhost:5000`.

## 3. Start frontend
Open a second terminal:
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at `http://localhost:5173`.

## 4. Test the application
1. Register an account with a password of at least 12 characters.
2. Create a project and add tasks.
3. Register a second account, then assign a task to its email address.
4. Confirm the assigned user can view and update the project task.
5. Change task status, edit/delete tasks, add comments, and verify live updates.

For assignment, the other user must register first with the email used in the assignment field.

## API overview
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET/POST /api/projects`
- `GET/POST /api/projects/:projectId/tasks`
- `PATCH/DELETE /api/tasks/:taskId`
- `POST /api/tasks/:taskId/comments`

The API uses an HttpOnly, SameSite=Strict session cookie. Project and task endpoints require an authenticated session. Cookies are marked Secure when `NODE_ENV=production`; production deployment must use HTTPS.

## GitHub submission checklist
- Create repository: `CodeAlpha_ProjectManagementTool`
- Push `frontend/`, `backend/`, `README.md`
- Do not upload `.env`; `.env.example` is safe to upload.
- Add screenshots to a `screenshots/` folder after testing.
- Deploy only after configuring production environment variables.
- Record a demo video and submit the GitHub + LinkedIn links through the CodeAlpha WhatsApp-group submission form.

## Important
This is a working MVP. Configure a persistent MongoDB database and repeat the multi-user workflow before submitting. Local in-memory test databases lose their data when stopped. The app has been tested locally; it is not publicly deployed by this repository setup.
