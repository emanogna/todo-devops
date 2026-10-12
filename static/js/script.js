const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

let tasks = [];
let filter = "all";
let search = "";
let sortBy = "newest";
let editingId = null;
let deleteId = null;

const TITLES = {
  all: "All Tasks", pending: "My Tasks (Pending)", today: "Today", upcoming: "Upcoming",
  completed: "Completed", high: "High Priority",
  "cat:Personal": "Personal", "cat:College": "College", "cat:Work": "Work", "cat:Other": "Other",
};
const QUOTES = [
  "Small steps every day lead to big results.",
  "Done is better than perfect.",
  "Focus on progress, not perfection.",
  "You don't have to be great to start, but you have to start.",
  "One task at a time. You've got this!",
];

// ---------- helpers ----------
const pad = (n) => String(n).padStart(2, "0");
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function esc(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
function formatDate(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
const isOverdue = (t) => !t.completed && t.due_date && t.due_date < todayStr();

function toast(msg, isError = false) {
  const el = document.createElement("div");
  el.className = "toast" + (isError ? " error" : "");
  el.textContent = msg;
  $("#toasts").appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

async function api(url, method = "GET", body) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data;
}

async function loadTasks() {
  try {
    tasks = await api("/api/tasks");
  } catch (e) {
    toast(e.message, true);
  }
  render();
}

// ---------- filtering ----------
function matches(t) {
  const today = todayStr();
  if (filter === "pending") return !t.completed;
  if (filter === "completed") return t.completed;
  if (filter === "today") return t.due_date === today;
  if (filter === "upcoming") return !t.completed && t.due_date > today;
  if (filter === "high") return t.priority === "High";
  if (filter.startsWith("cat:")) return t.category === filter.slice(4);
  return true;
}

function visibleTasks() {
  const rank = { High: 0, Medium: 1, Low: 2 };
  const list = tasks.filter(
    (t) => matches(t) && t.title.toLowerCase().includes(search.toLowerCase())
  );
  if (sortBy === "due") {
    list.sort((a, b) => (a.due_date || "9999").localeCompare(b.due_date || "9999"));
  } else if (sortBy === "priority") {
    list.sort((a, b) => rank[a.priority] - rank[b.priority]);
  }
  return list; // "newest" keeps the order sent by the server
}

// ---------- rendering ----------
function renderStats() {
  const total = tasks.length;
  const done = tasks.filter((t) => t.completed).length;
  const overdue = tasks.filter(isOverdue).length;
  $("#statTotal").textContent = total;
  $("#statDone").textContent = done;
  $("#statPending").textContent = total - done;
  $("#statOver").textContent = overdue;

  const pct = total ? Math.round((done / total) * 100) : 0;
  $("#percent").textContent = pct + "%";
  $("#barFill").style.width = pct + "%";

  const today = todayStr();
  const dueToday = tasks.filter((t) => t.due_date === today);
  const doneToday = dueToday.filter((t) => t.completed).length;
  $("#summary").textContent = dueToday.length
    ? `Today: ${doneToday} of ${dueToday.length} due tasks completed.`
    : "No tasks due today. Enjoy your free time or plan ahead!";

  $("#bellDot").hidden = overdue === 0;
}

function taskHTML(t) {
  const due = t.due_date
    ? `<span class="due ${isOverdue(t) ? "overdue" : ""}"><i class="fa-regular fa-calendar"></i> ${formatDate(t.due_date)}${isOverdue(t) ? " (overdue)" : ""}</span>`
    : "";
  return `
    <div class="task p-${t.priority} ${t.completed ? "done" : ""}" data-id="${t.id}">
      <button class="check" data-action="toggle" title="Mark complete">${t.completed ? '<i class="fa-solid fa-check"></i>' : ""}</button>
      <div class="task-body">
        <div class="task-title">${esc(t.title)}</div>
        ${t.description ? `<div class="task-desc">${esc(t.description)}</div>` : ""}
        <div class="meta">
          <span class="badge b-${t.priority}">${t.priority}</span>
          <span class="badge b-cat">${esc(t.category)}</span>
          ${due}
        </div>
      </div>
      <div class="task-actions">
        <button class="edit" data-action="edit" title="Edit"><i class="fa-solid fa-pen"></i></button>
        <button class="del" data-action="delete" title="Delete"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>`;
}

function render() {
  renderStats();
  $("#listTitle").textContent = TITLES[filter] || "Tasks";
  $$("[data-filter]").forEach((b) => b.classList.toggle("active", b.dataset.filter === filter));

  const list = visibleTasks();
  if (list.length === 0) {
    const noTasksAtAll = tasks.length === 0;
    $("#taskList").innerHTML = `
      <div class="empty">
        <i class="fa-solid fa-clipboard-check"></i>
        <h3>${noTasksAtAll ? "No tasks yet" : "Nothing here"}</h3>
        <p>${noTasksAtAll ? "Create your first task and start being productive!" : "No tasks match this view or search."}</p>
        <button class="btn-primary" data-action="new"><i class="fa-solid fa-plus"></i> Create ${noTasksAtAll ? "your first" : "a new"} task</button>
      </div>`;
  } else {
    $("#taskList").innerHTML = list.map(taskHTML).join("");
  }
}

// ---------- modal ----------
function openTaskModal(task) {
  editingId = task ? task.id : null;
  $("#modalTitle").textContent = task ? "Edit Task" : "New Task";
  $("#submitBtn").textContent = task ? "Save Changes" : "Add Task";
  $("#fTitle").value = task ? task.title : "";
  $("#fDesc").value = task ? task.description : "";
  $("#fDue").value = task ? task.due_date : "";
  $("#fPriority").value = task ? task.priority : "Medium";
  $("#fCategory").value = task ? task.category : "Personal";
  $("#formError").classList.remove("show");
  $("#taskModal").classList.add("open");
  $("#fTitle").focus();
}
const closeTaskModal = () => $("#taskModal").classList.remove("open");

$("#taskForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const body = {
    title: $("#fTitle").value.trim(),
    description: $("#fDesc").value.trim(),
    due_date: $("#fDue").value,
    priority: $("#fPriority").value,
    category: $("#fCategory").value,
  };
  if (!body.title) {
    $("#formError").textContent = "Oops! Please enter a task title.";
    $("#formError").classList.add("show");
    return;
  }
  try {
    if (editingId) {
      await api(`/api/tasks/${editingId}`, "PUT", body);
      toast("Task updated ✏️");
    } else {
      await api("/api/tasks", "POST", body);
      toast("Task added ✅");
    }
    closeTaskModal();
    await loadTasks();
  } catch (err) {
    $("#formError").textContent = err.message;
    $("#formError").classList.add("show");
  }
});

