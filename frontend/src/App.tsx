import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { api } from "./api";
import { LayoutDashboard, FolderKanban, Plus, Search, Bell, LogOut, CheckCircle2, Clock3, CircleDashed, Users, CalendarDays, MessageCircle, Trash2, Pencil, X, ListTodo, Sparkles } from "lucide-react";

type User = { id: string; name: string; email: string };
type Project = { _id: string; name: string; description: string; taskCount: number; completedCount: number };
type Comment = { _id: string; text: string; author?: { name: string }; createdAt: string };
type Task = { _id: string; title: string; description: string; status: "todo"|"inprogress"|"done"; priority: "low"|"medium"|"high"; dueDate?: string; assignee?: {name:string;email:string}; comments: Comment[] };

const API_SOCKET = import.meta.env.VITE_SOCKET_URL || `${window.location.protocol}//${window.location.hostname}:5000`;
const statusLabel = { todo: "To do", inprogress: "In progress", done: "Completed" };

export default function App() {
  const [user, setUser] = useState<User|null>(null);
  const [authMode, setAuthMode] = useState<"login"|"register">("login");
  const [authForm, setAuthForm] = useState({name:"",email:"",password:""});
  const [projects, setProjects] = useState<Project[]>([]);
  const [active, setActive] = useState<Project|null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<"project"|"task"|null>(null);
  const [taskEdit, setTaskEdit] = useState<Task|null>(null);
  const [projectForm, setProjectForm] = useState({name:"",description:""});
  const [taskForm, setTaskForm] = useState({title:"",description:"",priority:"medium",dueDate:"",assigneeEmail:""});
  const [commentDraft, setCommentDraft] = useState<Record<string,string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const loadProjects = async () => { const {data}=await api.get("/projects"); setProjects(data.projects); };
  const loadTasks = async (p: Project) => { const {data}=await api.get(`/projects/${p._id}/tasks`); setTasks(data.tasks); };
  useEffect(() => {
    api.get("/auth/me").then(({data})=>{setUser(data.user);}).catch(()=>{});
  },[]);
  useEffect(()=>{ if(user) loadProjects().catch(e=>setError(e.response?.data?.message||"Could not load projects.")); },[user]);
  useEffect(()=>{
    if(!active) return;
    loadTasks(active).catch(e=>setError(e.response?.data?.message||"Could not load tasks."));
    const socket=io(API_SOCKET,{withCredentials:true});
    socket.emit("join-project",active._id);
    socket.on("task-created",()=>loadTasks(active));
    socket.on("task-updated",()=>loadTasks(active));
    socket.on("task-deleted",()=>loadTasks(active));
    socket.on("comment-added",()=>loadTasks(active));
    return ()=>{socket.disconnect();};
  },[active?._id]);

  const visibleTasks = useMemo(()=>tasks.filter(t=>`${t.title} ${t.description}`.toLowerCase().includes(query.toLowerCase())),[tasks,query]);
  const counts = {total:tasks.length,doing:tasks.filter(t=>t.status==="inprogress").length,done:tasks.filter(t=>t.status==="done").length};
  const progress = active && tasks.length ? Math.round(counts.done/tasks.length*100) : 0;

  async function submitAuth(e:React.FormEvent) {
    e.preventDefault(); setError(""); setBusy(true);
    try { const {data}=await api.post(`/auth/${authMode}`,authForm); setUser(data.user); }
    catch(e:any){setError(e.response?.data?.message||"Authentication failed.");}
    finally{setBusy(false);}
  }
  async function logout(){try{await api.post("/auth/logout");}catch{}setUser(null);setActive(null);setProjects([]);setTasks([]);}
  async function createProject(e:React.FormEvent){
    e.preventDefault();setBusy(true);setError("");
    try{const {data}=await api.post("/projects",projectForm);setProjects(p=>[data.project,...p]);setActive(data.project);setProjectForm({name:"",description:""});setModal(null);}
    catch(e:any){setError(e.response?.data?.message||"Could not create project.");}finally{setBusy(false);}
  }
  async function saveTask(e:React.FormEvent){
    e.preventDefault();if(!active)return;setBusy(true);setError("");
    try{
      if(taskEdit){await api.patch(`/tasks/${taskEdit._id}`,taskForm);}
      else{await api.post(`/projects/${active._id}/tasks`,taskForm);}
      await loadTasks(active);await loadProjects();setTaskForm({title:"",description:"",priority:"medium",dueDate:"",assigneeEmail:""});setTaskEdit(null);setModal(null);
    }catch(e:any){setError(e.response?.data?.message||"Could not save task.");}finally{setBusy(false);}
  }
  async function changeStatus(task:Task,status:Task["status"]){try{await api.patch(`/tasks/${task._id}`,{status});if(active)await loadTasks(active);await loadProjects();}catch(e:any){setError(e.response?.data?.message||"Update failed.");}}
  async function deleteTask(task:Task){if(!confirm(`Delete "${task.title}"?`))return;try{await api.delete(`/tasks/${task._id}`);if(active)await loadTasks(active);await loadProjects();}catch(e:any){setError(e.response?.data?.message||"Delete failed.");}}
  async function addComment(task:Task){const text=commentDraft[task._id]?.trim();if(!text)return;try{await api.post(`/tasks/${task._id}/comments`,{text});setCommentDraft(d=>({...d,[task._id]:""}));if(active)await loadTasks(active);}catch(e:any){setError(e.response?.data?.message||"Comment failed.");}}
  function openEdit(task:Task){setTaskEdit(task);setTaskForm({title:task.title,description:task.description||"",priority:task.priority,dueDate:task.dueDate?task.dueDate.slice(0,10):"",assigneeEmail:task.assignee?.email||""});setModal("task");}

  if(!user) return <main className="auth-page"><div className="auth-art"><div className="brand large"><span className="brand-mark">T</span> taskflow</div><div className="art-copy"><span className="eyebrow">WORK BETTER, TOGETHER</span><h1>Make big ideas<br/><em>happen.</em></h1><p>One clear space for your projects, people, and progress.</p><div className="art-orbit"><div>✓</div><span>Plan</span><span>Build</span><span>Deliver</span></div></div><div className="art-foot">A calmer way to get things done.</div></div><section className="auth-panel"><form className="auth-card" onSubmit={submitAuth}><span className="eyebrow">{authMode==="login"?"WELCOME BACK":"GET STARTED"}</span><h2>{authMode==="login"?"Sign in to TaskFlow":"Create your account"}</h2><p className="muted">{authMode==="login"?"Pick up where your team left off.":"Start organizing your team's work today."}</p>{authMode==="register"&&<label>Full name<input required value={authForm.name} onChange={e=>setAuthForm({...authForm,name:e.target.value})} placeholder="Your name"/></label>}<label>Email address<input type="email" required value={authForm.email} onChange={e=>setAuthForm({...authForm,email:e.target.value})} placeholder="you@example.com"/></label><label>Password<input type="password" minLength={12} required value={authForm.password} onChange={e=>setAuthForm({...authForm,password:e.target.value})} placeholder="At least 12 characters"/></label>{error&&<div className="error">{error}</div>}<button className="primary full" disabled={busy}>{busy?"Please wait…":authMode==="login"?"Sign in":"Create account"}</button><p className="switch">{authMode==="login"?"New to TaskFlow?":"Already have an account?"} <button type="button" onClick={()=>{setAuthMode(authMode==="login"?"register":"login");setError("");}}>{authMode==="login"?"Create an account":"Sign in"}</button></p></form></section></main>;

  return <div className="app-shell"><aside className="sidebar"><div className="brand"><span className="brand-mark">T</span> taskflow</div><div className="workspace-label">WORKSPACE</div><button className={`nav-item ${!active?"selected":""}`} onClick={()=>setActive(null)}><LayoutDashboard size={18}/> Overview</button><div className="side-heading"><span>YOUR PROJECTS</span><button onClick={()=>setModal("project")} aria-label="Create project"><Plus size={17}/></button></div><div className="project-list">{projects.map(p=><button key={p._id} className={`project-link ${active?._id===p._id?"active":""}`} onClick={()=>setActive(p)}><span className="project-dot"/><span>{p.name}</span></button>)}</div><button className="new-project" onClick={()=>setModal("project")}><Plus size={16}/> New project</button><div className="sidebar-bottom"><div className="avatar">{user.name.slice(0,1).toUpperCase()}</div><div className="user-meta"><strong>{user.name}</strong><small>{user.email}</small></div><button className="icon-button" onClick={logout} title="Log out"><LogOut size={17}/></button></div></aside>
  <main className="main-area"><header className="topbar"><div className="breadcrumb">Workspace <span>/</span> {active?.name||"Overview"}</div><div className="top-actions"><div className="searchbox"><Search size={16}/><input placeholder="Search tasks..." value={query} onChange={e=>setQuery(e.target.value)}/></div><button className="icon-button notification" title="Notifications"><Bell size={18}/><i/></button><div className="avatar small">{user.name.slice(0,1).toUpperCase()}</div></div></header>
  <div className="content">{error&&<div className="error global-error">{error}<button onClick={()=>setError("")}><X size={15}/></button></div>}
  {!active?<><div className="welcome-row"><div><span className="eyebrow">YOUR WORKSPACE</span><h1>Good work starts <em>here.</em></h1><p className="muted">A clear view of everything your team is moving forward.</p></div><button className="primary" onClick={()=>setModal("project")}><Plus size={17}/> Create project</button></div><div className="overview-stats"><Stat icon={<FolderKanban/>} label="Projects" value={projects.length} tint="violet"/><Stat icon={<ListTodo/>} label="Tasks" value={projects.reduce((a,p)=>a+p.taskCount,0)} tint="blue"/><Stat icon={<CheckCircle2/>} label="Completed" value={projects.reduce((a,p)=>a+p.completedCount,0)} tint="green"/></div><div className="section-title"><div><h2>Your projects</h2><p className="muted">Choose a project to open its task board.</p></div><button className="text-button" onClick={()=>setModal("project")}>+ Add project</button></div><div className="project-grid">{projects.length?projects.map(p=><button className="project-card" key={p._id} onClick={()=>setActive(p)}><div className="card-top"><span className="project-icon"><FolderKanban size={19}/></span><span className="card-arrow">↗</span></div><h3>{p.name}</h3><p>{p.description||"No description added yet."}</p><div className="project-progress"><div><span>{p.completedCount}/{p.taskCount} tasks done</span><b>{p.taskCount?Math.round(p.completedCount/p.taskCount*100):0}%</b></div><div className="progress-track"><i style={{width:`${p.taskCount?p.completedCount/p.taskCount*100:0}%`}}/></div></div></button>):<div className="empty-state"><div className="empty-icon"><Sparkles/></div><h3>Your workspace is ready</h3><p>Create your first project and invite your team to get moving.</p><button className="primary" onClick={()=>setModal("project")}><Plus size={16}/> Create first project</button></div>}</div></>:<><div className="welcome-row project-welcome"><div><span className="eyebrow">PROJECT BOARD</span><h1>{active.name}</h1><p className="muted">{active.description||"Plan tasks, share updates, and move work forward."}</p></div><button className="primary" onClick={()=>{setTaskEdit(null);setTaskForm({title:"",description:"",priority:"medium",dueDate:"",assigneeEmail:""});setModal("task");}}><Plus size={17}/> Add task</button></div><div className="board-summary"><div><span className="summary-icon purple"><ListTodo/></span><div><small>Total tasks</small><strong>{counts.total}</strong></div></div><div><span className="summary-icon amber"><Clock3/></span><div><small>In progress</small><strong>{counts.doing}</strong></div></div><div><span className="summary-icon green"><CheckCircle2/></span><div><small>Completed</small><strong>{counts.done}</strong></div></div><div className="overall-progress"><div><span>Project progress</span><strong>{progress}%</strong></div><div className="progress-track"><i style={{width:`${progress}%`}}/></div></div></div><div className="board-heading"><div><h2>Task board</h2><p className="muted">Keep every next step visible.</p></div><span className="task-count">{visibleTasks.length} tasks</span></div><div className="kanban">{(["todo","inprogress","done"] as const).map((status,idx)=><section className="kanban-column" key={status}><div className="column-head"><div><span className={`status-dot s${idx}`}/><h3>{statusLabel[status]}</h3><span className="count-pill">{visibleTasks.filter(t=>t.status===status).length}</span></div><button className="icon-button" onClick={()=>{setTaskEdit(null);setTaskForm({title:"",description:"",priority:"medium",dueDate:"",assigneeEmail:""});setModal("task");}}><Plus size={17}/></button></div>{visibleTasks.filter(t=>t.status===status).map(task=><article className="task-card" key={task._id}><div className="task-card-top"><span className={`priority ${task.priority}`}>{task.priority} priority</span><div className="task-actions"><button onClick={()=>openEdit(task)} title="Edit"><Pencil size={14}/></button><button onClick={()=>deleteTask(task)} title="Delete"><Trash2 size={14}/></button></div></div><h4>{task.title}</h4>{task.description&&<p>{task.description}</p>}<div className="task-meta">{task.dueDate&&<span><CalendarDays size={13}/>{new Date(task.dueDate).toLocaleDateString()}</span>}{task.assignee&&<span><Users size={13}/>{task.assignee.name}</span>}<span><MessageCircle size={13}/>{task.comments?.length||0}</span></div><div className="task-bottom"><select value={task.status} onChange={e=>changeStatus(task,e.target.value as Task["status"])} aria-label="Task status"><option value="todo">To do</option><option value="inprogress">In progress</option><option value="done">Completed</option></select><div className="mini-avatar">{task.assignee?.name?.slice(0,1).toUpperCase()||"—"}</div></div><div className="comments"><details><summary>Comments ({task.comments?.length||0})</summary>{task.comments?.map(c=><p className="comment" key={c._id}><b>{c.author?.name||"Member"}:</b> {c.text}</p>)}<div className="comment-input"><input value={commentDraft[task._id]||""} onChange={e=>setCommentDraft(d=>({...d,[task._id]:e.target.value}))} placeholder="Write a comment…"/><button onClick={()=>addComment(task)}>Send</button></div></details></div></article>)}{visibleTasks.filter(t=>t.status===status).length===0&&<div className="column-empty">No tasks here yet</div>}</section>)}</div></>}</div></main>
  {modal&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget){setModal(null);setTaskEdit(null);}}}><form className="modal" onSubmit={modal==="project"?createProject:saveTask}><div className="modal-head"><div><span className="eyebrow">{modal==="project"?"WORKSPACE":"TASK DETAILS"}</span><h2>{modal==="project"?"Create a project":taskEdit?"Edit task":"Create a task"}</h2></div><button type="button" className="icon-button" onClick={()=>{setModal(null);setTaskEdit(null);}}><X/></button></div>{modal==="project"?<><label>Project name<input required autoFocus value={projectForm.name} onChange={e=>setProjectForm({...projectForm,name:e.target.value})} placeholder="e.g. Website redesign"/></label><label>Description<textarea value={projectForm.description} onChange={e=>setProjectForm({...projectForm,description:e.target.value})} placeholder="What is this project about?"/></label></>:<><label>Task title<input required autoFocus value={taskForm.title} onChange={e=>setTaskForm({...taskForm,title:e.target.value})} placeholder="e.g. Design the landing page"/></label><label>Description<textarea value={taskForm.description} onChange={e=>setTaskForm({...taskForm,description:e.target.value})} placeholder="Add useful details…"/></label><div className="form-row"><label>Priority<select value={taskForm.priority} onChange={e=>setTaskForm({...taskForm,priority:e.target.value})}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label><label>Due date<input type="date" value={taskForm.dueDate} onChange={e=>setTaskForm({...taskForm,dueDate:e.target.value})}/></label></div><label>Assignee email <small>(must be a registered TaskFlow user)</small><input type="email" value={taskForm.assigneeEmail} onChange={e=>setTaskForm({...taskForm,assigneeEmail:e.target.value})} placeholder="teammate@example.com"/></label></> }<div className="modal-actions"><button type="button" className="secondary" onClick={()=>{setModal(null);setTaskEdit(null);}}>Cancel</button><button className="primary" disabled={busy}>{busy?"Saving…":modal==="project"?"Create project":taskEdit?"Save changes":"Create task"}</button></div></form></div>}</div>;
}

function Stat({icon,label,value,tint}:{icon:React.ReactNode;label:string;value:number;tint:string}){return <div className="stat-card"><span className={`stat-icon ${tint}`}>{icon}</span><div><small>{label}</small><strong>{value}</strong></div></div>}
