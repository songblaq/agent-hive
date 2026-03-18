export function dashboardHtml(defaultProject?: string): string {
  const defaultSlug = defaultProject ? JSON.stringify(defaultProject) : "null";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AgentHive Dashboard</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0d1117; color: #c9d1d9; }
  .header { background: #161b22; border-bottom: 1px solid #30363d; padding: 16px 24px; display: flex; align-items: center; gap: 12px; }
  .header h1 { font-size: 20px; color: #58a6ff; }
  .header .badge { background: #238636; color: #fff; padding: 2px 8px; border-radius: 12px; font-size: 12px; }
  .header-actions { margin-left: auto; display: flex; gap: 8px; align-items: center; }
  .project-select { background: #0d1117; color: #c9d1d9; border: 1px solid #30363d; padding: 6px 12px; border-radius: 6px; font-size: 13px; min-width: 200px; }
  .project-select:focus { border-color: #58a6ff; outline: none; }
  .container { max-width: 1400px; margin: 0 auto; padding: 24px; }
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px; }
  .stat-card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px; }
  .stat-card .label { font-size: 12px; color: #8b949e; text-transform: uppercase; }
  .stat-card .value { font-size: 28px; font-weight: 600; margin-top: 4px; }
  .stat-card .value.green { color: #3fb950; }
  .stat-card .value.blue { color: #58a6ff; }
  .stat-card .value.yellow { color: #d29922; }
  .stat-card .value.purple { color: #bc8cff; }
  .board { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 24px; }
  @media (max-width: 900px) { .board { grid-template-columns: 1fr; } }
  .column { background: #161b22; border: 1px solid #30363d; border-radius: 8px; min-height: 200px; }
  .column-header { padding: 12px 16px; font-weight: 600; font-size: 14px; border-bottom: 1px solid #30363d; display: flex; justify-content: space-between; }
  .column-header .count { background: #30363d; padding: 1px 8px; border-radius: 10px; font-size: 12px; }
  .task-card { margin: 8px; padding: 12px; background: #0d1117; border: 1px solid #30363d; border-radius: 6px; }
  .task-card:hover { border-color: #58a6ff; }
  .task-card .task-id { font-size: 11px; color: #8b949e; font-family: monospace; }
  .task-card .task-title { font-size: 13px; margin-top: 4px; }
  .task-card .task-meta { font-size: 11px; color: #8b949e; margin-top: 6px; display: flex; gap: 8px; align-items: center; }
  .task-card .task-actions { margin-top: 8px; display: flex; gap: 4px; flex-wrap: wrap; }
  .priority-high { color: #f85149; }
  .priority-medium { color: #d29922; }
  .priority-low { color: #8b949e; }
  .priority-critical { color: #ff7b72; font-weight: 700; }
  .agent { color: #bc8cff; }
  .btn { background: #21262d; color: #c9d1d9; border: 1px solid #30363d; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 11px; }
  .btn:hover { background: #30363d; }
  .btn-primary { background: #238636; border-color: #238636; color: #fff; }
  .btn-primary:hover { background: #2ea043; }
  .btn-blue { background: #1f6feb; border-color: #1f6feb; color: #fff; }
  .btn-blue:hover { background: #388bfd; }
  .btn-danger { background: #da3633; border-color: #da3633; color: #fff; }
  .btn-danger:hover { background: #f85149; }
  .btn-lg { padding: 8px 16px; font-size: 13px; }
  .section { margin-bottom: 24px; }
  .section h2 { font-size: 16px; margin-bottom: 12px; color: #58a6ff; }
  .agents-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
  .agent-card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px; }
  .agent-card .name { font-weight: 600; color: #bc8cff; }
  .agent-card .tool-badge { font-size: 11px; color: #8b949e; background: #21262d; padding: 2px 6px; border-radius: 4px; margin-left: 6px; }
  .agent-card .role { font-size: 12px; color: #8b949e; margin-top: 4px; }
  .decisions-list { list-style: none; }
  .decisions-list li { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px; margin-bottom: 8px; }
  .status-resolved { color: #3fb950; }
  .status-open { color: #d29922; }
  .tabs { display: flex; gap: 4px; margin-bottom: 16px; border-bottom: 1px solid #30363d; padding-bottom: 8px; }
  .tab { background: none; border: none; color: #8b949e; padding: 8px 16px; cursor: pointer; font-size: 14px; border-radius: 6px 6px 0 0; }
  .tab.active { color: #58a6ff; background: #161b22; border: 1px solid #30363d; border-bottom-color: #161b22; }
  .tab:hover { color: #c9d1d9; }
  .thread-content { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px; white-space: pre-wrap; font-size: 13px; line-height: 1.6; max-height: 400px; overflow-y: auto; }
  .log-entry { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
  .log-entry .log-date { font-size: 12px; color: #58a6ff; font-weight: 600; margin-bottom: 8px; }
  .log-entry .log-content { white-space: pre-wrap; font-size: 13px; line-height: 1.6; max-height: 500px; overflow-y: auto; }
  .empty { color: #484f58; font-style: italic; padding: 24px; text-align: center; }
  /* Modal */
  .modal-overlay { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); z-index: 100; justify-content: center; align-items: center; }
  .modal-overlay.show { display: flex; }
  .modal { background: #161b22; border: 1px solid #30363d; border-radius: 12px; padding: 24px; width: 480px; max-width: 90vw; }
  .modal h3 { font-size: 18px; margin-bottom: 16px; color: #58a6ff; }
  .modal .form-group { margin-bottom: 12px; }
  .modal label { display: block; font-size: 12px; color: #8b949e; margin-bottom: 4px; }
  .modal input, .modal select { width: 100%; padding: 8px 12px; background: #0d1117; border: 1px solid #30363d; border-radius: 6px; color: #c9d1d9; font-size: 14px; }
  .modal input:focus, .modal select:focus { border-color: #58a6ff; outline: none; }
  .modal .modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; }
  .toast { position: fixed; bottom: 24px; right: 24px; background: #238636; color: #fff; padding: 12px 20px; border-radius: 8px; font-size: 13px; z-index: 200; display: none; }
  .toast.error { background: #da3633; }
  .toast.show { display: block; }
  .collab-layout { display: grid; grid-template-columns: 200px 1fr; gap: 16px; min-height: 500px; }
  .collab-sidebar { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 12px; }
  .collab-sidebar h3 { font-size: 12px; color: #8b949e; text-transform: uppercase; margin-bottom: 8px; }
  .channel-item { padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 13px; color: #c9d1d9; display: flex; justify-content: space-between; }
  .channel-item:hover { background: #21262d; }
  .channel-item.active { background: #1f6feb; color: #fff; }
  .channel-item .count { font-size: 11px; color: #8b949e; }
  .collab-main { background: #161b22; border: 1px solid #30363d; border-radius: 8px; display: flex; flex-direction: column; }
  .collab-header { padding: 12px 16px; border-bottom: 1px solid #30363d; font-weight: 600; font-size: 14px; display: flex; justify-content: space-between; align-items: center; }
  .collab-messages { flex: 1; overflow-y: auto; padding: 12px 16px; max-height: 400px; }
  .collab-msg { margin-bottom: 12px; }
  .collab-msg .msg-header { font-size: 12px; display: flex; gap: 8px; align-items: center; }
  .collab-msg .msg-agent { color: #bc8cff; font-weight: 600; }
  .collab-msg .msg-time { color: #484f58; }
  .collab-msg .msg-type { color: #58a6ff; font-size: 11px; background: #0d1117; padding: 1px 6px; border-radius: 4px; }
  .collab-msg .msg-reply { color: #484f58; font-size: 11px; }
  .collab-msg .msg-content { margin-top: 4px; font-size: 13px; line-height: 1.5; white-space: pre-wrap; }
  .collab-msg .msg-refs { font-size: 11px; color: #58a6ff; margin-top: 2px; }
  .collab-input { padding: 12px 16px; border-top: 1px solid #30363d; display: flex; gap: 8px; }
  .collab-input input { flex: 1; padding: 8px 12px; background: #0d1117; border: 1px solid #30363d; border-radius: 6px; color: #c9d1d9; font-size: 13px; }
  .collab-input input:focus { border-color: #58a6ff; outline: none; }
  .collab-input select { background: #0d1117; color: #c9d1d9; border: 1px solid #30363d; padding: 8px; border-radius: 6px; font-size: 12px; }
  @media (max-width: 900px) { .collab-layout { grid-template-columns: 1fr; } }
  .harness-section { margin-bottom: 16px; }
  .harness-section h3 { font-size: 14px; color: #58a6ff; margin-bottom: 8px; }
  .harness-item { background: #0d1117; border: 1px solid #30363d; border-radius: 6px; padding: 10px 14px; margin-bottom: 6px; font-size: 13px; }
  .harness-item .item-name { color: #bc8cff; font-weight: 600; }
  .harness-item .item-content { color: #8b949e; margin-top: 4px; white-space: pre-wrap; max-height: 100px; overflow-y: auto; }
  .sync-status { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
  .sync-status .label { font-size: 12px; color: #8b949e; }
  .sync-status .value { font-size: 14px; color: #c9d1d9; }
  .sync-mappings { list-style: none; }
  .sync-mappings li { background: #0d1117; border: 1px solid #30363d; border-radius: 6px; padding: 8px 14px; margin-bottom: 4px; font-size: 13px; display: flex; justify-content: space-between; }
  .sync-mappings .issue-num { color: #58a6ff; font-weight: 600; }
  .sync-mappings .task-ref { color: #3fb950; }
</style>
</head>
<body>
<div class="header">
  <h1>AgentHive</h1>
  <span class="badge">Dashboard</span>
  <select id="projectSelect" class="project-select" onchange="switchProject(this.value)">
    <option value="">Loading projects...</option>
  </select>
  <div class="header-actions">
    <button class="btn btn-primary btn-lg" onclick="openCreateTask()">+ New Task</button>
    <button class="btn btn-lg" onclick="loadAll()">Refresh</button>
  </div>
</div>
<div class="container">
  <div id="stats" class="stats"></div>
  <div class="tabs">
    <button class="tab active" onclick="showTab('board',this)">Kanban Board</button>
    <button class="tab" onclick="showTab('agents',this)">Agents</button>
    <button class="tab" onclick="showTab('log',this)">Activity Log</button>
    <button class="tab" onclick="showTab('decisions',this)">Decisions</button>
    <button class="tab" onclick="showTab('threads',this)">Threads</button>
    <button class="tab" onclick="showTab('collab',this)">Collab</button>
    <button class="tab" onclick="showTab('harness',this)">Harness</button>
    <button class="tab" onclick="showTab('sync',this)">Sync</button>
  </div>
  <div id="board" class="tab-content"></div>
  <div id="agents" class="tab-content" style="display:none"></div>
  <div id="log" class="tab-content" style="display:none"></div>
  <div id="decisions" class="tab-content" style="display:none"></div>
  <div id="threads" class="tab-content" style="display:none"></div>
  <div id="collab" class="tab-content" style="display:none"></div>
  <div id="harness" class="tab-content" style="display:none"></div>
  <div id="sync" class="tab-content" style="display:none"></div>
</div>

<!-- Create Task Modal -->
<div id="createModal" class="modal-overlay" onclick="if(event.target===this)closeModal('createModal')">
  <div class="modal">
    <h3>New Task</h3>
    <div class="form-group"><label>Title</label><input id="taskTitle" placeholder="Task title..."></div>
    <div class="form-group"><label>Category</label><input id="taskCategory" value="general" placeholder="general, feature, bugfix..."></div>
    <div class="form-group"><label>Priority</label>
      <select id="taskPriority"><option value="critical">Critical</option><option value="high">High</option><option value="medium" selected>Medium</option><option value="low">Low</option></select>
    </div>
    <div class="form-group"><label>Created By</label><input id="taskCreatedBy" value="human"></div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal('createModal')">Cancel</button>
      <button class="btn btn-primary" onclick="submitCreateTask()">Create</button>
    </div>
  </div>
</div>

<!-- Claim Task Modal -->
<div id="claimModal" class="modal-overlay" onclick="if(event.target===this)closeModal('claimModal')">
  <div class="modal">
    <h3>Claim Task: <span id="claimTaskId"></span></h3>
    <div class="form-group"><label>Agent ID</label><input id="claimAgent" value="human" placeholder="e.g. claude-code-1, codex, openclaw-2"></div>
    <div class="form-group"><label>Role</label>
      <select id="claimRole"><option value="builder">Builder</option><option value="planner">Planner</option><option value="reviewer">Reviewer</option></select>
    </div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal('claimModal')">Cancel</button>
      <button class="btn btn-blue" onclick="submitClaim()">Claim</button>
    </div>
  </div>
</div>

<div id="toast" class="toast"></div>

<script>
let currentProject = ${defaultSlug};
let allProjects = [];

function showTab(id, btn) {
  document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
  document.getElementById(id).style.display = '';
  if (btn) btn.classList.add('active');
}

function openModal(id) { document.getElementById(id).classList.add('show'); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }

function toast(msg, isError) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show' + (isError ? ' error' : '');
  setTimeout(() => el.className = 'toast', 3000);
}

async function api(path, opts) {
  const res = await fetch(path, opts);
  return res.json();
}

function p(slug) { return 'project=' + encodeURIComponent(slug); }

function switchProject(slug) {
  if (!slug) return;
  currentProject = slug;
  loadProjectData();
}

function openCreateTask() { openModal('createModal'); document.getElementById('taskTitle').focus(); }

async function submitCreateTask() {
  const title = document.getElementById('taskTitle').value.trim();
  if (!title) { toast('Title is required', true); return; }
  const body = {
    title,
    category: document.getElementById('taskCategory').value.trim(),
    priority: document.getElementById('taskPriority').value,
    created_by: document.getElementById('taskCreatedBy').value.trim(),
  };
  const res = await api('/api/tasks/create?' + p(currentProject), {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  closeModal('createModal');
  document.getElementById('taskTitle').value = '';
  toast('Created ' + (res.id || 'task'));
  loadProjectData();
}

let claimingTaskId = '';
function openClaimModal(taskId) {
  claimingTaskId = taskId;
  document.getElementById('claimTaskId').textContent = taskId;
  openModal('claimModal');
}

async function submitClaim() {
  const body = {
    task_id: claimingTaskId,
    agent: document.getElementById('claimAgent').value.trim(),
    role: document.getElementById('claimRole').value,
  };
  const res = await api('/api/tasks/claim?' + p(currentProject), {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  closeModal('claimModal');
  if (res.success) { toast(res.message); } else { toast(res.message, true); }
  loadProjectData();
}

async function changeStatus(taskId, status) {
  const res = await api('/api/tasks/status?' + p(currentProject), {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task_id: taskId, status })
  });
  if (res.success) { toast(res.message); } else { toast(res.message, true); }
  loadProjectData();
}

function statusButtons(task) {
  const s = task.status;
  let html = '';
  if (s === 'backlog' || s === 'ready') {
    html += '<button class="btn btn-blue" onclick="openClaimModal(\\''+esc(task.id)+'\\')">Claim</button>';
    if (s === 'backlog') html += '<button class="btn" onclick="changeStatus(\\''+esc(task.id)+'\\',\\'ready\\')">Ready</button>';
  }
  if (s === 'doing') {
    html += '<button class="btn" onclick="changeStatus(\\''+esc(task.id)+'\\',\\'review\\')">To Review</button>';
    html += '<button class="btn btn-primary" onclick="changeStatus(\\''+esc(task.id)+'\\',\\'done\\')">Done</button>';
    html += '<button class="btn btn-danger" onclick="changeStatus(\\''+esc(task.id)+'\\',\\'blocked\\')">Block</button>';
  }
  if (s === 'review') {
    html += '<button class="btn btn-primary" onclick="changeStatus(\\''+esc(task.id)+'\\',\\'done\\')">Approve</button>';
    html += '<button class="btn" onclick="changeStatus(\\''+esc(task.id)+'\\',\\'doing\\')">Back to Doing</button>';
  }
  if (s === 'blocked') {
    html += '<button class="btn" onclick="changeStatus(\\''+esc(task.id)+'\\',\\'doing\\')">Unblock</button>';
  }
  return html;
}

function priorityLabel(p) { return { critical: '!!', high: '!', medium: '', low: '-' }[p] || ''; }

function renderProjectSelector(projects) {
  const sel = document.getElementById('projectSelect');
  sel.innerHTML = '';
  for (const proj of projects) {
    const opt = document.createElement('option');
    opt.value = proj.slug;
    opt.textContent = proj.name + (proj.active === false ? ' (inactive)' : '');
    if (proj.slug === currentProject) opt.selected = true;
    sel.appendChild(opt);
  }
}

function renderStats(projects, tasks) {
  const total = tasks.length, done = tasks.filter(t=>t.status==='done').length;
  const active = tasks.filter(t=>t.status==='doing').length;
  const review = tasks.filter(t=>t.status==='review').length;
  const proj = projects.find(p=>p.slug===currentProject);
  const agentCount = proj?.activeAgents?.length || 0;
  document.getElementById('stats').innerHTML =
    '<div class="stat-card"><div class="label">Total Tasks</div><div class="value blue">'+total+'</div></div>'+
    '<div class="stat-card"><div class="label">Active</div><div class="value yellow">'+active+'</div></div>'+
    '<div class="stat-card"><div class="label">In Review</div><div class="value purple">'+review+'</div></div>'+
    '<div class="stat-card"><div class="label">Done</div><div class="value green">'+done+'/'+total+'</div></div>'+
    '<div class="stat-card"><div class="label">Projects</div><div class="value blue">'+projects.length+'</div></div>'+
    '<div class="stat-card"><div class="label">Agents</div><div class="value purple">'+agentCount+'</div></div>';
}

function renderBoard(tasks) {
  const cols = ['backlog','ready','doing','review','done'];
  const labels = {backlog:'Backlog',ready:'Ready',doing:'Doing',review:'Review',done:'Done'};
  let html = '<div class="board">';
  for (const col of cols) {
    const items = tasks.filter(t=>t.status===col);
    html += '<div class="column"><div class="column-header">'+labels[col]+' <span class="count">'+items.length+'</span></div>';
    if (!items.length) html += '<div class="empty">No tasks</div>';
    for (const t of items) {
      const pri = priorityLabel(t.priority);
      html += '<div class="task-card">';
      html += '<div class="task-id">'+esc(t.id)+'</div>';
      html += '<div class="task-title">'+esc(t.title)+'</div>';
      html += '<div class="task-meta">';
      const safePri = ['critical','high','medium','low'].includes(t.priority) ? t.priority : 'medium';
      if (pri) html += '<span class="priority-'+safePri+'">'+esc(pri)+' '+esc(safePri)+'</span>';
      if (t.owner) html += '<span class="agent">@'+esc(t.owner)+'</span>';
      html += '</div>';
      html += '<div class="task-actions">'+statusButtons(t)+'</div>';
      html += '</div>';
    }
    html += '</div>';
  }
  const blocked = tasks.filter(t=>t.status==='blocked');
  if (blocked.length) {
    html += '<div class="column" style="border-color:#da3633"><div class="column-header" style="color:#f85149">Blocked <span class="count">'+blocked.length+'</span></div>';
    for (const t of blocked) {
      html += '<div class="task-card"><div class="task-id">'+esc(t.id)+'</div><div class="task-title">'+esc(t.title)+'</div>';
      html += '<div class="task-actions">'+statusButtons(t)+'</div></div>';
    }
    html += '</div>';
  }
  html += '</div>';
  document.getElementById('board').innerHTML = html;
}

function renderAgents(project) {
  const agents = project?.activeAgents || [];
  if (!agents.length) { document.getElementById('agents').innerHTML = '<div class="empty">No active agents</div>'; return; }
  // Group by tool
  const byTool = {};
  for (const a of agents) {
    const tool = a.tool || a.agent_id;
    if (!byTool[tool]) byTool[tool] = [];
    byTool[tool].push(a);
  }
  let html = '<div class="section"><h2>Active Agents</h2>';
  for (const [tool, instances] of Object.entries(byTool)) {
    html += '<h3 style="font-size:14px;color:#8b949e;margin:16px 0 8px;">'+esc(tool)+' <span style="color:#484f58;">('+instances.length+' instance'+(instances.length>1?'s':'')+')</span></h3>';
    html += '<div class="agents-grid">';
    for (const a of instances) {
      html += '<div class="agent-card"><div class="name">'+esc(a.agent_id);
      if (a.tool && a.tool !== a.agent_id) html += '<span class="tool-badge">'+esc(a.tool)+'</span>';
      html += '</div><div class="role">'+esc(a.default_role)+'</div></div>';
    }
    html += '</div>';
  }
  html += '</div>';
  document.getElementById('agents').innerHTML = html;
}

async function renderLog() {
  if (!currentProject) return;
  const logs = await api('/api/log?'+p(currentProject));
  if (!logs.length) { document.getElementById('log').innerHTML = '<div class="empty">No activity log entries</div>'; return; }
  let html = '<div class="section"><h2>Activity Log</h2>';
  for (const entry of logs) {
    html += '<div class="log-entry">';
    html += '<div class="log-date">'+esc(entry.date)+'</div>';
    html += '<div class="log-content">'+esc(entry.content)+'</div>';
    html += '</div>';
  }
  html += '</div>';
  document.getElementById('log').innerHTML = html;
}

async function renderDecisions() {
  if (!currentProject) return;
  const decisions = await api('/api/decisions?'+p(currentProject));
  if (!decisions.length) { document.getElementById('decisions').innerHTML = '<div class="empty">No decisions</div>'; return; }
  let html = '<div class="section"><h2>Decisions</h2><ul class="decisions-list">';
  for (const d of decisions) {
    const cls = d.status==='resolved'?'status-resolved':'status-open';
    html += '<li><strong>'+esc(d.id||'')+'</strong> &mdash; '+esc(d.topic||'')+' <span class="'+esc(cls)+'">['+esc(d.status)+']</span>';
    if (d.result?.winner) html += '<br>Winner: <strong>'+esc(d.result.winner)+'</strong>';
    if (d.result?.rationale) html += ' &mdash; '+esc(String(d.result.rationale).slice(0,120));
    html += '</li>';
  }
  html += '</ul></div>';
  document.getElementById('decisions').innerHTML = html;
}

async function renderThreads() {
  if (!currentProject) return;
  const threads = await api('/api/threads?'+p(currentProject));
  if (!threads.length) { document.getElementById('threads').innerHTML = '<div class="empty">No threads</div>'; return; }
  let html = '<div class="section"><h2>Threads</h2>';
  for (const t of threads) {
    html += '<h3 style="margin:12px 0 8px;color:#c9d1d9">'+esc(t.name)+'</h3>';
    html += '<div class="thread-content">'+esc(t.content)+'</div>';
  }
  html += '</div>';
  document.getElementById('threads').innerHTML = html;
}

let collabChannels = [];
let collabCurrentChannel = 'general';
let collabMessages = [];

async function loadCollab() {
  if (!currentProject) return;
  try {
    collabChannels = await api('/api/collab/channels?' + p(currentProject));
  } catch { collabChannels = []; }
  renderCollab();
}

async function loadCollabMessages(channel) {
  collabCurrentChannel = channel || 'general';
  try {
    collabMessages = await api('/api/collab/messages?' + p(currentProject) + '&channel=' + encodeURIComponent(collabCurrentChannel) + '&limit=50');
  } catch { collabMessages = []; }
  renderCollabMessages();
}

function renderCollab() {
  if (!collabChannels.length) {
    document.getElementById('collab').innerHTML = '<div class="empty">No Collab channels. Initialize with: agenthive collab init --project ' + esc(currentProject) + '</div>';
    return;
  }
  let sidebar = '<div class="collab-sidebar"><h3>Channels</h3>';
  for (const ch of collabChannels) {
    const active = ch.id === collabCurrentChannel ? ' active' : '';
    sidebar += '<div class="channel-item' + active + '" onclick="loadCollabMessages(\\''+esc(ch.id)+'\\')"><span>#' + esc(ch.id) + '</span><span class="count">' + (ch.messageCount || 0) + '</span></div>';
  }
  sidebar += '</div>';
  
  let main = '<div class="collab-main">';
  main += '<div class="collab-header"><span>#' + esc(collabCurrentChannel) + '</span>';
  const ch = collabChannels.find(c => c.id === collabCurrentChannel);
  if (ch) main += '<span style="font-weight:normal;font-size:12px;color:#8b949e">' + esc(ch.description || '') + '</span>';
  main += '</div>';
  main += '<div id="collabMessages" class="collab-messages"></div>';
  main += '<div class="collab-input">';
  main += '<input id="collabAgent" style="max-width:120px" placeholder="Agent ID" value="human">';
  main += '<select id="collabType"><option value="message">message</option><option value="proposal">proposal</option><option value="question">question</option><option value="answer">answer</option><option value="review-request">review-req</option><option value="review-response">review-res</option><option value="decision">decision</option><option value="standup">standup</option></select>';
  main += '<input id="collabContent" placeholder="Type a message..." onkeydown="if(event.key===\\'Enter\\')sendCollabMessage()">';
  main += '<button class="btn btn-primary" onclick="sendCollabMessage()">Send</button>';
  main += '</div></div>';
  
  document.getElementById('collab').innerHTML = '<div class="collab-layout">' + sidebar + main + '</div>';
  loadCollabMessages(collabCurrentChannel);
}

function renderCollabMessages() {
  const el = document.getElementById('collabMessages');
  if (!el) return;
  if (!collabMessages.length) {
    el.innerHTML = '<div class="empty">No messages yet</div>';
    return;
  }
  let html = '';
  for (const m of collabMessages) {
    html += '<div class="collab-msg">';
    html += '<div class="msg-header">';
    html += '<span class="msg-agent">@' + esc(m.from) + '</span>';
    html += '<span class="msg-time">' + esc(m.ts.slice(0, 16).replace('T', ' ')) + '</span>';
    if (m.type !== 'message') html += '<span class="msg-type">' + esc(m.type) + '</span>';
    if (m.reply_to) html += '<span class="msg-reply">↩ ' + esc(m.reply_to.slice(-15)) + '</span>';
    html += '</div>';
    html += '<div class="msg-content">' + esc(m.content) + '</div>';
    if (m.refs && m.refs.length) html += '<div class="msg-refs">refs: ' + m.refs.map(r => esc(r)).join(', ') + '</div>';
    html += '</div>';
  }
  el.innerHTML = html;
  el.scrollTop = el.scrollHeight;
}

async function sendCollabMessage() {
  const content = document.getElementById('collabContent').value.trim();
  if (!content) return;
  const agent = document.getElementById('collabAgent').value.trim() || 'human';
  const type = document.getElementById('collabType').value;
  try {
    await api('/api/collab/post?' + p(currentProject), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: collabCurrentChannel, from: agent, content, type })
    });
    document.getElementById('collabContent').value = '';
    await loadCollabMessages(collabCurrentChannel);
  } catch (e) {
    toast('Failed to send message', true);
  }
}

async function loadHarness() {
  if (!currentProject) return;
  try {
    const data = await api('/api/harness?' + p(currentProject));
    renderHarness(data);
  } catch { document.getElementById('harness').innerHTML = '<div class="empty">Failed to load harness</div>'; }
}

function renderHarness(data) {
  if (!data.exists) {
    document.getElementById('harness').innerHTML = '<div class="empty">No Harness configured. Initialize with: agenthive harness init</div>';
    return;
  }
  const h = data.harness;
  let html = '<div class="section"><h2>Harness</h2>';

  // Conventions
  html += '<div class="harness-section"><h3>Conventions (' + (h.conventions?.length || 0) + ')</h3>';
  if (h.conventions?.length) {
    for (const c of h.conventions) {
      html += '<div class="harness-item"><div class="item-name">' + esc(c.name) + '</div>';
      html += '<div class="item-content">' + esc((c.content || '').slice(0, 300)) + '</div></div>';
    }
  } else { html += '<div class="empty">No conventions</div>'; }
  html += '</div>';

  // Prompts
  const promptKeys = Object.keys(h.prompts || {});
  html += '<div class="harness-section"><h3>Prompts (' + promptKeys.length + ')</h3>';
  if (promptKeys.length) {
    for (const key of promptKeys) {
      html += '<div class="harness-item"><div class="item-name">' + esc(key) + '</div>';
      html += '<div class="item-content">' + esc(h.prompts[key].path || '') + '</div></div>';
    }
  } else { html += '<div class="empty">No prompts</div>'; }
  html += '</div>';

  // Skills
  html += '<div class="harness-section"><h3>Skills (' + (h.skills?.length || 0) + ')</h3>';
  if (h.skills?.length) {
    for (const s of h.skills) {
      html += '<div class="harness-item"><div class="item-name">' + esc(s.name) + '</div></div>';
    }
  } else { html += '<div class="empty">No skills</div>'; }
  html += '</div>';

  // Inject into
  html += '<div class="harness-section"><h3>Inject Into</h3>';
  const injectInto = h.manifest?.inject_into || {};
  for (const [rt, enabled] of Object.entries(injectInto)) {
    html += '<div class="harness-item"><span class="item-name">' + (enabled ? '✓' : '✗') + ' ' + esc(rt) + '</span></div>';
  }
  html += '</div>';

  html += '</div>';
  document.getElementById('harness').innerHTML = html;
}

async function loadSync() {
  if (!currentProject) return;
  try {
    const data = await api('/api/sync/status?' + p(currentProject));
    renderSync(data);
  } catch { document.getElementById('sync').innerHTML = '<div class="empty">Failed to load sync status</div>'; }
}

function renderSync(data) {
  if (!data.exists) {
    document.getElementById('sync').innerHTML = '<div class="empty">No GitHub Sync configured. Initialize with: agenthive sync init</div>';
    return;
  }
  const s = data.status;
  let html = '<div class="section"><h2>GitHub Sync</h2>';

  // Status cards
  html += '<div class="stats" style="margin-bottom:16px">';
  html += '<div class="stat-card"><div class="label">Repository</div><div class="value blue">' + esc(s.config?.repo || 'Not set') + '</div></div>';
  html += '<div class="stat-card"><div class="label">Mode</div><div class="value">' + esc(s.config?.sync_mode || '') + '</div></div>';
  html += '<div class="stat-card"><div class="label">Last Sync</div><div class="value">' + esc(s.last_sync ? s.last_sync.slice(0, 16).replace('T', ' ') : 'Never') + '</div></div>';
  html += '<div class="stat-card"><div class="label">Issues</div><div class="value green">' + (s.issue_mappings?.length || 0) + '</div></div>';
  html += '<div class="stat-card"><div class="label">PRs</div><div class="value purple">' + (s.pr_mappings?.length || 0) + '</div></div>';
  html += '</div>';

  // Issue mappings
  html += '<h3 style="font-size:14px;color:#58a6ff;margin-bottom:8px">Issue Mappings</h3>';
  if (s.issue_mappings?.length) {
    html += '<ul class="sync-mappings">';
    for (const m of s.issue_mappings) {
      html += '<li><span class="issue-num">#' + m.issue_number + '</span><span>' + esc(m.issue_title || '') + '</span><span class="task-ref">' + esc(m.task_id) + '</span></li>';
    }
    html += '</ul>';
  } else { html += '<div class="empty">No issues synced</div>'; }

  // PR mappings
  html += '<h3 style="font-size:14px;color:#58a6ff;margin:16px 0 8px">PR Mappings</h3>';
  if (s.pr_mappings?.length) {
    html += '<ul class="sync-mappings">';
    for (const m of s.pr_mappings) {
      html += '<li><span class="issue-num">PR#' + m.pr_number + '</span><span class="task-ref">' + esc(m.task_id) + ' [' + esc(m.status) + ']</span></li>';
    }
    html += '</ul>';
  } else { html += '<div class="empty">No PRs synced</div>'; }

  html += '</div>';
  document.getElementById('sync').innerHTML = html;
}

function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

async function loadProjectData() {
  if (!currentProject) return;
  const proj = allProjects.find(p=>p.slug===currentProject);
  const tasks = await api('/api/tasks?'+p(currentProject));
  renderStats(allProjects, tasks);
  renderBoard(tasks);
  renderAgents(proj);
  await Promise.all([renderLog(), renderDecisions(), renderThreads(), loadCollab(), loadHarness(), loadSync()]);
}

async function loadAll() {
  allProjects = await api('/api/projects');
  if (allProjects.length) {
    if (!currentProject || !allProjects.find(p=>p.slug===currentProject)) {
      currentProject = allProjects[0].slug;
    }
    renderProjectSelector(allProjects);
    await loadProjectData();
  } else {
    document.getElementById('stats').innerHTML = '<div class="empty">No projects registered. Use: agenthive project add &lt;path&gt;</div>';
  }
}

loadAll();
setInterval(loadAll, 15000);
</script>
</body>
</html>`;
}