// ---------- task actions (click handling) ----------
document.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const card = btn.closest(".task");
  const id = card ? Number(card.dataset.id) : null;

  try {
    if (btn.dataset.action === "new") openTaskModal();
    if (btn.dataset.action === "edit") openTaskModal(tasks.find((t) => t.id === id));
    if (btn.dataset.action === "delete") {
      deleteId = id;
      $("#deleteModal").classList.add("open");
    }
    if (btn.dataset.action === "toggle") {
      const t = await api(`/api/tasks/${id}/toggle`, "POST");
      toast(t.completed ? "Task completed 🎉" : "Task marked pending");
      await loadTasks();
    }
  } catch (err) {
    toast(err.message, true);
  }
});

$("#delCancel").onclick = () => $("#deleteModal").classList.remove("open");
$("#delConfirm").onclick = async () => {
  try {
    await api(`/api/tasks/${deleteId}`, "DELETE");
    toast("Task deleted 🗑️");
  } catch (err) {
    toast(err.message, true);
  }
  $("#deleteModal").classList.remove("open");
  await loadTasks();
};

// ---------- navigation, filters, search, sort ----------
$$("[data-filter]").forEach((b) =>
  b.addEventListener("click", () => {
    filter = b.dataset.filter;
    $("#sidebar").classList.remove("open");
    render();
  })
);
$("#search").addEventListener("input", (e) => { search = e.target.value; render(); });
$("#sort").addEventListener("change", (e) => { sortBy = e.target.value; render(); });
$("#newTaskBtn").onclick = () => openTaskModal();
$("#cancelBtn").onclick = closeTaskModal;
$("#menuBtn").onclick = () => $("#sidebar").classList.toggle("open");
$("#bell").onclick = () => {
  const n = tasks.filter(isOverdue).length;
  toast(n ? `You have ${n} overdue task${n > 1 ? "s" : ""} ⚠️` : "You're all caught up! 🎉");
};

// close modals with Escape or by clicking the dark background
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") $$(".backdrop").forEach((b) => b.classList.remove("open"));
});
$$(".backdrop").forEach((b) =>
  b.addEventListener("mousedown", (e) => { if (e.target === b) b.classList.remove("open"); })
);

// ---------- dark mode ----------
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $("#themeBtn").innerHTML = theme === "dark" ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
  try { localStorage.setItem("theme", theme); } catch (e) {}
}
$("#themeBtn").onclick = () =>
  applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
let savedTheme = "light";
try { savedTheme = localStorage.getItem("theme") || "light"; } catch (e) {}
applyTheme(savedTheme);

// ---------- greeting, date, quotes ----------
const hour = new Date().getHours();
$("#greeting").textContent =
  (hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening") + "! 👋";
$("#today-date").textContent =
  "· " + new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

function newQuote() {
  $("#quote").textContent = "💡 " + QUOTES[Math.floor(Math.random() * QUOTES.length)];
}
newQuote();
setInterval(newQuote, 20000);

loadTasks();