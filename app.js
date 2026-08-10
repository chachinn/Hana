/* =====================================================
   HANA 🌸 v1.3
   Custom Spaces + Checklists + Trackers + Appearance
   Local-first PWA
   ===================================================== */

const STORAGE_KEY = "hana_app_v1";

const createId = () => {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
};

function localDateISO(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const todayISO = () => localDateISO(new Date());

function addDaysISO(dateString, days) {
  const base = dateString ? new Date(`${dateString}T12:00:00`) : new Date();
  base.setDate(base.getDate() + Number(days || 0));
  return localDateISO(base);
}

function nextWorkdayISO(from = new Date()) {
  const d = new Date(from);
  do { d.setDate(d.getDate() + 1); } while ([0, 6].includes(d.getDay()));
  return localDateISO(d);
}

function clone(value) {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

const DEFAULT_SPACES = [
  { id: "personal", name: "Personal", emoji: "🎀", protected: true },
  { id: "work", name: "Work", emoji: "💼", protected: true },
  { id: "home", name: "Home", emoji: "🏠", protected: false },
  { id: "errands", name: "Errands", emoji: "🛍️", protected: false },
  { id: "wellness", name: "Wellness", emoji: "🌿", protected: false }
];

const LIST_TEMPLATES = {
  grocery: { name: "Groceries", icon: "🛒", items: ["Produce", "Protein", "Pantry", "Drinks", "Household"] },
  buy: { name: "Things to Buy", icon: "🛍️", items: ["Item to buy"] },
  packing: { name: "Packing List", icon: "🧳", items: ["Documents", "Clothes", "Toiletries", "Chargers", "Medicine"] },
  errands: { name: "Errands", icon: "🚶", items: ["First errand"] },
  simple: { name: "Checklist", icon: "☑️", items: ["First item"] }
};

const THEME_LABELS = {
  peach: "Peach Pink",
  sakura: "Sakura Pink",
  lavender: "Lavender Purple",
  sky: "Sky Blue",
  mint: "Mint Green",
  yellow: "Soft Yellow"
};


const STARTER_TEMPLATES = [
  {
    id: "weekly-review",
    icon: "🌸",
    title: "Weekly Review",
    description: "A recurring work review with a short checklist.",
    kind: "task"
  },
  {
    id: "monthly-life-admin",
    icon: "🏡",
    title: "Monthly Life Admin",
    description: "Recurring personal admin for bills, documents and loose ends.",
    kind: "task"
  },
  {
    id: "meeting-note",
    icon: "👥",
    title: "Meeting Notes",
    description: "Agenda + decisions + action items that can become tasks.",
    kind: "note"
  },
  {
    id: "grocery-list",
    icon: "🛒",
    title: "Grocery List",
    description: "A resettable checklist you can use again and again.",
    kind: "note"
  },
  {
    id: "packing-list",
    icon: "🧳",
    title: "Packing List",
    description: "A reusable personal packing checklist.",
    kind: "note"
  },
  {
    id: "work-deliverables",
    icon: "💼",
    title: "Work Deliverables",
    description: "A Living Table for owner, due date, status and completion.",
    kind: "table"
  },
  {
    id: "bills-tracker",
    icon: "💳",
    title: "Bills Tracker",
    description: "A Living Table for amount, due date and paid status.",
    kind: "table"
  },
  {
    id: "weekly-reset",
    icon: "🌷",
    title: "Weekly Reset",
    description: "A gentle reset checklist for home and personal planning.",
    kind: "note"
  }
];

const defaultState = {
  currentPage: "today",
  currentMode: "all",
  taskFilter: "all",
  taskProjectFilter: "all",
  taskSearch: "",
  activeTableId: "",
  activeListId: "",
  spaces: clone(DEFAULT_SPACES),
  lists: [],
  appearance: {
    theme: "sakura",
    wallpaperEnabled: false,
    overlayStrength: "medium",
    wallpaperPosition: "center"
  },
  focusDate: todayISO(),
  focusTaskIds: [],
  todayViewMode: "plan",
  doTaskIndex: 0,
  timePocketMinutes: 30,
  timePocketEnergy: "any",

  settings: {
    dailyCapacityMinutes: 240,
    overloadGuardrail: true,
    workFirewallEnabled: false,
    workStart: "08:00",
    workEnd: "18:00",
    workDays: [1, 2, 3, 4, 5],
    allowHighPriorityWorkReminders: true,
    defaultSpace: "personal"
  },

  tasks: [
    {
      id: createId(),
      title: "Review this week's priorities",
      space: "work",
      priority: "high",
      status: "todo",
      project: "",
      tags: [],
      dueDate: todayISO(),
      dueTime: "",
      durationMinutes: 30,
      energy: "medium",
      deadlineType: "soft",
      notes: "",
      link: "",
      subtasks: [],
      waitingOn: "",
      followUpDate: "",
      followUpAfterCompletion: false,
      reminderEnabled: false,
      reminderChain: false,
      recurrence: { type: "none", interval: 1 },
      completed: false,
      createdAt: Date.now()
    }
  ],

  notes: [
    {
      id: createId(),
      title: "Welcome to Hana 🌸",
      type: "note",
      content: "Hana keeps tasks, notes, reminders and little pieces of life together without showing you everything at once.",
      space: "personal",
      tags: ["hana"],
      checklist: [],
      resettable: false,
      pinned: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  ],

  reminders: [],

  tables: [
    {
      id: createId(),
      name: "Bills",
      space: "personal",
      columns: [
        { id: "item", name: "Item", type: "text" },
        { id: "amount", name: "Amount", type: "money" },
        { id: "due", name: "Due", type: "date" },
        { id: "status", name: "Status", type: "status" },
        { id: "paid", name: "Paid", type: "checkbox" }
      ],
      rows: [],
      createdAt: Date.now()
    }
  ],

  pins: [],
  someday: [],
  inbox: [],
  trash: [],
  dailyCloseHistory: []
};

function normalizeTask(task = {}) {
  const recurrence = task.recurrence || (
    task.rolling
      ? { type: "afterCompletion", interval: Number(task.repeatDays || 7) }
      : { type: "none", interval: 1 }
  );

  return {
    id: task.id || createId(),
    title: String(task.title || "Untitled task"),
    space: String(task.space || "personal"),
    priority: ["low", "medium", "high"].includes(task.priority) ? task.priority : "medium",
    status: ["todo", "doing", "waiting", "blocked", "done"].includes(task.status) ? task.status : "todo",
    project: String(task.project || ""),
    tags: Array.isArray(task.tags) ? task.tags.map(String) : [],
    dueDate: task.dueDate || "",
    dueTime: task.dueTime || "",
    durationMinutes: Math.max(0, Number(task.durationMinutes || 0)),
    energy: ["low", "medium", "high"].includes(task.energy) ? task.energy : "medium",
    deadlineType: task.deadlineType === "hard" ? "hard" : "soft",
    rescheduleCount: Math.max(0, Number(task.rescheduleCount || 0)),
    notes: String(task.notes || ""),
    link: String(task.link || ""),
    subtasks: Array.isArray(task.subtasks)
      ? task.subtasks.map(item => ({ id: item.id || createId(), title: String(item.title || ""), completed: Boolean(item.completed) })).filter(item => item.title)
      : [],
    waitingOn: String(task.waitingOn || ""),
    followUpDate: task.followUpDate || "",
    followUpAfterCompletion: Boolean(task.followUpAfterCompletion),
    reminderEnabled: Boolean(task.reminderEnabled),
    reminderChain: Boolean(task.reminderChain),
    recurrence: {
      type: ["none", "daily", "weekdays", "weekly", "monthly", "custom", "afterCompletion", "selectedWeekdays"].includes(recurrence?.type) ? recurrence.type : "none",
      interval: Math.max(1, Number(recurrence?.interval || 1)),
      weekdays: Array.isArray(recurrence?.weekdays)
        ? [...new Set(recurrence.weekdays.map(Number).filter(day => day >= 0 && day <= 6))]
        : []
    },
    completed: Boolean(task.completed || task.status === "done"),
    completedDate: task.completedDate || null,
    createdAt: Number(task.createdAt || Date.now()),
    updatedAt: Number(task.updatedAt || task.createdAt || Date.now())
  };
}

function normalizeNote(note = {}) {
  return {
    id: note.id || createId(),
    title: String(note.title || "Untitled note"),
    type: ["note", "checklist", "meeting"].includes(note.type) ? note.type : "note",
    content: String(note.content || ""),
    space: String(note.space || "personal"),
    tags: Array.isArray(note.tags) ? note.tags.map(String) : [],
    checklist: Array.isArray(note.checklist)
      ? note.checklist.map(item => ({ id: item.id || createId(), title: String(item.title || ""), completed: Boolean(item.completed) })).filter(item => item.title)
      : [],
    resettable: Boolean(note.resettable),
    pinned: Boolean(note.pinned),
    createdAt: Number(note.createdAt || Date.now()),
    updatedAt: Number(note.updatedAt || note.createdAt || Date.now())
  };
}

function normalizeReminder(reminder = {}) {
  const repeatType = reminder.repeatType || reminder.repeat || "none";
  return {
    id: reminder.id || createId(),
    title: String(reminder.title || "Reminder"),
    space: String(reminder.space || "personal"),
    date: reminder.date || "",
    time: reminder.time || "09:00",
    repeatType: ["none", "daily", "weekdays", "weekly", "monthly", "custom"].includes(repeatType) ? repeatType : "none",
    repeatInterval: Math.max(1, Number(reminder.repeatInterval || 1)),
    completed: Boolean(reminder.completed),
    notified: Boolean(reminder.notified),
    chainEnabled: Boolean(reminder.chainEnabled),
    chainNotified: Array.isArray(reminder.chainNotified) ? reminder.chainNotified : [],
    linkedTaskId: reminder.linkedTaskId || "",
    linkedTableId: reminder.linkedTableId || "",
    linkedRowId: reminder.linkedRowId || "",
    createdAt: Number(reminder.createdAt || Date.now()),
    updatedAt: Number(reminder.updatedAt || reminder.createdAt || Date.now())
  };
}

function normalizeTable(table = {}) {
  const cols = Array.isArray(table.columns) && table.columns.length
    ? table.columns.map(col => ({ id: col.id || createId(), name: String(col.name || "Column"), type: validColumnType(col.type) }))
    : [{ id: createId(), name: "Item", type: "text" }];

  return {
    id: table.id || createId(),
    name: String(table.name || "Untitled table"),
    space: String(table.space || "personal"),
    columns: cols,
    rows: Array.isArray(table.rows)
      ? table.rows.map(row => ({ id: row.id || createId(), values: row.values || {}, createdAt: Number(row.createdAt || Date.now()) }))
      : [],
    createdAt: Number(table.createdAt || Date.now())
  };
}

function validColumnType(type) {
  const types = ["text", "number", "progress", "date", "checkbox", "status", "money", "tag", "link", "reminder"];
  return types.includes(type) ? type : "text";
}

function normalizeList(list = {}) {
  return {
    id: list.id || createId(),
    name: String(list.name || "Checklist"),
    icon: String(list.icon || "☑️").slice(0, 4),
    space: String(list.space || "personal"),
    items: Array.isArray(list.items)
      ? list.items.map(item => ({
          id: item.id || createId(),
          title: String(item.title || ""),
          detail: String(item.detail || ""),
          completed: Boolean(item.completed),
          createdAt: Number(item.createdAt || Date.now()),
          updatedAt: Number(item.updatedAt || item.createdAt || Date.now())
        })).filter(item => item.title)
      : [],
    createdAt: Number(list.createdAt || Date.now()),
    updatedAt: Number(list.updatedAt || list.createdAt || Date.now())
  };
}

function normalizeSpace(space = {}) {
  const id = String(space.id || "").trim() || `space-${createId()}`;
  return {
    id,
    name: String(space.name || "Space").trim() || "Space",
    emoji: String(space.emoji || "🌸").trim().slice(0, 4) || "🌸",
    protected: Boolean(space.protected || ["personal", "work"].includes(id))
  };
}

function normalizeState(data = {}) {
  const base = clone(defaultState);
  const migratedTables = Array.isArray(data.tables)
    ? data.tables
    : migrateLegacyTableRows(data.tableRows);

  const normalized = {
    ...base,
    ...data,
    settings: { ...base.settings, ...(data.settings || {}) },
    spaces: (Array.isArray(data.spaces) && data.spaces.length ? data.spaces : base.spaces).map(normalizeSpace),
    lists: (Array.isArray(data.lists) ? data.lists : base.lists).map(normalizeList),
    appearance: { ...base.appearance, ...(data.appearance || {}) },
    tasks: (Array.isArray(data.tasks) ? data.tasks : base.tasks).map(normalizeTask),
    notes: (Array.isArray(data.notes) ? data.notes : base.notes).map(normalizeNote),
    reminders: (Array.isArray(data.reminders) ? data.reminders : base.reminders).map(normalizeReminder),
    tables: (migratedTables?.length ? migratedTables : base.tables).map(normalizeTable),
    pins: Array.isArray(data.pins) ? data.pins : base.pins,
    someday: Array.isArray(data.someday) ? data.someday : base.someday,
    inbox: Array.isArray(data.inbox) ? data.inbox : [],
    trash: Array.isArray(data.trash) ? data.trash.filter(entry => Number(entry.deletedAt || 0) > Date.now() - (30 * 24 * 60 * 60 * 1000)) : [],
    focusTaskIds: Array.isArray(data.focusTaskIds) ? data.focusTaskIds : [],
    activeListId: data.activeListId || "",
    focusDate: data.focusDate || todayISO(),
    todayViewMode: data.todayViewMode === "do" ? "do" : "plan",
    doTaskIndex: Math.max(0, Number(data.doTaskIndex || 0)),
    timePocketMinutes: [10, 15, 30, 45, 60, 90].includes(Number(data.timePocketMinutes)) ? Number(data.timePocketMinutes) : 30,
    timePocketEnergy: ["any", "low", "medium", "high"].includes(data.timePocketEnergy) ? data.timePocketEnergy : "any",
    dailyCloseHistory: Array.isArray(data.dailyCloseHistory) ? data.dailyCloseHistory : []
  };

  const requiredSpaces = DEFAULT_SPACES.filter(space => ["personal", "work"].includes(space.id));
  requiredSpaces.forEach(required => {
    if (!normalized.spaces.some(space => space.id === required.id)) normalized.spaces.push(clone(required));
  });
  const validSpaceIds = new Set(normalized.spaces.map(space => space.id));
  const fallbackSpace = validSpaceIds.has(normalized.settings.defaultSpace) ? normalized.settings.defaultSpace : "personal";
  normalized.settings.defaultSpace = fallbackSpace;
  [normalized.tasks, normalized.notes, normalized.reminders, normalized.tables, normalized.lists, normalized.pins, normalized.inbox].forEach(collection => {
    collection.forEach(item => { if (item && !validSpaceIds.has(item.space)) item.space = fallbackSpace; });
  });
  if (!normalized.activeTableId && normalized.tables[0]) normalized.activeTableId = normalized.tables[0].id;
  if (!normalized.activeListId && normalized.lists[0]) normalized.activeListId = normalized.lists[0].id;
  if (normalized.currentMode !== "all" && !validSpaceIds.has(normalized.currentMode)) normalized.currentMode = "all";
  if (!Object.prototype.hasOwnProperty.call(THEME_LABELS, normalized.appearance.theme)) normalized.appearance.theme = "sakura";
  if (!["light", "medium", "strong"].includes(normalized.appearance.overlayStrength)) normalized.appearance.overlayStrength = "medium";
  if (!["top", "center", "bottom"].includes(normalized.appearance.wallpaperPosition)) normalized.appearance.wallpaperPosition = "center";
  return normalized;
}

function migrateLegacyTableRows(rows) {
  if (!Array.isArray(rows) || !rows.length) return null;
  return [{
    id: createId(),
    name: "Bills",
    space: "personal",
    columns: [
      { id: "item", name: "Item", type: "text" },
      { id: "amount", name: "Amount", type: "money" },
      { id: "due", name: "Due", type: "date" },
      { id: "status", name: "Status", type: "status" }
    ],
    rows: rows.map(row => ({
      id: row.id || createId(),
      values: { item: row.item || "", amount: row.amount || 0, due: row.dueDate || "", status: row.status || "upcoming" },
      createdAt: row.createdAt || Date.now()
    })),
    createdAt: Date.now()
  }];
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return normalizeState(clone(defaultState));
  try { return normalizeState(JSON.parse(raw)); }
  catch (error) {
    console.error("Unable to load Hana data:", error);
    return normalizeState(clone(defaultState));
  }
}

let state = loadState();

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(dateString) {
  if (!dateString) return "No date";
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatFullDate(dateString) {
  if (!dateString) return "";
  return new Date(`${dateString}T00:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function formatLongToday() {
  return new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

function formatTime(time) {
  if (!time) return "";
  const [h, m] = time.split(":");
  const d = new Date(); d.setHours(Number(h), Number(m), 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function formatCurrency(value) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "PHP", maximumFractionDigits: 2 }).format(Number(value || 0));
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function getSpace(spaceId) {
  return state.spaces.find(space => space.id === spaceId) || state.spaces.find(space => space.id === "personal") || DEFAULT_SPACES[0];
}
function modeLabel(spaceId) { const space=getSpace(spaceId); return `${space.emoji} ${space.name}`; }
function modeBadge(spaceId) { return spaceId === "work" ? "badge-work" : spaceId === "personal" ? "badge-personal" : "badge-custom"; }
function spaceOptionsHTML(selected = preferredSpace(), suffix = "") {
  return state.spaces.map(space => `<option value="${escapeHTML(space.id)}" ${space.id===selected?"selected":""}>${escapeHTML(space.emoji)} ${escapeHTML(space.name)}${suffix}</option>`).join("");
}
function refreshSpaceSelects() {
  document.querySelectorAll("[data-space-select]").forEach(select => {
    const current = select.value || preferredSpace();
    select.innerHTML = spaceOptionsHTML(current);
    if (state.spaces.some(space => space.id === current)) select.value = current;
  });
}
function renderModeBar() {
  const bar = document.getElementById("modeBar");
  if (!bar) return;
  bar.innerHTML = `<button class="mode-button ${state.currentMode==="all"?"active":""}" data-mode="all">🌸 All</button>${state.spaces.map(space=>`<button class="mode-button ${state.currentMode===space.id?"active":""}" data-mode="${escapeHTML(space.id)}">${escapeHTML(space.emoji)} ${escapeHTML(space.name)}</button>`).join("")}`;
}
function statusLabel(status) { return ({ todo:"To Do", doing:"Doing", waiting:"Waiting", blocked:"Blocked", done:"Done" })[status] || status; }

function formatDuration(minutes) {
  const value = Math.max(0, Number(minutes || 0));
  if (!value) return "No estimate";
  if (value < 60) return `${value}m`;
  const hours = Math.floor(value / 60);
  const mins = value % 60;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
}

function taskPlanningMinutes(task) {
  return Math.max(1, Number(task?.durationMinutes || 30));
}

function energyLabel(energy) {
  return ({ low:"🌿 Low", medium:"🌸 Medium", high:"⚡ High" })[energy] || "🌸 Medium";
}

function deadlineLabel(task) {
  if (!task?.dueDate) return "";
  return task.deadlineType === "hard" ? "🔒 Hard deadline" : "🪶 Soft date";
}

function priorityWeight(priority) {
  return ({ high:3, medium:2, low:1 })[priority] || 0;
}

function addMonthsClamped(dateString, months = 1) {
  const base = new Date(`${dateString || todayISO()}T12:00:00`);
  const originalDay = base.getDate();
  const target = new Date(base.getFullYear(), base.getMonth() + Number(months || 1), 1, 12, 0, 0);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0, 12, 0, 0).getDate();
  target.setDate(Math.min(originalDay, lastDay));
  return localDateISO(target);
}

function nextSelectedWeekdayISO(dateString, weekdays = []) {
  const allowed = new Set((weekdays || []).map(Number));
  const base = new Date(`${dateString || todayISO()}T12:00:00`);
  if (!allowed.size) allowed.add(base.getDay());
  for (let i = 1; i <= 14; i += 1) {
    const next = new Date(base);
    next.setDate(base.getDate() + i);
    if (allowed.has(next.getDay())) return localDateISO(next);
  }
  return addDaysISO(dateString || todayISO(), 7);
}

function focusTasksVisible() {
  return state.focusTaskIds
    .map(id => state.tasks.find(task => task.id === id))
    .filter(task => task && !task.completed && (!firewallIsActive() || task.space !== "work"));
}

function capacitySnapshot(tasks = focusTasksVisible()) {
  const capacity = Math.max(30, Number(state.settings.dailyCapacityMinutes || 240));
  const minutes = tasks.reduce((sum, task) => sum + taskPlanningMinutes(task), 0);
  const ratio = capacity ? minutes / capacity : 0;
  const level = ratio > 1 ? "overflow" : ratio >= 0.85 ? "full" : ratio >= 0.55 ? "steady" : "light";
  return { capacity, minutes, ratio, level, remaining: Math.max(0, capacity - minutes), over: Math.max(0, minutes - capacity) };
}

function capacityLabel(level) {
  return ({ light:"Light", steady:"Comfortable", full:"Nearly full", overflow:"Overflowing" })[level] || "Light";
}

function recurrenceLabel(task) {
  const rec = task?.recurrence || { type:"none" };
  if (rec.type === "selectedWeekdays") {
    const labels = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const days = (rec.weekdays || []).map(day => labels[Number(day)]).filter(Boolean);
    return days.length ? `🔁 ${days.join(", ")}` : "🔁 Selected days";
  }
  if (rec.type === "afterCompletion") return `🔁 ${rec.interval}d after done`;
  if (rec.type === "custom") return `🔁 Every ${rec.interval}d`;
  return rec.type !== "none" ? `🔁 ${rec.type}` : "";
}

function isWorkTime(now = new Date()) {
  const s = state.settings;
  if (!s.workDays.includes(now.getDay())) return false;
  const minutes = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = s.workStart.split(":").map(Number);
  const [eh, em] = s.workEnd.split(":").map(Number);
  return minutes >= sh * 60 + sm && minutes <= eh * 60 + em;
}

function firewallIsActive() {
  return Boolean(state.settings.workFirewallEnabled && !isWorkTime() && state.currentMode !== "work");
}

function filterByMode(items, { respectFirewall = true } = {}) {
  let result = items;
  if (state.currentMode !== "all") result = result.filter(item => item.space === state.currentMode);
  if (respectFirewall && firewallIsActive()) result = result.filter(item => item.space !== "work");
  return result;
}

function preferredSpace() {
  if (state.currentMode !== "all" && state.spaces.some(space => space.id === state.currentMode)) return state.currentMode;
  return state.spaces.some(space => space.id === state.settings.defaultSpace) ? state.settings.defaultSpace : "personal";
}

let lastUndoAction = null;

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.remove("toast-action");
  toast.classList.remove("hidden");
  clearTimeout(window.hanaToastTimer);
  window.hanaToastTimer = setTimeout(() => {
    toast.classList.add("hidden");
    lastUndoAction = null;
  }, 2400);
}

function showUndoToast(message, undoAction) {
  const toast = document.getElementById("toast");
  lastUndoAction = undoAction;
  toast.classList.add("toast-action");
  toast.innerHTML = `<span>${escapeHTML(message)}</span><button type="button" data-undo-toast>Undo</button>`;
  toast.classList.remove("hidden");
  clearTimeout(window.hanaToastTimer);
  window.hanaToastTimer = setTimeout(() => {
    toast.classList.add("hidden");
    toast.classList.remove("toast-action");
    lastUndoAction = null;
  }, 6000);
}

function trashLabel(type) {
  return ({
    task: "Task",
    note: "Note",
    reminder: "Reminder",
    table: "Table",
    tableRow: "Table row",
    list: "Checklist",
    pin: "Pin",
    someday: "Someday item",
    inbox: "Inbox item"
  })[type] || "Item";
}

function moveToTrash(type, item, context = {}) {
  if (!item) return;
  const entry = {
    id: createId(),
    type,
    item: clone(item),
    context: clone(context),
    deletedAt: Date.now()
  };
  state.trash.unshift(entry);
  saveState();
  showUndoToast(`${trashLabel(type)} moved to Trash`, () => restoreTrashItem(entry.id, { quiet: true }));
}

function restoreTrashItem(entryId, options = {}) {
  const entry = state.trash.find(item => item.id === entryId);
  if (!entry) return false;
  const { type, item, context = {} } = entry;
  let restored = true;

  if (type === "task") {
    state.tasks.push(normalizeTask(item));
    (context.linkedReminders || []).forEach(reminder => state.reminders.push(normalizeReminder(reminder)));
  } else if (type === "note") {
    state.notes.push(normalizeNote(item));
  } else if (type === "reminder") {
    state.reminders.push(normalizeReminder(item));
  } else if (type === "table") {
    state.tables.push(normalizeTable(item));
    (context.linkedReminders || []).forEach(reminder => state.reminders.push(normalizeReminder(reminder)));
    state.activeTableId = item.id;
  } else if (type === "tableRow") {
    const table = state.tables.find(table => table.id === context.tableId);
    if (table) {
      table.rows.push(clone(item));
      (context.linkedReminders || []).forEach(reminder => state.reminders.push(normalizeReminder(reminder)));
      state.activeTableId = table.id;
    } else {
      restored = false;
    }
  } else if (type === "list") {
    state.lists.push(normalizeList(item));
    state.activeListId = item.id;
  } else if (type === "pin") {
    state.pins.push(clone(item));
  } else if (type === "someday") {
    state.someday.push(clone(item));
  } else if (type === "inbox") {
    state.inbox.push(clone(item));
  } else {
    restored = false;
  }

  if (!restored) {
    if (!options.quiet) showToast("Restore the parent table first.");
    return false;
  }

  state.trash = state.trash.filter(item => item.id !== entryId);
  saveState();
  if (!options.quiet) showToast(`${trashLabel(type)} restored 🌱`);
  render();
  return true;
}

function permanentlyDeleteTrashItem(entryId) {
  if (!confirm("Delete this item permanently? This cannot be undone.")) return;
  state.trash = state.trash.filter(item => item.id !== entryId);
  render();
}

function emptyTrash() {
  if (!state.trash.length) return;
  if (!confirm("Empty Trash permanently? This cannot be undone.")) return;
  state.trash = [];
  showToast("Trash emptied.");
  render();
}

function openModal(id) { document.getElementById(id)?.classList.remove("hidden"); }
function closeModal(id) { document.getElementById(id)?.classList.add("hidden"); }

function resetDailyFocusIfNeeded() {
  if (state.focusDate !== todayISO()) {
    state.focusDate = todayISO();
    state.focusTaskIds = [];
  }
}

function render() {
  resetDailyFocusIfNeeded();
  renderModeBar();
  refreshSpaceSelects();
  updateNavigation();

  switch (state.currentPage) {
    case "tasks": renderTasks(); break;
    case "notes": renderNotes(); break;
    case "tables": renderTables(); break;
    case "lists": renderLists(); break;
    case "reminders": renderReminders(); break;
    case "bloom": renderBloom(); break;
    case "pinboard": renderPinboard(); break;
    case "someday": renderSomeday(); break;
    case "daily-close": renderDailyClose(); break;
    case "inbox": renderInbox(); break;
    case "agenda": renderAgenda(); break;
    case "rescue": renderRescueDay(); break;
    case "time-pockets": renderTimePockets(); break;
    case "templates": renderTemplates(); break;
    case "history": renderHistory(); break;
    case "trash": renderTrash(); break;
    case "more": renderMore(); break;
    default: renderToday(); break;
  }
  saveState();
}

function changePage(page) {
  state.currentPage = page;
  window.scrollTo({ top: 0, behavior: "smooth" });
  render();
}

function updateNavigation() {
  document.querySelectorAll(".nav-button[data-page]").forEach(button => {
    button.classList.toggle("active", button.dataset.page === state.currentPage);
  });
}

function updateModeButtons() { renderModeBar(); }

/* ================= TODAY / HANA MORNING ================= */

function attentionItems() {
  const tasks = filterByMode(state.tasks).filter(t => !t.completed);
  const reminders = filterByMode(state.reminders).filter(r => !r.completed);
  const overdue = tasks.filter(t => t.dueDate && t.dueDate < todayISO()).slice(0, 2).map(t => ({ icon:"🔴", text:t.title }));
  const today = tasks.filter(t => t.dueDate === todayISO()).slice(0, 2).map(t => ({ icon:t.priority === "high" ? "🟠" : "🌸", text:t.title }));
  const nextReminder = reminders.filter(r => r.date >= todayISO()).sort((a,b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))[0];
  const list = [...overdue, ...today];
  if (nextReminder) list.push({ icon:"🔔", text:`${nextReminder.title} · ${formatDate(nextReminder.date)}` });
  return list.slice(0, 3);
}

function renderToday() {
  if (state.todayViewMode === "do") return renderDoMode();

  const container = document.getElementById("pageContent");
  const visibleTasks = filterByMode(state.tasks);
  const active = visibleTasks.filter(t => !t.completed);
  const completedToday = visibleTasks.filter(t => t.completedDate === todayISO()).length;
  const visibleReminders = filterByMode(state.reminders).filter(r => !r.completed && r.date === todayISO());
  const focusTasks = focusTasksVisible();
  const suggested = active.filter(t => !state.focusTaskIds.includes(t.id)).sort(taskSort).slice(0, 5);
  const attention = attentionItems();
  const focusTotal = focusTasks.length + completedToday;
  const progress = focusTotal ? Math.round((completedToday / focusTotal) * 100) : 0;
  const capacity = capacitySnapshot(focusTasks);
  const capacityWidth = Math.min(100, Math.round(capacity.ratio * 100));

  container.innerHTML = `
    <div class="day-mode-switch" role="group" aria-label="Today mode">
      <button class="day-mode-button active" data-today-view="plan">🌷 Plan</button>
      <button class="day-mode-button" data-today-view="do">▶ Do</button>
    </div>

    <section class="morning-card">
      <div class="morning-title">
        <div>
          <p class="eyebrow">HANA MORNING · ${escapeHTML(formatLongToday())}</p>
          <h1>${greeting()} 🌸</h1>
          <p style="margin:0;color:var(--text-soft);font-size:12px;">What matters, without showing you everything.</p>
        </div>
        <span style="font-size:36px;">🌷</span>
      </div>

      <div class="attention-list">
        ${attention.length ? attention.map(i => `<div class="attention-item"><span>${i.icon}</span><span>${escapeHTML(i.text)}</span></div>`).join("") : `<div class="attention-item"><span>🌿</span><span>Nothing urgent is asking for you.</span></div>`}
      </div>

      <div class="stat-grid">
        <div class="stat-card"><span class="stat-number">${active.length}</span><span class="stat-label">Active</span></div>
        <div class="stat-card"><span class="stat-number">${visibleReminders.length}</span><span class="stat-label">Reminders</span></div>
        <div class="stat-card"><span class="stat-number">${completedToday}</span><span class="stat-label">Blooms</span></div>
      </div>

      ${firewallIsActive() ? `<div class="firewall-banner">🌙 Work Firewall is active. Work items are hidden until your work window, unless you switch directly to Work.</div>` : ""}
    </section>

    <section class="capacity-card capacity-${capacity.level}">
      <div class="capacity-heading">
        <div><p class="eyebrow">BLOOM BUDGET</p><h2>${capacityLabel(capacity.level)}</h2></div>
        <strong>${formatDuration(capacity.minutes)} / ${formatDuration(capacity.capacity)}</strong>
      </div>
      <div class="capacity-track"><div class="capacity-fill" style="width:${capacityWidth}%"></div></div>
      <p>${capacity.over ? `You are ${formatDuration(capacity.over)} over your planned capacity.` : `${formatDuration(capacity.remaining)} of breathing room remains.`} Tasks without an estimate count as 30m.</p>
      <div class="capacity-actions">
        <button class="secondary-button" data-goto="time-pockets">⏱ Time Pockets</button>
        <button class="primary-button" data-goto="rescue">🛟 Rescue My Day</button>
      </div>
    </section>

    <section class="section">
      <div class="section-header"><h2>Today's Focus Bouquet</h2><button data-goto="bloom">Bloom View</button></div>
      <div class="bloom-count">🌸 ${completedToday} blooms today · ${focusTasks.length} still in your bouquet</div>
      <div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div>
      <div class="focus-grid" style="margin-top:11px;">
        ${focusTasks.length ? focusTasks.map(t => focusTaskRow(t, true)).join("") : `<div class="empty-state" style="padding:22px;"><div class="empty-icon">💐</div><h3>Choose a small bouquet</h3><p>Pick only the things you actually want in front of you today.</p></div>`}
      </div>
    </section>

    <section class="section">
      <div class="section-header"><h2>Add to today's bouquet</h2><button data-goto="tasks">All tasks</button></div>
      <div class="focus-grid">
        ${suggested.length ? suggested.map(t => focusTaskRow(t, false)).join("") : `<div class="card soft-card"><strong>Your garden is clear 🌸</strong></div>`}
      </div>
    </section>

    <section class="section">
      <div class="more-grid">
        <button class="more-card" data-goto="inbox"><span class="more-icon">🧠</span><strong>Brain Dump</strong><small>${state.inbox.length} item${state.inbox.length === 1 ? "" : "s"} waiting to be planted.</small></button>
        <button class="more-card" data-goto="daily-close"><span class="more-icon">🌙</span><strong>Daily Close</strong><small>Process unfinished things instead of carrying them forever.</small></button>
      </div>
    </section>
  `;
}

function renderDoMode() {
  const container = document.getElementById("pageContent");
  const focusTasks = focusTasksVisible();
  const capacity = capacitySnapshot(focusTasks);
  if (state.doTaskIndex >= focusTasks.length) state.doTaskIndex = 0;
  const task = focusTasks[state.doTaskIndex] || null;

  container.innerHTML = `
    <div class="day-mode-switch" role="group" aria-label="Today mode">
      <button class="day-mode-button" data-today-view="plan">🌷 Plan</button>
      <button class="day-mode-button active" data-today-view="do">▶ Do</button>
    </div>
    <div class="do-mode-shell">
      <p class="eyebrow">DO MODE · ONE BLOOM AT A TIME</p>
      ${task ? `
        <div class="do-mode-count">${state.doTaskIndex + 1} of ${focusTasks.length} in your bouquet · ${formatDuration(capacity.minutes)} planned</div>
        <article class="do-task-card">
          <div class="do-task-icon">🌸</div>
          <span class="badge ${modeBadge(task.space)}">${modeLabel(task.space)}</span>
          <h1>${escapeHTML(task.title)}</h1>
          <div class="do-task-meta">
            <span>⏱ ${formatDuration(task.durationMinutes)}</span>
            <span>${energyLabel(task.energy)}</span>
            ${task.dueDate ? `<span>${deadlineLabel(task)} · ${formatDate(task.dueDate)}</span>` : ""}
          </div>
          ${task.notes ? `<p class="do-task-note">${escapeHTML(task.notes).slice(0, 280)}</p>` : ""}
          ${task.subtasks.length ? `<div class="do-subtasks">${task.subtasks.map(sub => `<button class="note-check-row ${sub.completed ? "done" : ""}" data-toggle-subtask="${task.id}" data-subtask-id="${sub.id}"><span class="note-check-box">${sub.completed ? "✓" : ""}</span><span>${escapeHTML(sub.title)}</span></button>`).join("")}</div>` : ""}
          <div class="do-actions">
            <button class="primary-button" data-toggle-task="${task.id}">Complete bloom 🌸</button>
            <button class="secondary-button" data-do-next>Next bloom →</button>
            <button class="text-button" data-edit-task="${task.id}">Open details</button>
          </div>
        </article>
      ` : `
        <div class="empty-state do-empty"><div class="empty-icon">💐</div><h2>Your hands are free</h2><p>Add a few tasks to today's Focus Bouquet, then come back to Do Mode.</p><button class="primary-button" data-today-view="plan">Build today's bouquet</button></div>
      `}
    </div>`;
}

function toggleFocusTask(id) {
  const task = state.tasks.find(item => item.id === id);
  if (!task || task.completed) return;
  if (state.focusTaskIds.includes(id)) {
    state.focusTaskIds = state.focusTaskIds.filter(taskId => taskId !== id);
    showToast("Removed from today's bouquet");
    return render();
  }

  const current = capacitySnapshot();
  const nextMinutes = current.minutes + taskPlanningMinutes(task);
  const capacity = current.capacity;
  if (state.settings.overloadGuardrail && nextMinutes > capacity) {
    const over = nextMinutes - capacity;
    if (!confirm(`This would put today's bouquet ${formatDuration(over)} over your Bloom Budget. Add it anyway?`)) return;
  }
  state.focusTaskIds.push(id);
  showToast("Added to today's bouquet 🌷");
  render();
}

function focusTaskRow(task, selected) {
  return `<div class="focus-item">
    <button class="task-checkbox ${task.completed ? "checked" : ""}" data-toggle-task="${task.id}">${task.completed ? "✓" : ""}</button>
    <div><strong style="font-size:12px;">${escapeHTML(task.title)}</strong><div class="task-meta" style="margin-top:4px;">${task.project ? `<span>🌷 ${escapeHTML(task.project)}</span>` : ""}${task.dueDate ? `<span>📅 ${formatDate(task.dueDate)}</span>` : ""}<span>⏱ ${formatDuration(task.durationMinutes)}</span><span>${energyLabel(task.energy)}</span><span>${modeLabel(task.space)}</span></div></div>
    <button class="focus-add" data-focus-task="${task.id}">${selected ? "Remove" : "+ Add"}</button>
  </div>`;
}

/* ================= TASKS ================= */

function taskSort(a,b) {
  if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
  if (!a.dueDate && !b.dueDate) return b.createdAt - a.createdAt;
  if (!a.dueDate) return 1;
  if (!b.dueDate) return -1;
  return `${a.dueDate}${a.dueTime || "23:59"}`.localeCompare(`${b.dueDate}${b.dueTime || "23:59"}`);
}

function getTaskProjects(tasks) {
  return [...new Set(tasks.map(t => t.project).filter(Boolean))].sort((a,b) => a.localeCompare(b));
}

function taskCard(task) {
  const doneSubs = task.subtasks.filter(s => s.completed).length;
  const overdue = !task.completed && task.dueDate && task.dueDate < todayISO();
  const petalChips = [];
  if (task.subtasks.length) petalChips.push(`✅ ${doneSubs}/${task.subtasks.length}`);
  if (task.notes) petalChips.push("📝 Notes");
  if (task.link) petalChips.push("🔗 Link");
  if (task.reminderEnabled) petalChips.push(task.reminderChain ? "🔔 Chain" : "🔔 Reminder");
  if (task.waitingOn || task.followUpDate) petalChips.push("⏳ Follow-up");
  if (task.durationMinutes) petalChips.push(`⏱ ${formatDuration(task.durationMinutes)}`);
  petalChips.push(energyLabel(task.energy));
  if (task.dueDate) petalChips.push(deadlineLabel(task));
  if (task.recurrence.type !== "none") petalChips.push(recurrenceLabel(task));

  return `<div class="task-item ${task.completed ? "completed" : ""}">
    <button class="task-checkbox ${task.completed ? "checked" : ""}" data-toggle-task="${task.id}" aria-label="Toggle task">${task.completed ? "✓" : ""}</button>
    <div class="task-main" data-edit-task="${task.id}">
      <div class="task-title">${escapeHTML(task.title)}</div>
      <div class="task-meta">
        <span class="badge ${modeBadge(task.space)}">${modeLabel(task.space)}</span>
        ${task.project ? `<span>🌷 ${escapeHTML(task.project)}</span>` : ""}
        <span><span class="priority-dot priority-${task.priority}"></span>${escapeHTML(task.priority)}</span>
        ${task.dueDate ? `<span class="${overdue ? "overdue-text" : ""}">📅 ${overdue ? "Overdue · " : ""}${formatDate(task.dueDate)}</span>` : ""}
        ${task.dueTime ? `<span>${formatTime(task.dueTime)}</span>` : ""}
        <span class="badge badge-${task.status}">${statusLabel(task.status)}</span>
        ${(task.tags || []).map(tag => `<span class="task-tag">#${escapeHTML(tag)}</span>`).join("")}
      </div>
      ${task.status === "waiting" && (task.waitingOn || task.followUpDate) ? `<div class="task-waiting-note"><strong>Waiting on:</strong> ${escapeHTML(task.waitingOn || "Follow-up")}${task.followUpDate ? ` · ${formatDate(task.followUpDate)}` : ""}</div>` : ""}
      ${petalChips.length ? `<div class="petal-strip">${petalChips.map(p => `<span class="petal-chip">${p}</span>`).join("")}</div>` : ""}
    </div>
    <div class="task-actions"><button class="mini-icon-button" data-edit-task="${task.id}" title="Edit">✎</button><button class="mini-icon-button" data-cycle-task="${task.id}" title="Status">↻</button></div>
  </div>`;
}

function renderTasks() {
  const container = document.getElementById("pageContent");
  let tasks = filterByMode(state.tasks);
  const projects = getTaskProjects(tasks);
  const search = String(state.taskSearch || "").trim().toLowerCase();

  if (search) tasks = tasks.filter(task => [task.title,task.project,task.notes,task.waitingOn,task.link,...task.tags,...task.subtasks.map(s=>s.title)].join(" ").toLowerCase().includes(search));
  if (state.taskProjectFilter !== "all") tasks = tasks.filter(t => t.project === state.taskProjectFilter);
  if (state.taskFilter === "today") tasks = tasks.filter(t => !t.completed && t.dueDate === todayISO());
  if (state.taskFilter === "upcoming") tasks = tasks.filter(t => !t.completed && t.dueDate > todayISO());
  if (state.taskFilter === "overdue") tasks = tasks.filter(t => !t.completed && t.dueDate && t.dueDate < todayISO());
  if (state.taskFilter === "waiting") tasks = tasks.filter(t => !t.completed && t.status === "waiting");
  if (state.taskFilter === "completed") tasks = tasks.filter(t => t.completed);
  if (state.taskFilter === "all") tasks = tasks.filter(t => !t.completed);
  tasks.sort(taskSort);

  const filters = [["all","All"],["today","Today"],["upcoming","Upcoming"],["overdue","Overdue"],["waiting","Waiting"],["completed","Completed"]];
  const visibleBase = filterByMode(state.tasks);

  container.innerHTML = `
    <div class="page-heading"><p class="eyebrow">GROW WHAT MATTERS</p><h1>Tasks</h1><p>Projects, time estimates, energy, deadlines, subtasks, recurrence, follow-ups and reminders.</p></div>
    <div class="task-summary"><span class="task-summary-chip">🌱 ${visibleBase.filter(t=>!t.completed).length} active</span><span class="task-summary-chip">⏳ ${visibleBase.filter(t=>!t.completed&&t.status==="waiting").length} waiting</span><span class="task-summary-chip">⚠️ ${visibleBase.filter(t=>!t.completed&&t.dueDate&&t.dueDate<todayISO()).length} overdue</span></div>
    <div class="task-tools">
      <div class="search-box"><input id="taskSearch" type="search" placeholder="Search tasks, projects, tags..." value="${escapeHTML(state.taskSearch || "")}" /></div>
      <select id="taskProjectFilter" class="task-project-select"><option value="all">All projects</option>${projects.map(p=>`<option value="${escapeHTML(p)}" ${state.taskProjectFilter===p?"selected":""}>${escapeHTML(p)}</option>`).join("")}</select>
    </div>
    <div class="filter-row">${filters.map(([v,l])=>`<button class="filter-chip ${state.taskFilter===v?"active":""}" data-task-filter="${v}">${l}</button>`).join("")}</div>
    ${tasks.length ? `<div class="task-list">${tasks.map(taskCard).join("")}</div>` : emptyState("🌱","Nothing here","No tasks match this view.","Add a task","open-task")}
  `;
}

function clearTaskForm() {
  ["taskEditId","taskTitle","taskProject","taskTags","taskDate","taskTime","taskSubtasks","taskNotes","taskLink","taskWaitingOn","taskFollowUpDate"].forEach(id => document.getElementById(id).value = "");
  document.getElementById("taskSpace").value = preferredSpace();
  document.getElementById("taskPriority").value = "medium";
  document.getElementById("taskStatus").value = "todo";
  document.getElementById("taskDuration").value = "30";
  document.getElementById("taskEnergy").value = "medium";
  document.getElementById("taskDeadlineType").value = "soft";
  document.querySelectorAll("[data-recur-day]").forEach(input => { input.checked = false; });
  document.getElementById("taskReminderEnabled").checked = false;
  document.getElementById("taskReminderChain").checked = false;
  document.getElementById("taskFollowUpAfterCompletion").checked = false;
  document.getElementById("taskRecurrenceType").value = "none";
  document.getElementById("taskRecurrenceInterval").value = "1";
  document.getElementById("taskModalEyebrow").textContent = "NEW BLOOM";
  document.getElementById("taskModalTitle").textContent = "Add task";
  document.getElementById("saveTaskButton").textContent = "Add task";
  document.getElementById("deleteTaskFromModal").classList.add("hidden");
  updateTaskConditionalFields();
}

function openTaskModal(taskId="") {
  clearTaskForm();
  const task = state.tasks.find(t => t.id === taskId);
  if (task) {
    document.getElementById("taskEditId").value = task.id;
    document.getElementById("taskTitle").value = task.title;
    document.getElementById("taskSpace").value = task.space;
    document.getElementById("taskPriority").value = task.priority;
    document.getElementById("taskProject").value = task.project;
    document.getElementById("taskTags").value = task.tags.join(", ");
    document.getElementById("taskDate").value = task.dueDate;
    document.getElementById("taskTime").value = task.dueTime;
    document.getElementById("taskDuration").value = String(task.durationMinutes || 0);
    document.getElementById("taskEnergy").value = task.energy;
    document.getElementById("taskDeadlineType").value = task.deadlineType;
    document.getElementById("taskStatus").value = task.completed ? "done" : task.status;
    document.getElementById("taskSubtasks").value = task.subtasks.map(s => s.title).join("\n");
    document.getElementById("taskNotes").value = task.notes;
    document.getElementById("taskLink").value = task.link;
    document.getElementById("taskWaitingOn").value = task.waitingOn;
    document.getElementById("taskFollowUpDate").value = task.followUpDate;
    document.getElementById("taskFollowUpAfterCompletion").checked = task.followUpAfterCompletion;
    document.getElementById("taskReminderEnabled").checked = task.reminderEnabled;
    document.getElementById("taskReminderChain").checked = task.reminderChain;
    document.getElementById("taskRecurrenceType").value = task.recurrence.type;
    document.getElementById("taskRecurrenceInterval").value = task.recurrence.interval;
    document.querySelectorAll("[data-recur-day]").forEach(input => { input.checked = (task.recurrence.weekdays || []).includes(Number(input.value)); });
    document.getElementById("taskModalEyebrow").textContent = "TASK DETAILS";
    document.getElementById("taskModalTitle").textContent = "Edit task";
    document.getElementById("saveTaskButton").textContent = "Save changes";
    document.getElementById("deleteTaskFromModal").classList.remove("hidden");
    updateTaskConditionalFields();
  }
  openModal("taskModal");
}

function updateTaskConditionalFields() {
  const recurrenceType = document.getElementById("taskRecurrenceType")?.value;
  document.getElementById("taskRecurrenceIntervalWrap")?.classList.toggle("hidden", !["custom","afterCompletion"].includes(recurrenceType));
  document.getElementById("taskRecurrenceWeekdaysWrap")?.classList.toggle("hidden", recurrenceType !== "selectedWeekdays");
}

function parseLines(text) { return text.split("\n").map(s=>s.trim()).filter(Boolean); }
function parseTags(text) { return text.split(",").map(s=>s.trim().replace(/^#/,"")).filter(Boolean); }

function saveTask() {
  const id = document.getElementById("taskEditId").value;
  const title = document.getElementById("taskTitle").value.trim();
  if (!title) return showToast("Give the task a name 🌸");

  const old = id ? state.tasks.find(t => t.id === id) : null;
  const oldSubtasks = old?.subtasks || [];
  const newTitles = parseLines(document.getElementById("taskSubtasks").value);
  const subtasks = newTitles.map(title => {
    const existing = oldSubtasks.find(s => s.title === title);
    return existing ? { ...existing } : { id:createId(), title, completed:false };
  });
  const status = document.getElementById("taskStatus").value;

  const task = normalizeTask({
    ...(old || {}),
    id: id || createId(),
    title,
    space: document.getElementById("taskSpace").value,
    priority: document.getElementById("taskPriority").value,
    project: document.getElementById("taskProject").value.trim(),
    tags: parseTags(document.getElementById("taskTags").value),
    dueDate: document.getElementById("taskDate").value,
    dueTime: document.getElementById("taskTime").value,
    durationMinutes: Math.max(0, Number(document.getElementById("taskDuration").value || 0)),
    energy: document.getElementById("taskEnergy").value,
    deadlineType: document.getElementById("taskDeadlineType").value,
    status,
    completed: status === "done",
    completedDate: status === "done" ? (old?.completedDate || todayISO()) : null,
    subtasks,
    notes: document.getElementById("taskNotes").value.trim(),
    link: document.getElementById("taskLink").value.trim(),
    waitingOn: document.getElementById("taskWaitingOn").value.trim(),
    followUpDate: document.getElementById("taskFollowUpDate").value,
    followUpAfterCompletion: document.getElementById("taskFollowUpAfterCompletion").checked,
    reminderEnabled: document.getElementById("taskReminderEnabled").checked,
    reminderChain: document.getElementById("taskReminderChain").checked,
    recurrence: {
      type: document.getElementById("taskRecurrenceType").value,
      interval: Number(document.getElementById("taskRecurrenceInterval").value || 1),
      weekdays: [...document.querySelectorAll("[data-recur-day]:checked")].map(input => Number(input.value))
    },
    createdAt: old?.createdAt || Date.now(),
    updatedAt: Date.now()
  });

  if (old) state.tasks[state.tasks.findIndex(t=>t.id===id)] = task;
  else state.tasks.push(task);

  const completedNow = Boolean(old && !old.completed && task.completed);
  if (completedNow) {
    state.focusTaskIds = state.focusTaskIds.filter(taskId => taskId !== task.id);
    state.reminders = state.reminders.filter(r => r.linkedTaskId !== task.id);
    scheduleNextRecurringTask(task);
    createFollowUpFromCompletedTask(task);
  } else {
    syncTaskReminder(task);
  }

  closeModal("taskModal");
  showToast(old ? "Task updated 🌸" : "A new bloom was planted 🌱");
  render();
}

function syncTaskReminder(task) {
  const existing = state.reminders.find(r => r.linkedTaskId === task.id);
  if (!task.reminderEnabled || task.completed || !task.dueDate) {
    if (existing) state.reminders = state.reminders.filter(r => r.id !== existing.id);
    return;
  }
  const data = normalizeReminder({
    ...(existing || {}),
    id: existing?.id || createId(),
    title: task.title,
    space: task.space,
    date: task.dueDate,
    time: task.dueTime || "09:00",
    repeatType: "none",
    completed: false,
    notified: false,
    chainEnabled: task.reminderChain,
    chainNotified: [],
    linkedTaskId: task.id,
    createdAt: existing?.createdAt || Date.now(),
    updatedAt: Date.now()
  });
  if (existing) state.reminders[state.reminders.findIndex(r=>r.id===existing.id)] = data;
  else state.reminders.push(data);
}

function toggleTask(id) {
  const task = state.tasks.find(t => t.id === id); if (!task) return;
  const completing = !task.completed;
  task.completed = completing;
  task.status = completing ? "done" : "todo";
  task.completedDate = completing ? todayISO() : null;
  task.updatedAt = Date.now();

  if (completing) {
    state.focusTaskIds = state.focusTaskIds.filter(taskId => taskId !== id);
    state.reminders = state.reminders.filter(r => r.linkedTaskId !== id);
    scheduleNextRecurringTask(task);
    createFollowUpFromCompletedTask(task);
  } else {
    syncTaskReminder(task);
  }
  showToast(completing ? "Bloom complete 🌸" : "Task reopened 🌱");
  render();
}

function scheduleNextRecurringTask(task) {
  const rec = task.recurrence || { type:"none", interval:1, weekdays:[] };
  if (rec.type === "none") return;
  const next = clone(task);
  next.id = createId(); next.completed = false; next.completedDate = null; next.status = "todo";
  next.subtasks = next.subtasks.map(s => ({ ...s, id:createId(), completed:false }));
  next.createdAt = Date.now(); next.updatedAt = Date.now();

  const baseDate = task.dueDate || todayISO();
  if (rec.type === "daily") next.dueDate = addDaysISO(baseDate, 1);
  if (rec.type === "custom") next.dueDate = addDaysISO(baseDate, rec.interval);
  if (rec.type === "afterCompletion") next.dueDate = addDaysISO(todayISO(), rec.interval);
  if (rec.type === "weekly") next.dueDate = addDaysISO(baseDate, 7);
  if (rec.type === "weekdays") next.dueDate = nextWorkdayISO(new Date(`${baseDate}T12:00:00`));
  if (rec.type === "selectedWeekdays") next.dueDate = nextSelectedWeekdayISO(baseDate, rec.weekdays);
  if (rec.type === "monthly") next.dueDate = addMonthsClamped(baseDate, 1);
  state.tasks.push(normalizeTask(next));
  syncTaskReminder(next);
}

function createFollowUpFromCompletedTask(task) {
  if (!task.followUpAfterCompletion || !task.followUpDate) return;
  const follow = normalizeTask({
    title: `Follow up: ${task.title}`,
    space: task.space,
    priority: task.priority,
    status: "waiting",
    project: task.project,
    tags: [...task.tags, "follow-up"],
    dueDate: task.followUpDate,
    waitingOn: task.waitingOn || task.title,
    reminderEnabled: true,
    reminderChain: false,
    createdAt: Date.now()
  });
  state.tasks.push(follow);
  syncTaskReminder(follow);
  showToast("Hana remembered the follow-up 🌱");
}

function toggleSubtask(taskId, subtaskId) {
  const task = state.tasks.find(t => t.id === taskId); if (!task) return;
  const sub = task.subtasks.find(s => s.id === subtaskId); if (!sub) return;
  sub.completed = !sub.completed; task.updatedAt = Date.now(); render();
}

function cycleTaskStatus(id) {
  const task = state.tasks.find(t => t.id === id); if (!task || task.completed) return;
  const order = ["todo","doing","waiting","blocked"];
  task.status = order[(order.indexOf(task.status)+1)%order.length];
  task.updatedAt = Date.now(); showToast(`Status: ${statusLabel(task.status)}`); render();
}

function deleteTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task || !confirm("Move this task to Trash?")) return;
  const linkedReminders = state.reminders.filter(r => r.linkedTaskId === id);
  moveToTrash("task", task, { linkedReminders });
  state.tasks = state.tasks.filter(t => t.id !== id);
  state.reminders = state.reminders.filter(r => r.linkedTaskId !== id);
  state.focusTaskIds = state.focusTaskIds.filter(x => x !== id);
  closeModal("taskModal");
  render();
}

/* ================= NOTES ================= */

function noteTypeIcon(type) { return type === "meeting" ? "👥" : type === "checklist" ? "✅" : "📝"; }

function noteCard(note) {
  const done = note.checklist.filter(i=>i.completed).length;
  return `<article class="note-card ${note.pinned ? "pinned" : ""}">
    <h3>${note.pinned ? "📌 " : ""}${noteTypeIcon(note.type)} ${escapeHTML(note.title)}</h3>
    <div class="note-preview">${escapeHTML(note.content).slice(0,320)}</div>
    ${note.checklist.length ? `<div class="note-checklist">${note.checklist.slice(0,5).map(item=>`<button class="note-check-row ${item.completed?"done":""}" data-toggle-note-check="${note.id}" data-note-check-id="${item.id}"><span class="note-check-box">${item.completed?"✓":""}</span><span>${escapeHTML(item.title)}</span></button>`).join("")}</div><div class="task-meta" style="margin-top:7px;">${done}/${note.checklist.length} complete</div>` : ""}
    <div class="note-footer"><span>${modeLabel(note.space)}</span><span>${note.tags.map(t=>`#${escapeHTML(t)}`).join(" ")}</span></div>
    <div class="note-actions">
      <button data-edit-note="${note.id}">Edit</button>
      <button data-note-to-task="${note.id}">→ Task</button>
      ${note.checklist.length ? `<button data-note-actions-to-tasks="${note.id}">${note.type==="meeting"?"Meeting → Actions":"Items → Tasks"}</button>` : ""}
      ${note.resettable && note.checklist.length ? `<button data-reset-note="${note.id}">Reset</button>` : ""}
    </div>
  </article>`;
}

function renderNotes() {
  const container = document.getElementById("pageContent");
  const notes = filterByMode(state.notes).sort((a,b)=>Number(b.pinned)-Number(a.pinned)||b.updatedAt-a.updatedAt);
  container.innerHTML = `
    <div class="page-heading"><p class="eyebrow">THOUGHTS THAT CAN BECOME ACTION</p><h1>Notes</h1><p>Editable notes, meeting actions and resettable checklists.</p></div>
    <div class="search-box"><input id="noteSearch" type="search" placeholder="Search notes and tags..." /></div>
    <div id="notesResults">${notes.length ? `<div class="note-grid">${notes.map(noteCard).join("")}</div>` : emptyState("📝","Your pages are waiting","Capture anything worth remembering.","Add note","open-note")}</div>
  `;
}

function clearNoteForm() {
  ["noteEditId","noteTitle","noteTags","noteContent","noteChecklist"].forEach(id=>document.getElementById(id).value="");
  document.getElementById("noteType").value="note";
  document.getElementById("noteSpace").value=preferredSpace();
  document.getElementById("notePinned").checked=false; document.getElementById("noteResettable").checked=false;
  document.getElementById("noteModalEyebrow").textContent="NEW NOTE"; document.getElementById("noteModalTitle").textContent="Capture a thought"; document.getElementById("saveNoteButton").textContent="Save note";
  document.getElementById("deleteNoteFromModal").classList.add("hidden"); updateNoteConditionalFields();
}

function openNoteModal(noteId="") {
  clearNoteForm();
  const note = state.notes.find(n=>n.id===noteId);
  if (note) {
    document.getElementById("noteEditId").value=note.id; document.getElementById("noteTitle").value=note.title; document.getElementById("noteType").value=note.type; document.getElementById("noteSpace").value=note.space; document.getElementById("noteTags").value=note.tags.join(", "); document.getElementById("noteContent").value=note.content; document.getElementById("noteChecklist").value=note.checklist.map(i=>i.title).join("\n"); document.getElementById("noteResettable").checked=note.resettable; document.getElementById("notePinned").checked=note.pinned;
    document.getElementById("noteModalEyebrow").textContent="NOTE DETAILS"; document.getElementById("noteModalTitle").textContent="Edit note"; document.getElementById("saveNoteButton").textContent="Save changes"; document.getElementById("deleteNoteFromModal").classList.remove("hidden"); updateNoteConditionalFields();
  }
  openModal("noteModal");
}

function updateNoteConditionalFields() {
  const type = document.getElementById("noteType")?.value;
  const show = ["checklist","meeting"].includes(type);
  document.getElementById("noteChecklistWrap")?.classList.toggle("hidden", !show);
  document.getElementById("noteResettableWrap")?.classList.toggle("hidden", type !== "checklist");
}

function saveNote() {
  const id=document.getElementById("noteEditId").value; const old=id?state.notes.find(n=>n.id===id):null;
  const title=document.getElementById("noteTitle").value.trim(); const content=document.getElementById("noteContent").value.trim();
  if (!title && !content) return showToast("Write something first 🌸");
  const oldChecks=old?.checklist||[];
  const checks=parseLines(document.getElementById("noteChecklist").value).map(title=>{ const e=oldChecks.find(i=>i.title===title); return e?{...e}:{id:createId(),title,completed:false}; });
  const note=normalizeNote({...(old||{}),id:id||createId(),title:title||"Untitled note",type:document.getElementById("noteType").value,space:document.getElementById("noteSpace").value,tags:parseTags(document.getElementById("noteTags").value),content,checklist:checks,resettable:document.getElementById("noteResettable").checked,pinned:document.getElementById("notePinned").checked,createdAt:old?.createdAt||Date.now(),updatedAt:Date.now()});
  if(old) state.notes[state.notes.findIndex(n=>n.id===id)]=note; else state.notes.push(note);
  closeModal("noteModal"); showToast(old?"Note updated 🌸":"Note saved 🌸"); render();
}

function deleteNote(id) { const note=state.notes.find(n=>n.id===id); if(!note||!confirm("Move this note to Trash?"))return; moveToTrash("note",note); state.notes=state.notes.filter(n=>n.id!==id); closeModal("noteModal"); render(); }

function toggleNoteCheck(noteId,itemId) { const n=state.notes.find(n=>n.id===noteId); const i=n?.checklist.find(i=>i.id===itemId); if(!i)return; i.completed=!i.completed; n.updatedAt=Date.now(); render(); }

function resetNoteChecklist(noteId) { const n=state.notes.find(n=>n.id===noteId); if(!n)return; n.checklist.forEach(i=>i.completed=false); n.updatedAt=Date.now(); showToast("Checklist reset 🌱"); render(); }

function noteToTask(noteId) {
  const n=state.notes.find(n=>n.id===noteId); if(!n)return;
  const task=normalizeTask({title:n.title,space:n.space,priority:"medium",status:"todo",notes:n.content,tags:[...n.tags,"from-note"],createdAt:Date.now()});
  state.tasks.push(task); showToast("Note became a task 🌱"); render();
}

function noteActionsToTasks(noteId) {
  const n=state.notes.find(n=>n.id===noteId); if(!n)return;
  const items=n.checklist.filter(i=>!i.completed); if(!items.length)return showToast("No unchecked actions to create.");
  items.forEach(item=>state.tasks.push(normalizeTask({title:item.title,space:n.space,priority:"medium",status:"todo",project:n.type==="meeting"?n.title:"",tags:[...n.tags,n.type==="meeting"?"meeting-action":"from-note"],notes:`From note: ${n.title}`,createdAt:Date.now()})));
  showToast(`${items.length} action${items.length===1?"":"s"} created 🌱`); render();
}

function searchNotes(query) {
  const q=query.trim().toLowerCase(); let notes=filterByMode(state.notes);
  if(q)notes=notes.filter(n=>[n.title,n.content,...n.tags,...n.checklist.map(i=>i.title)].join(" ").toLowerCase().includes(q));
  const el=document.getElementById("notesResults"); if(el)el.innerHTML=notes.length?`<div class="note-grid">${notes.map(noteCard).join("")}</div>`:emptyState("🔎","No matching notes","Try another search.","","");
}

/* ================= REMINDERS ================= */

function reminderCard(r) {
  return `<div class="reminder-card">
    <div class="reminder-icon">🔔</div>
    <div><div class="reminder-title" data-edit-reminder="${r.id}">${escapeHTML(r.title)}</div><div class="reminder-date">${formatFullDate(r.date)}${r.time?` · ${formatTime(r.time)}`:""}${r.repeatType!=="none"?` · ${r.repeatType}`:""}</div><div class="task-meta" style="margin-top:5px;"><span class="badge ${modeBadge(r.space)}">${modeLabel(r.space)}</span>${r.chainEnabled?`<span class="badge chain-badge">Chain</span>`:""}${r.linkedTaskId?`<span>🔗 Task</span>`:""}${r.linkedTableId?`<span>📋 Table</span>`:""}</div><div class="reminder-actions"><button data-snooze-reminder="${r.id}" data-snooze="tonight">Tonight</button><button data-snooze-reminder="${r.id}" data-snooze="tomorrow">Tomorrow</button><button data-snooze-reminder="${r.id}" data-snooze="workday">Next workday</button><button data-snooze-reminder="${r.id}" data-snooze="week">Next week</button><button data-edit-reminder="${r.id}">Pick date / Edit</button></div></div>
    <button class="mini-icon-button" data-complete-reminder="${r.id}">✓</button>
  </div>`;
}

function renderReminders() {
  const container=document.getElementById("pageContent");
  const reminders=filterByMode(state.reminders).filter(r=>!r.completed).sort((a,b)=>`${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  container.innerHTML=`<div class="page-heading"><p class="eyebrow">GENTLE NUDGES THAT KNOW WHEN TO STOP</p><h1>Reminders</h1><p>Edit, snooze, repeat and chain reminders without keeping dead notifications alive.</p></div>${reminders.length?reminders.map(reminderCard).join(""):emptyState("🔔","Quiet for now","There are no active reminders.","Add reminder","open-reminder")}<div style="margin-top:14px;"><button class="primary-button full-width" data-open="reminderModal">+ Add reminder</button></div>`;
}

function clearReminderForm() {
  ["reminderEditId","reminderTitle","reminderDate","reminderTime"].forEach(id=>document.getElementById(id).value="");
  document.getElementById("reminderSpace").value=preferredSpace(); document.getElementById("reminderRepeat").value="none"; document.getElementById("reminderRepeatInterval").value="1"; document.getElementById("reminderChainEnabled").checked=false;
  document.getElementById("reminderModalEyebrow").textContent="GENTLE NUDGE"; document.getElementById("reminderModalTitle").textContent="Add reminder"; document.getElementById("saveReminderButton").textContent="Add reminder"; document.getElementById("deleteReminderFromModal").classList.add("hidden"); updateReminderConditionalFields();
}

function openReminderModal(id="") {
  clearReminderForm(); const r=state.reminders.find(r=>r.id===id);
  if(r){document.getElementById("reminderEditId").value=r.id;document.getElementById("reminderTitle").value=r.title;document.getElementById("reminderSpace").value=r.space;document.getElementById("reminderDate").value=r.date;document.getElementById("reminderTime").value=r.time;document.getElementById("reminderRepeat").value=r.repeatType;document.getElementById("reminderRepeatInterval").value=r.repeatInterval;document.getElementById("reminderChainEnabled").checked=r.chainEnabled;document.getElementById("reminderModalEyebrow").textContent="REMINDER DETAILS";document.getElementById("reminderModalTitle").textContent="Edit reminder";document.getElementById("saveReminderButton").textContent="Save changes";document.getElementById("deleteReminderFromModal").classList.remove("hidden");updateReminderConditionalFields();}
  openModal("reminderModal");
}

function updateReminderConditionalFields(){document.getElementById("reminderRepeatIntervalWrap")?.classList.toggle("hidden",document.getElementById("reminderRepeat")?.value!=="custom");}

function saveReminder() {
  const id=document.getElementById("reminderEditId").value; const old=id?state.reminders.find(r=>r.id===id):null; const title=document.getElementById("reminderTitle").value.trim(); const date=document.getElementById("reminderDate").value;
  if(!title)return showToast("What should Hana remind you about?"); if(!date)return showToast("Choose a reminder date 🌸");
  const r=normalizeReminder({...(old||{}),id:id||createId(),title,space:document.getElementById("reminderSpace").value,date,time:document.getElementById("reminderTime").value||"09:00",repeatType:document.getElementById("reminderRepeat").value,repeatInterval:Number(document.getElementById("reminderRepeatInterval").value||1),chainEnabled:document.getElementById("reminderChainEnabled").checked,notified:false,chainNotified:[],completed:false,createdAt:old?.createdAt||Date.now(),updatedAt:Date.now()});
  if(old)state.reminders[state.reminders.findIndex(x=>x.id===id)]=r;else state.reminders.push(r);closeModal("reminderModal");showToast(old?"Reminder updated 🔔":"Reminder planted 🔔");render();
}

function deleteReminder(id){const reminder=state.reminders.find(r=>r.id===id);if(!reminder||!confirm("Move this reminder to Trash?"))return;moveToTrash("reminder",reminder);state.reminders=state.reminders.filter(r=>r.id!==id);closeModal("reminderModal");render();}

function completeReminder(id){const r=state.reminders.find(r=>r.id===id);if(!r)return;if(r.linkedTaskId){const t=state.tasks.find(t=>t.id===r.linkedTaskId);if(t&&!t.completed)showToast("Reminder cleared; task is still open.");} if(r.repeatType!=="none"&&!r.linkedTaskId){advanceReminder(r);}else r.completed=true;render();}

function advanceReminder(r){const base=new Date(`${r.date}T12:00:00`);if(r.repeatType==="daily")base.setDate(base.getDate()+1);if(r.repeatType==="custom")base.setDate(base.getDate()+r.repeatInterval);if(r.repeatType==="weekly")base.setDate(base.getDate()+7);if(r.repeatType==="weekdays"){do{base.setDate(base.getDate()+1)}while([0,6].includes(base.getDay()));}if(r.repeatType==="monthly")base.setMonth(base.getMonth()+1);r.date=localDateISO(base);r.notified=false;r.chainNotified=[];r.completed=false;}

function snoozeReminder(id,type){const r=state.reminders.find(r=>r.id===id);if(!r)return;const now=new Date();if(type==="tonight"){r.date=todayISO();r.time="19:00";}if(type==="tomorrow"){r.date=addDaysISO(todayISO(),1);r.time="08:00";}if(type==="workday"){r.date=nextWorkdayISO(now);r.time="09:00";}if(type==="week"){r.date=addDaysISO(todayISO(),7);r.time="09:00";}r.notified=false;r.chainNotified=[];showToast("Reminder snoozed 🌙");render();}

function reminderCanNotify(r){if(r.space!=="work"||!state.settings.workFirewallEnabled||isWorkTime())return true;if(!state.settings.allowHighPriorityWorkReminders)return false;const t=state.tasks.find(t=>t.id===r.linkedTaskId);return t?.priority==="high";}

function checkReminders(){if(!("Notification" in window)||Notification.permission!=="granted")return;const now=Date.now();state.reminders.forEach(r=>{if(r.completed||!r.date||!reminderCanNotify(r))return;const linked=state.tasks.find(t=>t.id===r.linkedTaskId);if(linked?.completed)return;const due=new Date(`${r.date}T${r.time||"09:00"}:00`).getTime();if(r.chainEnabled){const stages=[{key:"day-before",at:due-24*3600000,label:`${r.title} is due tomorrow.`},{key:"three-hours",at:due-3*3600000,label:`${r.title} is coming up soon.`},{key:"due",at:due,label:r.title},{key:"after",at:due+2*3600000,label:`Still open: ${r.title}`}];const ready=stages.filter(s=>now>=s.at&&!r.chainNotified.includes(s.key)).sort((a,b)=>a.at-b.at).pop();if(ready){new Notification("Hana 🌸",{body:ready.label,icon:"icons/icon-192.png"});r.chainNotified=[...new Set([...r.chainNotified,...stages.filter(stage=>stage.at<=ready.at).map(stage=>stage.key)])];saveState();}}else if(now>=due&&!r.notified){new Notification("Hana 🌸",{body:r.title,icon:"icons/icon-192.png"});r.notified=true;saveState();}});}

async function requestNotificationPermission(){if(!("Notification" in window))return showToast("Notifications aren't supported by this browser.");const result=await Notification.requestPermission();showToast(result==="granted"?"Hana notifications enabled 🔔":"Notification permission wasn't enabled.");if(result==="granted")checkReminders();}

/* ================= CHECKLISTS / LISTS ================= */

function renderLists() {
  const container = document.getElementById("pageContent");
  const lists = filterByMode(state.lists);
  if (!lists.find(list => list.id === state.activeListId)) state.activeListId = lists[0]?.id || "";
  const active = lists.find(list => list.id === state.activeListId);
  container.innerHTML = `
    <div class="page-heading">
      <p class="eyebrow">CHECKLISTS THAT FIT REAL LIFE</p>
      <h1>Lists</h1>
      <p>Groceries, things to buy, packing, errands, routines — name the list yourself and keep every item as a separate checkable entry.</p>
    </div>
    <div class="list-template-strip">
      <button data-list-template="grocery">🛒 Groceries</button>
      <button data-list-template="buy">🛍️ To Buy</button>
      <button data-list-template="packing">🧳 Packing</button>
      <button data-list-template="errands">🚶 Errands</button>
      <button data-list-template="simple">☑️ Blank Checklist</button>
    </div>
    <div class="table-tabs">
      ${lists.map(list => `<button class="table-tab ${list.id===state.activeListId?"active":""}" data-select-list="${list.id}">${escapeHTML(list.icon)} ${escapeHTML(list.name)}</button>`).join("")}
      <button class="table-tab" data-open-list>+ New list</button>
    </div>
    ${active ? renderSingleList(active) : emptyState("☑️", "No checklists yet", "Create a grocery list, shopping list, packing list, or any checklist you want.", "Create checklist", "open-list")}
  `;
}

function renderSingleList(list) {
  const completed = list.items.filter(item => item.completed).length;
  const total = list.items.length;
  const progress = total ? Math.round((completed / total) * 100) : 0;
  return `
    <section class="checklist-shell">
      <div class="checklist-heading">
        <div>
          <span class="badge ${modeBadge(list.space)}">${modeLabel(list.space)}</span>
          <h2>${escapeHTML(list.icon)} ${escapeHTML(list.name)}</h2>
          <p>${completed}/${total} checked</p>
        </div>
        <button class="mini-icon-button list-edit-button" data-edit-list="${list.id}" title="Edit list">✎</button>
      </div>
      <div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div>
      <div class="checklist-toolbar">
        <button class="primary-button" data-add-list-item="${list.id}">+ Add item</button>
        ${completed ? `<button class="secondary-button" data-clear-checked="${list.id}">Remove checked</button>` : ""}
        ${completed ? `<button class="text-button" data-reset-list="${list.id}">Uncheck all</button>` : ""}
      </div>
      <div class="standalone-checklist">
        ${total ? list.items.map(item => `
          <div class="standalone-check-item ${item.completed?"done":""}">
            <button class="list-check-box ${item.completed?"checked":""}" data-toggle-list-item="${item.id}" data-list-id="${list.id}" aria-label="Toggle ${escapeHTML(item.title)}">${item.completed?"✓":""}</button>
            <button class="list-item-main" data-edit-list-item="${item.id}" data-list-id="${list.id}">
              <strong>${escapeHTML(item.title)}</strong>
              ${item.detail ? `<small>${escapeHTML(item.detail)}</small>` : ""}
            </button>
            <button class="mini-icon-button" data-edit-list-item="${item.id}" data-list-id="${list.id}" title="Edit item">✎</button>
          </div>`).join("") : `<div class="empty-state checklist-empty"><div class="empty-icon">☑️</div><h3>Nothing on this list yet</h3><p>Add items one by one so each entry stays independently checkable.</p><button class="secondary-button" data-add-list-item="${list.id}">Add first item</button></div>`}
      </div>
    </section>`;
}

function clearListForm() {
  refreshSpaceSelects();
  document.getElementById("listEditId").value = "";
  document.getElementById("listIcon").value = "☑️";
  document.getElementById("listName").value = "";
  document.getElementById("listSpace").value = preferredSpace();
  document.getElementById("listModalEyebrow").textContent = "NEW CHECKLIST";
  document.getElementById("listModalTitle").textContent = "Create a list";
  document.getElementById("saveListButton").textContent = "Create list";
  document.getElementById("deleteListFromModal").classList.add("hidden");
}

function openListModal(listId = "") {
  clearListForm();
  const list = state.lists.find(item => item.id === listId);
  if (list) {
    document.getElementById("listEditId").value = list.id;
    document.getElementById("listIcon").value = list.icon;
    document.getElementById("listName").value = list.name;
    document.getElementById("listSpace").value = list.space;
    document.getElementById("listModalEyebrow").textContent = "CHECKLIST DETAILS";
    document.getElementById("listModalTitle").textContent = "Edit list";
    document.getElementById("saveListButton").textContent = "Save changes";
    document.getElementById("deleteListFromModal").classList.remove("hidden");
  }
  openModal("listModal");
}

function saveList() {
  const id = document.getElementById("listEditId").value;
  const old = id ? state.lists.find(list => list.id === id) : null;
  const name = document.getElementById("listName").value.trim();
  if (!name) return showToast("Give the checklist a name 🌸");
  const list = normalizeList({
    ...(old || {}),
    id: id || createId(),
    name,
    icon: document.getElementById("listIcon").value.trim() || "☑️",
    space: document.getElementById("listSpace").value,
    items: old?.items || [],
    createdAt: old?.createdAt || Date.now(),
    updatedAt: Date.now()
  });
  if (old) state.lists[state.lists.findIndex(item => item.id === id)] = list;
  else state.lists.push(list);
  state.activeListId = list.id;
  closeModal("listModal");
  showToast(old ? "Checklist updated ☑️" : "Checklist created ☑️");
  changePage("lists");
}

function deleteList(id) {
  const list = state.lists.find(item => item.id === id);
  if (!list || !confirm(`Move “${list.name}” to Trash?`)) return;
  moveToTrash("list", list);
  state.lists = state.lists.filter(item => item.id !== id);
  state.activeListId = state.lists[0]?.id || "";
  closeModal("listModal");
  render();
}

function openListItemModal(listId, itemId = "") {
  const list = state.lists.find(item => item.id === listId);
  if (!list) return;
  const item = list.items.find(entry => entry.id === itemId);
  document.getElementById("listItemListId").value = listId;
  document.getElementById("listItemEditId").value = itemId;
  document.getElementById("listItemTitle").value = item?.title || "";
  document.getElementById("listItemDetail").value = item?.detail || "";
  document.getElementById("listItemModalTitle").textContent = item ? "Edit item" : `Add to ${list.name}`;
  document.getElementById("saveListItemButton").textContent = item ? "Save item" : "Add item";
  document.getElementById("deleteListItemFromModal").classList.toggle("hidden", !item);
  openModal("listItemModal");
  setTimeout(() => document.getElementById("listItemTitle")?.focus(), 80);
}

function saveListItem() {
  const list = state.lists.find(item => item.id === document.getElementById("listItemListId").value);
  if (!list) return;
  const itemId = document.getElementById("listItemEditId").value;
  const title = document.getElementById("listItemTitle").value.trim();
  if (!title) return showToast("Add an item first ☑️");
  const old = list.items.find(item => item.id === itemId);
  const item = {
    id: itemId || createId(),
    title,
    detail: document.getElementById("listItemDetail").value.trim(),
    completed: old?.completed || false,
    createdAt: old?.createdAt || Date.now(),
    updatedAt: Date.now()
  };
  if (old) list.items[list.items.findIndex(entry => entry.id === itemId)] = item;
  else list.items.push(item);
  list.updatedAt = Date.now();
  closeModal("listItemModal");
  render();
}

function deleteListItem(listId, itemId) {
  const list = state.lists.find(item => item.id === listId);
  if (!list || !confirm("Delete this checklist item?")) return;
  list.items = list.items.filter(item => item.id !== itemId);
  list.updatedAt = Date.now();
  closeModal("listItemModal");
  render();
}

function toggleListItem(listId, itemId) {
  const list = state.lists.find(item => item.id === listId);
  const item = list?.items.find(entry => entry.id === itemId);
  if (!item) return;
  item.completed = !item.completed;
  item.updatedAt = Date.now();
  list.updatedAt = Date.now();
  render();
}

function resetList(listId) {
  const list = state.lists.find(item => item.id === listId);
  if (!list) return;
  list.items.forEach(item => item.completed = false);
  list.updatedAt = Date.now();
  showToast("Checklist reset 🌱");
  render();
}

function clearCheckedListItems(listId) {
  const list = state.lists.find(item => item.id === listId);
  if (!list) return;
  const count = list.items.filter(item => item.completed).length;
  if (!count) return;
  if (!confirm(`Remove ${count} checked item${count===1?"":"s"}?`)) return;
  list.items = list.items.filter(item => !item.completed);
  list.updatedAt = Date.now();
  render();
}

function createListFromTemplate(templateId) {
  const template = LIST_TEMPLATES[templateId];
  if (!template) return;
  const list = normalizeList({
    id: createId(),
    name: template.name,
    icon: template.icon,
    space: preferredSpace(),
    items: template.items.map(title => ({ id: createId(), title, detail: "", completed: false })),
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
  state.lists.push(list);
  state.activeListId = list.id;
  showToast(`${list.name} created ☑️`);
  render();
}

/* ================= LIVING TABLES ================= */

function renderTables(){
  const container=document.getElementById("pageContent");
  const tables=filterByMode(state.tables); if(!tables.find(t=>t.id===state.activeTableId))state.activeTableId=tables[0]?.id||"";
  const table=tables.find(t=>t.id===state.activeTableId);
  container.innerHTML=`<div class="page-heading"><p class="eyebrow">TRACKERS & LIVING TABLES</p><h1>Trackers</h1><p>Track progress, status, due dates, remarks, money, or anything structured. Add or remove rows and columns whenever the tracker changes.</p></div>
    <div class="table-tabs">${tables.map(t=>`<button class="table-tab ${t.id===state.activeTableId?"active":""}" data-select-table="${t.id}">${escapeHTML(t.name)}</button>`).join("")}<button class="table-tab" data-open="tableModal">+ New tracker</button></div>
    ${table?renderSingleTable(table):emptyState("📋","No trackers yet","Start with the standard Progress Tracker or build your own columns.","Create tracker","open-table")}`;
}

function renderSingleTable(table){return `<div class="table-head-actions"><button class="primary-button" data-add-row="${table.id}">+ Add row</button><button class="secondary-button" data-edit-table="${table.id}">Edit tracker</button></div><div class="table-wrapper"><table class="smart-table"><thead><tr>${table.columns.map(c=>`<th>${escapeHTML(c.name)}</th>`).join("")}<th>Actions</th></tr></thead><tbody>${table.rows.length?table.rows.map(row=>`<tr>${table.columns.map(c=>`<td>${renderTableCell(c,row.values[c.id],table.id,row.id)}</td>`).join("")}<td><button class="table-row-action" data-edit-row="${row.id}" data-table-id="${table.id}">Edit</button> <button class="table-row-action" data-row-to-task="${row.id}" data-table-id="${table.id}">→ Task</button> <button class="table-row-action" data-row-remind="${row.id}" data-table-id="${table.id}">🔔</button></td></tr>`).join(""):`<tr><td colspan="${table.columns.length+1}">No rows yet.</td></tr>`}</tbody></table></div>`;}

function renderTableCell(col,value,tableId,rowId){if(col.type==="checkbox")return `<input class="cell-checkbox" type="checkbox" ${value?"checked":""} data-table-check="${tableId}" data-row-id="${rowId}" data-col-id="${col.id}" />`;if(col.type==="money")return formatCurrency(value);if(col.type==="date")return value?formatDate(value):"—";if(col.type==="link")return value?`<a href="${escapeHTML(value)}" target="_blank" rel="noopener">Open</a>`:"—";if(col.type==="status")return `<span class="badge badge-${String(value||"upcoming").toLowerCase()}">${escapeHTML(value||"upcoming")}</span>`;if(col.type==="progress"){const pct=Math.max(0,Math.min(100,Number(value||0)));return `<div class="table-progress"><div class="table-progress-bar"><span style="width:${pct}%"></span></div><strong>${pct}%</strong></div>`;}return escapeHTML(value??"")||"—";}

function parseTableColumns(text){return parseLines(text).map(line=>{const [nameRaw,typeRaw]=line.split(":");const name=(nameRaw||"Column").trim();const type=validColumnType((typeRaw||"text").trim().toLowerCase());return{id:createId(),name,type};});}

const TABLE_TEMPLATES={progress:{name:"Progress Tracker",columns:"Item:text\nProgress:progress\nStatus:status\nDue:date\nRemarks:text\nDone:checkbox"},project:{name:"Project Tracker",columns:"Task:text\nOwner:text\nProgress:progress\nStatus:status\nDue:date\nRemarks:text"},expenses:{name:"Expense Tracker",columns:"Item:text\nAmount:money\nDate:date\nStatus:status\nRemarks:text"},blank:{name:"",columns:"Item:text"}};
function applyTableTemplate(templateId,force=false){const template=TABLE_TEMPLATES[templateId]||TABLE_TEMPLATES.progress;const name=document.getElementById("tableName"),columns=document.getElementById("tableColumns");if(force||!name.value.trim())name.value=template.name;if(force||!columns.value.trim())columns.value=template.columns;}
function clearTableForm(){refreshSpaceSelects();document.getElementById("tableEditId").value="";document.getElementById("tableTemplate").value="progress";document.getElementById("tableName").value="";document.getElementById("tableSpace").value=preferredSpace();document.getElementById("tableColumns").value="";applyTableTemplate("progress",true);document.getElementById("tableModalEyebrow").textContent="TRACKER / TABLE";document.getElementById("tableModalTitle").textContent="Create tracker";document.getElementById("saveTableButton").textContent="Create tracker";document.getElementById("deleteTableFromModal").classList.add("hidden");}
function openTableModal(id=""){clearTableForm();const t=state.tables.find(t=>t.id===id);if(t){document.getElementById("tableEditId").value=t.id;document.getElementById("tableTemplate").value="blank";document.getElementById("tableName").value=t.name;document.getElementById("tableSpace").value=t.space;document.getElementById("tableColumns").value=t.columns.map(c=>`${c.name}:${c.type}`).join("\n");document.getElementById("tableModalTitle").textContent="Edit tracker";document.getElementById("saveTableButton").textContent="Save tracker";document.getElementById("deleteTableFromModal").classList.remove("hidden");}openModal("tableModal");}

function saveTable(){const id=document.getElementById("tableEditId").value;const old=id?state.tables.find(t=>t.id===id):null;const name=document.getElementById("tableName").value.trim();const parsed=parseTableColumns(document.getElementById("tableColumns").value);if(!name)return showToast("Give the table a name 🌸");if(!parsed.length)return showToast("Add at least one column.");let columns=parsed;if(old){columns=parsed.map(c=>{const match=old.columns.find(x=>x.name.toLowerCase()===c.name.toLowerCase()&&x.type===c.type);return match?{...match,name:c.name}:c;});}const table=normalizeTable({...(old||{}),id:id||createId(),name,space:document.getElementById("tableSpace").value,columns,rows:old?.rows||[],createdAt:old?.createdAt||Date.now()});if(old)state.tables[state.tables.findIndex(t=>t.id===id)]=table;else{state.tables.push(table);state.activeTableId=table.id;}closeModal("tableModal");showToast(old?"Table updated 📋":"Table created 📋");render();}
function deleteTable(id){const table=state.tables.find(t=>t.id===id);if(!table||!confirm("Move this table and all its rows to Trash?"))return;const linkedReminders=state.reminders.filter(r=>r.linkedTableId===id);moveToTrash("table",table,{linkedReminders});state.tables=state.tables.filter(t=>t.id!==id);state.reminders=state.reminders.filter(r=>r.linkedTableId!==id);state.activeTableId=state.tables[0]?.id||"";closeModal("tableModal");render();}

function openTableRowModal(tableId,rowId=""){const table=state.tables.find(t=>t.id===tableId);if(!table)return;const row=table.rows.find(r=>r.id===rowId);document.getElementById("tableRowTableId").value=tableId;document.getElementById("tableRowEditId").value=rowId;document.getElementById("tableRowModalTitle").textContent=row?`Edit ${table.name} row`:`Add to ${table.name}`;document.getElementById("deleteTableRowFromModal").classList.toggle("hidden",!row);document.getElementById("tableRowReminder").checked=false;document.getElementById("tableRowFields").innerHTML=table.columns.map(c=>tableFieldHTML(c,row?.values[c.id])).join("");openModal("tableRowModal");}
function tableFieldHTML(col,value){const id=`rowField_${col.id}`;if(col.type==="checkbox")return `<label class="check-row"><input id="${id}" data-row-field="${col.id}" data-col-type="checkbox" type="checkbox" ${value?"checked":""}/><span>${escapeHTML(col.name)}</span></label>`;if(col.type==="status")return `<div class="form-group"><label>${escapeHTML(col.name)}</label><select id="${id}" data-row-field="${col.id}" data-col-type="status"><option value="upcoming" ${value==="upcoming"?"selected":""}>Upcoming</option><option value="todo" ${value==="todo"?"selected":""}>To Do</option><option value="doing" ${value==="doing"?"selected":""}>Doing</option><option value="waiting" ${value==="waiting"?"selected":""}>Waiting</option><option value="done" ${value==="done"?"selected":""}>Done</option><option value="paid" ${value==="paid"?"selected":""}>Paid</option></select></div>`;if(col.type==="progress")return `<div class="form-group"><label>${escapeHTML(col.name)} (%)</label><input id="${id}" data-row-field="${col.id}" data-col-type="progress" type="number" min="0" max="100" step="5" value="${Math.max(0,Math.min(100,Number(value||0)))}" /></div>`;const inputType=["date","reminder"].includes(col.type)?"date":(["number","money"].includes(col.type)?"number":col.type==="link"?"url":"text");return `<div class="form-group"><label>${escapeHTML(col.name)}</label><input id="${id}" data-row-field="${col.id}" data-col-type="${col.type}" type="${inputType}" ${col.type==="money"?'step="0.01"':""} value="${escapeHTML(value??"")}" /></div>`;}

function saveTableRow(){const table=state.tables.find(t=>t.id===document.getElementById("tableRowTableId").value);if(!table)return;const rowId=document.getElementById("tableRowEditId").value;const old=table.rows.find(r=>r.id===rowId);const values={};document.querySelectorAll("[data-row-field]").forEach(el=>{const type=el.dataset.colType;values[el.dataset.rowField]=type==="checkbox"?el.checked:(["number","money","progress"].includes(type)?Number(el.value||0):el.value);});const row={id:rowId||createId(),values,createdAt:old?.createdAt||Date.now()};if(old)table.rows[table.rows.findIndex(r=>r.id===rowId)]=row;else table.rows.push(row);if(document.getElementById("tableRowReminder").checked)createReminderFromTableRow(table,row);closeModal("tableRowModal");showToast("Row saved 📋");render();}
function deleteTableRow(tableId,rowId){const t=state.tables.find(t=>t.id===tableId);const row=t?.rows.find(r=>r.id===rowId);if(!t||!row||!confirm("Move this row to Trash?"))return;const linkedReminders=state.reminders.filter(r=>r.linkedTableId===tableId&&r.linkedRowId===rowId);moveToTrash("tableRow",row,{tableId,tableName:t.name,linkedReminders});t.rows=t.rows.filter(r=>r.id!==rowId);state.reminders=state.reminders.filter(r=>!(r.linkedTableId===tableId&&r.linkedRowId===rowId));closeModal("tableRowModal");render();}
function rowTitle(table,row){const col=table.columns.find(c=>["text","tag"].includes(c.type));return String(row.values[col?.id]||`${table.name} row`);}
function rowDate(table,row){const col=table.columns.find(c=>["date","reminder"].includes(c.type));return row.values[col?.id]||"";}
function createReminderFromTableRow(table,row){const title=rowTitle(table,row),date=rowDate(table,row);if(!date)return showToast("This row needs a date column before Hana can remind you.");const existing=state.reminders.find(r=>r.linkedTableId===table.id&&r.linkedRowId===row.id);const rem=normalizeReminder({...(existing||{}),id:existing?.id||createId(),title,space:table.space,date,time:"09:00",repeatType:"none",linkedTableId:table.id,linkedRowId:row.id,completed:false,notified:false,createdAt:existing?.createdAt||Date.now()});if(existing)state.reminders[state.reminders.findIndex(r=>r.id===existing.id)]=rem;else state.reminders.push(rem);showToast("Row reminder created 🔔");}
function createTaskFromTableRow(table,row){const task=normalizeTask({title:rowTitle(table,row),space:table.space,priority:"medium",status:"todo",dueDate:rowDate(table,row),project:table.name,tags:["from-table"],notes:`Created from ${table.name}`,createdAt:Date.now()});state.tasks.push(task);showToast("Table row became a task 🌱");render();}

/* ================= BRAIN DUMP / INBOX ================= */

function predictCapture(text){const value=text.trim().toLowerCase();if(!value)return{type:"unknown",label:"🌱 Something new"};if(/\b(remind|appointment|dentist|doctor|meeting|due|tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}:\d{2}|\d+\s?(am|pm))\b/.test(value))return{type:"task",label:"✅ Task + date/reminder candidate"};if(value.includes("|")||value.startsWith("table:"))return{type:"table",label:"📋 Table item"};if(/\b(maybe|someday|one day|want to|learn|visit|try)\b/.test(value))return{type:"someday",label:"🌱 Someday"};if(/^(buy|send|finish|submit|call|email|book|pay|check|clean|prepare|review|ask|follow up)\b/.test(value))return{type:"task",label:"✅ Task"};return{type:"note",label:"📝 Note"};}

function updateCapturePrediction(){const input=document.getElementById("quickCaptureInput");const p=document.getElementById("capturePrediction");if(!input||!p)return;const lines=parseLines(input.value);p.textContent=lines.length>1?`🧠 ${lines.length} items · Hana can organize these` : predictCapture(input.value).label;}
function extractDate(text){const lower=text.toLowerCase();if(lower.includes("tomorrow"))return addDaysISO(todayISO(),1);if(lower.includes("today"))return todayISO();const days={sunday:0,monday:1,tuesday:2,wednesday:3,thursday:4,friday:5,saturday:6};for(const [name,day] of Object.entries(days)){if(lower.includes(name)){const d=new Date();let diff=(day-d.getDay()+7)%7;if(diff===0)diff=7;d.setDate(d.getDate()+diff);return localDateISO(d);}}return"";}
function plantText(text,space="personal"){const pred=predictCapture(text);if(pred.type==="task"){const dueDate=extractDate(text);const task=normalizeTask({title:text,space,priority:"medium",status:"todo",dueDate,reminderEnabled:Boolean(dueDate),createdAt:Date.now()});state.tasks.push(task);if(task.reminderEnabled)syncTaskReminder(task);return"task";}if(pred.type==="someday"){state.someday.push({id:createId(),title:text,category:"ideas",notes:"",createdAt:Date.now()});return"someday";}if(pred.type==="table"){const table=state.tables[0];if(table){const row={id:createId(),values:{},createdAt:Date.now()};const textCol=table.columns.find(c=>c.type==="text");if(textCol)row.values[textCol.id]=text;table.rows.push(row);}return"table";}state.notes.push(normalizeNote({title:text.slice(0,55),content:text,space,pinned:false,createdAt:Date.now()}));return"note";}
function saveQuickCapture(){const text=document.getElementById("quickCaptureInput").value.trim();const space=document.getElementById("captureSpace").value;if(!text)return showToast("Write something first 🌸");const lines=parseLines(text);lines.forEach(line=>plantText(line,space));document.getElementById("quickCaptureInput").value="";closeModal("quickCaptureModal");showToast(`${lines.length} item${lines.length===1?"":"s"} planted 🌱`);render();}
function sendQuickCaptureToInbox(){const text=document.getElementById("quickCaptureInput").value.trim();const space=document.getElementById("captureSpace").value;if(!text)return showToast("Write something first 🌸");const lines=parseLines(text);lines.forEach(line=>state.inbox.push({id:createId(),text:line,space,prediction:predictCapture(line).type,createdAt:Date.now()}));document.getElementById("quickCaptureInput").value="";closeModal("quickCaptureModal");showToast(`${lines.length} item${lines.length===1?"":"s"} sent to Inbox 🧠`);render();}

function renderInbox(){const container=document.getElementById("pageContent");const defaultSpace=preferredSpace();container.innerHTML=`<div class="page-heading"><p class="eyebrow">MESSY BRAIN, CLEAN GARDEN</p><h1>Brain Dump</h1><p>Dump first. Decide what things are later.</p></div><div class="inbox-compose"><textarea id="brainDumpText" class="large-textarea" placeholder="Paste or type one thing per line..."></textarea><div class="form-row brain-dump-controls" style="margin-top:9px;"><select id="brainDumpSpace">${spaceOptionsHTML(defaultSpace," default")}</select><button class="primary-button" id="brainDumpAddButton">Organize lines ✨</button></div></div><section class="section"><div class="section-header"><h2>Inbox <span class="brain-dump-count">${state.inbox.length}</span></h2>${state.inbox.length?`<button data-plant-all-inbox>Plant all</button>`:""}</div>${state.inbox.length?state.inbox.map(inboxCard).join(""):emptyState("🧠","Inbox zero","Nothing is waiting to be organized.","","")}</section>`;}
function inboxCard(item){const p=predictCapture(item.text);return `<div class="inbox-item"><div><strong style="font-size:12px;">${escapeHTML(item.text)}</strong><div class="inbox-prediction">${p.label}</div><div class="task-meta" style="margin-top:6px;">${modeLabel(item.space)}</div></div><div class="inbox-actions"><button class="mini-icon-button" data-plant-inbox="${item.id}">🌱</button><button class="mini-icon-button" data-delete-inbox="${item.id}">×</button></div></div>`;}
function addBrainDump(){const text=document.getElementById("brainDumpText")?.value.trim();const space=document.getElementById("brainDumpSpace")?.value||"personal";if(!text)return showToast("Add a few thoughts first 🌸");parseLines(text).forEach(line=>state.inbox.push({id:createId(),text:line,space,prediction:predictCapture(line).type,createdAt:Date.now()}));showToast("Brain dump organized into the Inbox 🧠");render();}
function plantInboxItem(id){const item=state.inbox.find(i=>i.id===id);if(!item)return;plantText(item.text,item.space);state.inbox=state.inbox.filter(i=>i.id!==id);showToast("Planted 🌱");render();}
function plantAllInbox(){const items=[...state.inbox];items.forEach(i=>plantText(i.text,i.space));state.inbox=[];showToast(`${items.length} items planted 🌸`);render();}

/* ================= UNIVERSAL SEARCH ================= */

function globalSearch(query){
  const q=query.trim().toLowerCase();
  if(!q)return[];
  const results=[];
  const add=(type,id,title,snippet,page)=>results.push({type,id,title,snippet,page});
  filterByMode(state.tasks).forEach(t=>{if([t.title,t.project,t.notes,t.waitingOn,...t.tags,...t.subtasks.map(s=>s.title)].join(" ").toLowerCase().includes(q))add("Task",t.id,t.title,t.project||t.notes,"tasks")});
  filterByMode(state.notes).forEach(n=>{if([n.title,n.content,...n.tags,...n.checklist.map(i=>i.title)].join(" ").toLowerCase().includes(q))add("Note",n.id,n.title,n.content,"notes")});
  filterByMode(state.reminders).forEach(r=>{if(r.title.toLowerCase().includes(q))add("Reminder",r.id,r.title,`${formatDate(r.date)} ${formatTime(r.time)}`,"reminders")});
  filterByMode(state.tables).forEach(t=>{if(t.name.toLowerCase().includes(q))add("Table",t.id,t.name,`${t.rows.length} rows`,"tables");t.rows.forEach(row=>{const blob=Object.values(row.values).join(" ").toLowerCase();if(blob.includes(q))add("Table row",`${t.id}:${row.id}`,rowTitle(t,row),t.name,"tables")})});
  filterByMode(state.lists).forEach(list=>{const blob=[list.name,...list.items.map(item=>`${item.title} ${item.detail}`)].join(" ").toLowerCase();if(blob.includes(q))add("Checklist",list.id,`${list.icon} ${list.name}`,`${list.items.length} items`,"lists")});
  filterByMode(state.pins).forEach(p=>{if([p.title,p.content].join(" ").toLowerCase().includes(q))add("Pin",p.id,p.title,p.content,"pinboard")});
  state.someday.forEach(s=>{if([s.title,s.notes].join(" ").toLowerCase().includes(q))add("Someday",s.id,s.title,s.notes,"someday")});
  state.inbox.filter(i=>state.currentMode==="all"||i.space===state.currentMode).filter(i=>!firewallIsActive()||i.space!=="work").forEach(i=>{if(i.text.toLowerCase().includes(q))add("Inbox",i.id,i.text,predictCapture(i.text).label,"inbox")});
  return results.slice(0,40);
}
function renderGlobalSearchResults(query){const el=document.getElementById("globalSearchResults");if(!el)return;const results=globalSearch(query);el.innerHTML=query.trim()?results.length?results.map(r=>`<button class="search-result" data-search-type="${r.type}" data-search-id="${r.id}" data-search-page="${r.page}"><strong>${escapeHTML(r.title)}</strong><small>${escapeHTML(r.type)}</small><div class="search-result-snippet">${escapeHTML(String(r.snippet||"")).slice(0,140)}</div></button>`).join(""):`<div class="empty-state"><div class="empty-icon">🔎</div><h3>No matches</h3><p>Try another word.</p></div>`:`<div class="empty-state"><div class="empty-icon">🌸</div><h3>Search everything</h3><p>Tasks, notes, reminders, trackers, checklists, pins, Someday and Inbox.</p></div>`;}
function openSearchResult(type,id,page){closeModal("searchModal");if(type==="Task")return openTaskModal(id);if(type==="Note")return openNoteModal(id);if(type==="Reminder")return openReminderModal(id);if(type==="Table"){state.activeTableId=id;return changePage("tables");}if(type==="Checklist"){state.activeListId=id;return changePage("lists");}if(type==="Table row"){const[tid,rid]=id.split(":");state.activeTableId=tid;changePage("tables");return setTimeout(()=>openTableRowModal(tid,rid),50);}changePage(page);}

/* ================= RESCUE MY DAY + TIME POCKETS ================= */

function getRescuePlan() {
  const active = filterByMode(state.tasks).filter(task => !task.completed && task.status !== "waiting" && task.status !== "blocked");
  const candidates = active.filter(task => state.focusTaskIds.includes(task.id) || (task.dueDate && task.dueDate <= todayISO()));
  const hard = candidates.filter(task => task.deadlineType === "hard" && task.dueDate && task.dueDate <= todayISO());
  const flexible = candidates.filter(task => !hard.some(item => item.id === task.id)).sort((a, b) => {
    const priority = priorityWeight(b.priority) - priorityWeight(a.priority);
    if (priority) return priority;
    if (Boolean(a.dueDate) !== Boolean(b.dueDate)) return a.dueDate ? -1 : 1;
    return taskSort(a, b);
  });
  const capacity = Math.max(30, Number(state.settings.dailyCapacityMinutes || 240));
  const keep = [...hard];
  let minutes = hard.reduce((sum, task) => sum + taskPlanningMinutes(task), 0);
  const move = [];

  flexible.forEach(task => {
    const taskMinutes = taskPlanningMinutes(task);
    if (minutes + taskMinutes <= capacity) {
      keep.push(task);
      minutes += taskMinutes;
    } else {
      move.push(task);
    }
  });
  return { keep, move, minutes, capacity, hardMinutes: hard.reduce((sum, task) => sum + taskPlanningMinutes(task), 0) };
}

function rescueTaskRow(task, action) {
  return `<div class="rescue-task-row"><div><strong>${escapeHTML(task.title)}</strong><div class="task-meta"><span>⏱ ${formatDuration(task.durationMinutes)}</span><span>${energyLabel(task.energy)}</span>${task.dueDate ? `<span>${deadlineLabel(task)} · ${formatDate(task.dueDate)}</span>` : ""}</div></div><span class="rescue-action-label">${action}</span></div>`;
}

function renderRescueDay() {
  const c = document.getElementById("pageContent");
  const plan = getRescuePlan();
  const hardOver = Math.max(0, plan.hardMinutes - plan.capacity);
  c.innerHTML = `
    <div class="page-heading"><p class="eyebrow">WHEN THE DAY GOES SIDEWAYS</p><h1>Rescue My Day 🛟</h1><p>Hana protects hard deadlines, keeps what can realistically fit, and gently moves the rest.</p></div>
    <div class="rescue-summary ${hardOver ? "rescue-warning" : ""}">
      <strong>${hardOver ? "Hard deadlines already exceed today's Bloom Budget." : `${formatDuration(plan.minutes)} of ${formatDuration(plan.capacity)} will stay today.`}</strong>
      <p>${hardOver ? `They are ${formatDuration(hardOver)} over capacity, so Hana will not pretend the day fits. You can still apply the plan without moving hard deadlines.` : `${plan.move.length} task${plan.move.length === 1 ? "" : "s"} can be released from today.`}</p>
    </div>
    <section class="section"><div class="section-header"><h2>Keep today · ${plan.keep.length}</h2></div>${plan.keep.length ? `<div class="rescue-list">${plan.keep.map(task => rescueTaskRow(task, task.deadlineType === "hard" && task.dueDate <= todayISO() ? "Protected" : "Keep")).join("")}</div>` : emptyState("🌿","Nothing must stay","Today can be very light.","","")}</section>
    <section class="section"><div class="section-header"><h2>Release · ${plan.move.length}</h2></div>${plan.move.length ? `<div class="rescue-list">${plan.move.map(task => rescueTaskRow(task, task.dueDate && task.dueDate <= todayISO() ? "Move to tomorrow" : "Remove from bouquet")).join("")}</div>` : `<div class="card soft-card"><strong>Your day already fits 🌸</strong></div>`}</section>
    <div class="rescue-footer"><button class="secondary-button" data-goto="today">Cancel</button><button class="primary-button" data-apply-rescue ${plan.move.length || plan.keep.length ? "" : "disabled"}>Apply rescue plan</button></div>`;
}

function applyRescuePlan() {
  const plan = getRescuePlan();
  const tomorrow = addDaysISO(todayISO(), 1);
  state.focusTaskIds = plan.keep.map(task => task.id);
  plan.move.forEach(task => {
    if (task.dueDate && task.dueDate <= todayISO() && task.deadlineType !== "hard") {
      task.dueDate = tomorrow;
      task.rescheduleCount = Number(task.rescheduleCount || 0) + 1;
      task.updatedAt = Date.now();
      syncTaskReminder(task);
    }
  });
  showToast(`Day rescued 🌷 ${plan.move.length} task${plan.move.length === 1 ? "" : "s"} released.`);
  changePage("today");
}

function renderTimePockets() {
  const c = document.getElementById("pageContent");
  const minutes = Number(state.timePocketMinutes || 30);
  const energy = state.timePocketEnergy || "any";
  const tasks = filterByMode(state.tasks)
    .filter(task => !task.completed && !["waiting", "blocked"].includes(task.status))
    .filter(task => taskPlanningMinutes(task) <= minutes)
    .filter(task => energy === "any" || task.energy === energy)
    .sort((a, b) => {
      const hardA = a.deadlineType === "hard" && a.dueDate && a.dueDate <= todayISO() ? 1 : 0;
      const hardB = b.deadlineType === "hard" && b.dueDate && b.dueDate <= todayISO() ? 1 : 0;
      if (hardA !== hardB) return hardB - hardA;
      const priority = priorityWeight(b.priority) - priorityWeight(a.priority);
      return priority || taskSort(a, b);
    });
  const minuteOptions = [10, 15, 30, 45, 60, 90];
  const energyOptions = [["any","Any"],["low","🌿 Low"],["medium","🌸 Medium"],["high","⚡ High"]];
  c.innerHTML = `
    <div class="page-heading"><p class="eyebrow">USE THE TIME YOU ACTUALLY HAVE</p><h1>Time Pockets ⏱</h1><p>Tell Hana how much time and energy you have. It will only surface tasks that fit.</p></div>
    <div class="pocket-controls"><div><span class="pocket-label">I have</span><div class="pocket-chip-row">${minuteOptions.map(value => `<button class="filter-chip ${minutes === value ? "active" : ""}" data-pocket-minutes="${value}">${value}m</button>`).join("")}</div></div><div><span class="pocket-label">My energy is</span><div class="pocket-chip-row">${energyOptions.map(([value,label]) => `<button class="filter-chip ${energy === value ? "active" : ""}" data-pocket-energy="${value}">${label}</button>`).join("")}</div></div></div>
    <section class="section"><div class="section-header"><h2>${tasks.length} task${tasks.length === 1 ? "" : "s"} fit</h2><button data-goto="today">Today</button></div>${tasks.length ? `<div class="task-list">${tasks.map(task => `<div class="pocket-task"><div class="pocket-task-main" data-edit-task="${task.id}"><strong>${escapeHTML(task.title)}</strong><div class="task-meta"><span>⏱ ${formatDuration(task.durationMinutes)}</span><span>${energyLabel(task.energy)}</span>${task.dueDate ? `<span>${deadlineLabel(task)} · ${formatDate(task.dueDate)}</span>` : ""}</div></div><button class="focus-add" data-pocket-focus="${task.id}">${state.focusTaskIds.includes(task.id) ? "In bouquet" : "+ Bouquet"}</button></div>`).join("")}</div>` : emptyState("🍃","Nothing fits this pocket","Try a little more time, another energy level, or add estimates to your tasks.",""," ")}</section>`;
}

/* ================= BLOOM / PIN / SOMEDAY ================= */

function renderBloom(){const container=document.getElementById("pageContent");const tasks=filterByMode(state.tasks);const completed=tasks.filter(t=>t.completed).length;const open=tasks.filter(t=>!t.completed).length;const notes=filterByMode(state.notes).length;const lists=filterByMode(state.lists).length;const spaceCounts=state.spaces.map(space=>({space,count:state.tasks.filter(t=>t.space===space.id&&!t.completed).length}));container.innerHTML=`<div class="page-heading"><p class="eyebrow">YOUR GARDEN</p><h1>Bloom View</h1><p>Progress as petals, not pressure.</p></div><div class="card bloom-view"><div class="bloom-flower"><div class="petal petal-1"><span>🌷 ${state.spaces.length}</span></div><div class="petal petal-2"><span>☑️ ${lists}</span></div><div class="petal petal-3"><span>📝 ${notes}</span></div><div class="petal petal-4"><span>🌱 ${open}</span></div><div class="petal petal-5"><span>✨ ${completed}</span></div><div class="bloom-center"><strong>${completed}</strong><span>BLOOMS</span></div></div><h3>Small steps. Beautiful results. 🌸</h3><div class="bloom-space-summary">${spaceCounts.map(({space,count})=>`<span>${escapeHTML(space.emoji)} ${escapeHTML(space.name)} · ${count}</span>`).join("")}</div></div>`;}
function renderPinboard(){const c=document.getElementById("pageContent");const pins=filterByMode(state.pins);c.innerHTML=`<div class="page-heading"><p class="eyebrow">KEEP IT HANDY</p><h1>Pinboard</h1><p>Quick references that don't need to become tasks.</p></div>${pins.length?`<div class="pin-grid">${pins.map(p=>`<article class="pin"><h3>${escapeHTML(p.title)}</h3><p>${escapeHTML(p.content)}</p><button class="text-button" style="position:absolute;bottom:7px;right:7px;" data-delete-pin="${p.id}">×</button></article>`).join("")}</div>`:emptyState("📌","Nothing pinned","Keep quick references here.","Add pin","open-pin")}<div style="margin-top:14px;"><button class="primary-button full-width" data-open="pinModal">+ Add pin</button></div>`;}
function savePin(){const title=document.getElementById("pinTitle").value.trim();if(!title)return showToast("Give your pin a title 🌸");state.pins.push({id:createId(),title,content:document.getElementById("pinContent").value.trim(),space:document.getElementById("pinSpace").value,createdAt:Date.now()});document.getElementById("pinTitle").value="";document.getElementById("pinContent").value="";closeModal("pinModal");render();}
function deletePin(id){const pin=state.pins.find(p=>p.id===id);if(pin&&confirm("Move this pin to Trash?")){moveToTrash("pin",pin);state.pins=state.pins.filter(p=>p.id!==id);render();}}
function somedayIcon(category){return({ideas:"💡",places:"📍",project:"🌱",books:"📚",learning:"🎓",other:"🌸"})[category]||"🌸";}
function renderSomeday(){const c=document.getElementById("pageContent");c.innerHTML=`<div class="page-heading"><p class="eyebrow">NOT NOW DOESN'T MEAN NEVER</p><h1>Someday</h1><p>Ideas without fake urgency.</p></div>${state.someday.length?state.someday.map(i=>`<article class="someday-card"><div class="someday-symbol">${somedayIcon(i.category)}</div><div style="flex:1;"><h3>${escapeHTML(i.title)}</h3><p>${escapeHTML(i.notes||"")}</p><span class="badge badge-personal">${escapeHTML(i.category)}</span></div><button class="mini-icon-button" data-delete-someday="${i.id}">×</button></article>`).join(""):emptyState("🌱","Your someday garden is empty","Ideas can wait here without becoming chores.","Save an idea","open-someday")}<div style="margin-top:14px;"><button class="primary-button full-width" data-open="somedayModal">+ Save for someday</button></div>`;}
function saveSomeday(){const title=document.getElementById("somedayTitle").value.trim();if(!title)return showToast("Save an idea first 🌱");state.someday.push({id:createId(),title,category:document.getElementById("somedayCategory").value,notes:document.getElementById("somedayNotes").value.trim(),createdAt:Date.now()});document.getElementById("somedayTitle").value="";document.getElementById("somedayNotes").value="";closeModal("somedayModal");render();}
function deleteSomeday(id){const item=state.someday.find(s=>s.id===id);if(item&&confirm("Move this someday item to Trash?")){moveToTrash("someday",item);state.someday=state.someday.filter(s=>s.id!==id);render();}}

/* ================= DAILY CLOSE ================= */

function renderDailyClose(){const c=document.getElementById("pageContent");const unfinished=filterByMode(state.tasks).filter(t=>!t.completed&&t.dueDate&&t.dueDate<=todayISO());const completedToday=state.tasks.filter(t=>t.completedDate===todayISO()).length;c.innerHTML=`<div class="page-heading"><p class="eyebrow">CLEAR THE GARDEN</p><h1>Daily Close</h1><p>Process unfinished things instead of waking up to a pile of accidental overdue tasks.</p></div><section class="daily-close-hero"><div class="daily-close-icon">🌙</div><h2>You did enough for one day.</h2><p style="color:var(--text-soft);font-size:12px;">${formatLongToday()}</p><div class="stat-grid"><div class="stat-card"><span class="stat-number">${completedToday}</span><span class="stat-label">Completed</span></div><div class="stat-card"><span class="stat-number">${unfinished.length}</span><span class="stat-label">Process</span></div><div class="stat-card"><span class="stat-number">${state.someday.length}</span><span class="stat-label">Someday</span></div></div></section><section class="section"><div class="section-header"><h2>Unfinished</h2></div>${unfinished.length?`<div class="daily-task-review">${unfinished.map(t=>`<div class="daily-task-row"><div><strong>${escapeHTML(t.title)}</strong>${t.deadlineType==="hard"?`<div class="task-meta" style="margin-top:4px;"><span>🔒 Hard deadline · reschedule manually if the real deadline changed</span></div>`:""}</div><div class="daily-task-actions">${t.deadlineType==="hard"?`<button data-daily-task-action="edit" data-task-id="${t.id}">Schedule</button><button data-daily-task-action="delete" data-task-id="${t.id}">Delete</button>`:`<button data-daily-task-action="tomorrow" data-task-id="${t.id}">Tomorrow</button><button data-daily-task-action="week" data-task-id="${t.id}">Next week</button><button data-daily-task-action="someday" data-task-id="${t.id}">Someday</button><button data-daily-task-action="edit" data-task-id="${t.id}">Schedule</button><button data-daily-task-action="delete" data-task-id="${t.id}">Delete</button>`}</div></div>`).join("")}</div>`:`<div class="card soft-card"><strong>Nothing needs processing 🌸</strong></div>`}<button class="primary-button full-width" style="margin-top:15px;" data-close-action="finish">All set for today ✨</button></section>`;}
function dailyTaskAction(taskId,action){const t=state.tasks.find(t=>t.id===taskId);if(!t)return;if(t.deadlineType==="hard"&&["tomorrow","week","someday"].includes(action))return showToast("That date is protected as a hard deadline 🔒");if(action==="tomorrow"){t.dueDate=addDaysISO(todayISO(),1);t.rescheduleCount=Number(t.rescheduleCount||0)+1;}if(action==="week"){t.dueDate=addDaysISO(todayISO(),7);t.rescheduleCount=Number(t.rescheduleCount||0)+1;}if(action==="someday"){state.someday.push({id:createId(),title:t.title,category:"ideas",notes:t.notes,createdAt:Date.now()});deleteTaskSilent(taskId);}if(action==="delete"){const linkedReminders=state.reminders.filter(r=>r.linkedTaskId===taskId);moveToTrash("task",t,{linkedReminders});deleteTaskSilent(taskId);}if(action==="edit")return openTaskModal(taskId);if(t&&!t.completed)syncTaskReminder(t);render();}
function deleteTaskSilent(id){state.tasks=state.tasks.filter(t=>t.id!==id);state.reminders=state.reminders.filter(r=>r.linkedTaskId!==id);state.focusTaskIds=state.focusTaskIds.filter(x=>x!==id);}
function finishDailyClose(){state.dailyCloseHistory.push({date:todayISO(),completedAt:Date.now()});saveState();showToast("The garden is closed for today 🌙");}


/* ================= AGENDA / HISTORY / TEMPLATES / TRASH ================= */

function agendaItemTime(item) {
  return item.time ? formatTime(item.time) : "";
}

function renderAgendaTask(task) {
  return `<button class="agenda-item agenda-task" data-edit-task="${task.id}">
    <span class="agenda-icon">✅</span>
    <span class="agenda-copy">
      <strong>${escapeHTML(task.title)}</strong>
      <small>${modeLabel(task.space)}${task.project ? ` · 🌷 ${escapeHTML(task.project)}` : ""}${task.dueTime ? ` · ${formatTime(task.dueTime)}` : ""}</small>
    </span>
    <span class="badge badge-${task.status}">${statusLabel(task.status)}</span>
  </button>`;
}

function renderAgendaReminder(reminder) {
  return `<button class="agenda-item agenda-reminder" data-edit-reminder="${reminder.id}">
    <span class="agenda-icon">🔔</span>
    <span class="agenda-copy">
      <strong>${escapeHTML(reminder.title)}</strong>
      <small>${modeLabel(reminder.space)}${reminder.time ? ` · ${formatTime(reminder.time)}` : ""}</small>
    </span>
    ${reminder.chainEnabled ? `<span class="badge chain-badge">Chain</span>` : ""}
  </button>`;
}

function renderAgenda() {
  const c = document.getElementById("pageContent");
  const tasks = filterByMode(state.tasks).filter(task => !task.completed);
  const reminders = filterByMode(state.reminders).filter(reminder => !reminder.completed);
  const overdueTasks = tasks.filter(task => task.dueDate && task.dueDate < todayISO()).sort(taskSort);
  const datedTasks = tasks.filter(task => task.dueDate && task.dueDate >= todayISO());
  const datedReminders = reminders.filter(reminder => reminder.date && reminder.date >= todayISO());
  const unscheduled = tasks.filter(task => !task.dueDate).sort(taskSort).slice(0, 12);

  const days = Array.from({ length: 14 }, (_, index) => addDaysISO(todayISO(), index));
  const daySections = days.map(date => {
    const taskItems = datedTasks.filter(task => task.dueDate === date).sort(taskSort);
    const reminderItems = datedReminders
      .filter(reminder => reminder.date === date)
      .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));

    if (!taskItems.length && !reminderItems.length) return "";

    const heading = date === todayISO()
      ? `Today · ${formatFullDate(date)}`
      : date === addDaysISO(todayISO(), 1)
        ? `Tomorrow · ${formatFullDate(date)}`
        : formatFullDate(date);

    return `<section class="agenda-day">
      <div class="agenda-day-heading">
        <h2>${escapeHTML(heading)}</h2>
        <span>${taskItems.length + reminderItems.length}</span>
      </div>
      <div class="agenda-list">
        ${taskItems.map(renderAgendaTask).join("")}
        ${reminderItems.map(renderAgendaReminder).join("")}
      </div>
    </section>`;
  }).join("");

  c.innerHTML = `
    <div class="page-heading">
      <p class="eyebrow">THE NEXT TWO WEEKS, WITHOUT A FULL CALENDAR</p>
      <h1>Agenda</h1>
      <p>Tasks and reminders in one chronological view. Tap anything to edit it.</p>
    </div>

    ${overdueTasks.length ? `<section class="agenda-day agenda-overdue">
      <div class="agenda-day-heading"><h2>⚠️ Overdue</h2><span>${overdueTasks.length}</span></div>
      <div class="agenda-list">${overdueTasks.map(renderAgendaTask).join("")}</div>
    </section>` : ""}

    ${daySections || `<div class="card soft-card"><strong>Your next two weeks are quiet 🌸</strong></div>`}

    ${unscheduled.length ? `<section class="section">
      <div class="section-header"><h2>Unscheduled</h2><button data-goto="tasks">All tasks</button></div>
      <div class="agenda-list">${unscheduled.map(renderAgendaTask).join("")}</div>
    </section>` : ""}
  `;
}

function historyTimestamp(value) {
  if (!value) return 0;
  if (typeof value === "number") return value;
  const parsed = new Date(`${value}T23:59:59`).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function renderHistory() {
  const c = document.getElementById("pageContent");
  const completedTasks = filterByMode(state.tasks, { respectFirewall: false })
    .filter(task => task.completed)
    .map(task => ({
      kind: "task",
      id: task.id,
      icon: "🌸",
      title: task.title,
      meta: `${modeLabel(task.space)} · Completed ${task.completedDate ? formatDate(task.completedDate) : "earlier"}`,
      time: historyTimestamp(task.completedDate) || task.updatedAt || task.createdAt
    }));

  const completedReminders = filterByMode(state.reminders, { respectFirewall: false })
    .filter(reminder => reminder.completed)
    .map(reminder => ({
      kind: "reminder",
      id: reminder.id,
      icon: "🔔",
      title: reminder.title,
      meta: `${modeLabel(reminder.space)} · Cleared ${reminder.date ? formatDate(reminder.date) : ""}`,
      time: reminder.updatedAt || reminder.createdAt
    }));

  const closes = state.dailyCloseHistory.map((entry, index) => ({
    kind: "close",
    id: String(index),
    icon: "🌙",
    title: "Daily Close",
    meta: entry.date ? formatFullDate(entry.date) : "Completed",
    time: entry.completedAt || historyTimestamp(entry.date)
  }));

  const items = [...completedTasks, ...completedReminders, ...closes]
    .sort((a, b) => b.time - a.time)
    .slice(0, 75);

  c.innerHTML = `
    <div class="page-heading">
      <p class="eyebrow">WHAT YOU'VE ALREADY CARRIED</p>
      <h1>History</h1>
      <p>A calm record of completed tasks, cleared reminders and Daily Close sessions.</p>
    </div>

    <div class="history-summary">
      <div class="stat-card"><span class="stat-number">${completedTasks.length}</span><span class="stat-label">Tasks</span></div>
      <div class="stat-card"><span class="stat-number">${completedReminders.length}</span><span class="stat-label">Reminders</span></div>
      <div class="stat-card"><span class="stat-number">${closes.length}</span><span class="stat-label">Daily Closes</span></div>
    </div>

    ${items.length ? `<div class="history-list">${items.map(item => `
      <div class="history-item">
        <span class="history-icon">${item.icon}</span>
        <div>
          <strong>${escapeHTML(item.title)}</strong>
          <small>${escapeHTML(item.meta)}</small>
        </div>
        ${item.kind === "task" ? `<button data-reopen-task="${item.id}">Reopen</button>` : ""}
        ${item.kind === "reminder" ? `<button data-reopen-reminder="${item.id}">Reopen</button>` : ""}
      </div>
    `).join("")}</div>` : emptyState("🌸", "No history yet", "Completed things will gather here.", "", "")}
  `;
}

function reopenTask(id) {
  const task = state.tasks.find(task => task.id === id);
  if (!task) return;
  task.completed = false;
  task.completedDate = null;
  task.status = "todo";
  task.updatedAt = Date.now();
  syncTaskReminder(task);
  showToast("Task reopened 🌱");
  render();
}

function reopenReminder(id) {
  const reminder = state.reminders.find(reminder => reminder.id === id);
  if (!reminder) return;
  reminder.completed = false;
  reminder.notified = false;
  reminder.chainNotified = [];
  reminder.updatedAt = Date.now();
  showToast("Reminder reopened 🔔");
  render();
}

function renderTemplates() {
  const c = document.getElementById("pageContent");

  c.innerHTML = `
    <div class="page-heading">
      <p class="eyebrow">DON'T REBUILD THE SAME THING TWICE</p>
      <h1>Templates</h1>
      <p>Starter structures for things Hana users are likely to repeat.</p>
    </div>

    <div class="template-grid">
      ${STARTER_TEMPLATES.map(template => `
        <article class="template-card">
          <div class="template-icon">${template.icon}</div>
          <div>
            <h3>${escapeHTML(template.title)}</h3>
            <p>${escapeHTML(template.description)}</p>
            <span class="badge badge-personal">${escapeHTML(template.kind)}</span>
          </div>
          <button class="secondary-button" data-use-template="${template.id}">Use</button>
        </article>
      `).join("")}
    </div>

    <div class="card soft-card" style="margin-top:16px;">
      <strong>Why templates belong in Hana 🌸</strong>
      <p style="margin:6px 0 0;color:var(--text-soft);font-size:12px;line-height:1.5;">
        Grocery lists, packing lists, meeting notes, recurring reviews and tracking tables should feel reusable instead of disposable.
      </p>
    </div>
  `;
}

function useTemplate(templateId) {
  const space = preferredSpace();

  if (templateId === "weekly-review") {
    const task = normalizeTask({
      title: "Weekly Review",
      space,
      priority: "medium",
      status: "todo",
      subtasks: [
        { id:createId(), title:"Review open tasks", completed:false },
        { id:createId(), title:"Check Waiting On / follow-ups", completed:false },
        { id:createId(), title:"Choose next week's priorities", completed:false }
      ],
      recurrence: { type:"weekly", interval:1 },
      createdAt: Date.now()
    });
    state.tasks.push(task);
    showToast("Weekly Review template planted 🌱");
    return openTaskModal(task.id);
  }

  if (templateId === "monthly-life-admin") {
    const task = normalizeTask({
      title: "Monthly Life Admin",
      space: "personal",
      priority: "medium",
      status: "todo",
      subtasks: [
        { id:createId(), title:"Review bills and subscriptions", completed:false },
        { id:createId(), title:"Check documents / renewals", completed:false },
        { id:createId(), title:"Clear personal loose ends", completed:false }
      ],
      recurrence: { type:"monthly", interval:1 },
      createdAt: Date.now()
    });
    state.tasks.push(task);
    showToast("Monthly Life Admin planted 🌱");
    return openTaskModal(task.id);
  }

  if (templateId === "meeting-note") {
    const note = normalizeNote({
      title: "Meeting Notes",
      type: "meeting",
      space,
      tags: ["meeting"],
      content: "## Agenda\n\n## Decisions\n\n## Notes",
      checklist: [
        { id:createId(), title:"Action item", completed:false }
      ],
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    state.notes.push(note);
    showToast("Meeting note created 👥");
    return openNoteModal(note.id);
  }

  if (templateId === "grocery-list" || templateId === "packing-list") {
    const templateKey = templateId === "grocery-list" ? "grocery" : "packing";
    createListFromTemplate(templateKey);
    return changePage("lists");
  }

  if (templateId === "weekly-reset") {
    const note = normalizeNote({
      title: "Weekly Reset",
      type: "checklist",
      space,
      tags: ["weekly","home"],
      checklist: ["Review calendar", "Reset important spaces", "Plan meals / errands", "Choose personal priorities"].map(title => ({ id:createId(), title, completed:false })),
      resettable: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    state.notes.push(note);
    showToast("Weekly Reset created 🌷");
    return openNoteModal(note.id);
  }

  if (templateId === "work-deliverables" || templateId === "bills-tracker") {
    const isWork = templateId === "work-deliverables";
    const table = normalizeTable({
      id: createId(),
      name: isWork ? "Work Deliverables" : "Bills Tracker",
      space: isWork ? "work" : "personal",
      columns: isWork
        ? [
            { id:createId(), name:"Deliverable", type:"text" },
            { id:createId(), name:"Owner", type:"text" },
            { id:createId(), name:"Progress", type:"progress" },
            { id:createId(), name:"Due", type:"date" },
            { id:createId(), name:"Status", type:"status" },
            { id:createId(), name:"Remarks", type:"text" },
            { id:createId(), name:"Done", type:"checkbox" }
          ]
        : [
            { id:createId(), name:"Bill", type:"text" },
            { id:createId(), name:"Amount", type:"money" },
            { id:createId(), name:"Due", type:"date" },
            { id:createId(), name:"Paid", type:"checkbox" }
          ],
      rows: [],
      createdAt: Date.now()
    });
    state.tables.push(table);
    state.activeTableId = table.id;
    showToast(`${table.name} created 📋`);
    return changePage("tables");
  }

  showToast("Template not found.");
}

function renderTrash() {
  const c = document.getElementById("pageContent");
  const entries = [...state.trash].sort((a, b) => b.deletedAt - a.deletedAt);

  c.innerHTML = `
    <div class="page-heading">
      <p class="eyebrow">A SAFETY NET FOR LOCAL-FIRST HANA</p>
      <h1>Trash</h1>
      <p>Deleted items stay here for up to 30 days. Restore them or remove them permanently.</p>
    </div>

    ${entries.length ? `
      <div class="section-header"><h2>${entries.length} item${entries.length === 1 ? "" : "s"}</h2><button data-empty-trash>Empty Trash</button></div>
      <div class="trash-list">
        ${entries.map(entry => {
          const title = entry.item?.title || entry.item?.name || entry.item?.text || (entry.type === "tableRow" ? (entry.context?.tableName || "Table row") : "Untitled");
          return `<div class="trash-item">
            <span class="trash-icon">${({task:"✅",note:"📝",reminder:"🔔",table:"📋",tableRow:"↔️",pin:"📌",someday:"🌱",inbox:"🧠"})[entry.type] || "🌸"}</span>
            <div>
              <strong>${escapeHTML(String(title))}</strong>
              <small>${escapeHTML(trashLabel(entry.type))} · deleted ${new Date(entry.deletedAt).toLocaleDateString()}</small>
            </div>
            <div class="trash-actions">
              <button data-restore-trash="${entry.id}">Restore</button>
              <button class="danger-text" data-delete-trash="${entry.id}">Delete</button>
            </div>
          </div>`;
        }).join("")}
      </div>
    ` : emptyState("🗑️", "Trash is empty", "Deleted things can rest here before they're gone for good.", "", "")}
  `;
}


/* ================= MORE / SETTINGS / BACKUP ================= */

function moreCard(icon,title,description,page){return `<button class="more-card" data-goto="${page}"><span class="more-icon">${icon}</span><strong>${title}</strong><small>${description}</small></button>`;}
function renderMore(){const c=document.getElementById("pageContent");c.innerHTML=`
  <div class="page-heading"><p class="eyebrow">MORE OF HANA</p><h1>Your garden</h1><p>The tools that make Hana more than a checklist.</p></div>
  <div class="more-grid">
    ${moreCard("📅","Agenda","Tasks and reminders together for the next two weeks.","agenda")}
    ${moreCard("🛟","Rescue My Day","Protect deadlines and shrink an overloaded day.","rescue")}
    ${moreCard("⏱","Time Pockets","Find tasks that fit the time and energy you have.","time-pockets")}
    ${moreCard("☑️","Lists","Groceries, things to buy, packing and custom checklists.","lists")}
    ${moreCard("📊","Trackers","Editable rows and columns with progress, status and remarks.","tables")}
    ${moreCard("🧠","Brain Dump","Organize messy thoughts into useful things.","inbox")}
    ${moreCard("🔔","Reminders","Snooze, repeat and reminder chains.","reminders")}
    <button class="more-card" data-open-appearance><span class="more-icon">🎨</span><strong>Appearance</strong><small>Themes and a private local photo wallpaper.</small></button>
    ${moreCard("🧩","Templates","Reusable starting points for repeated workflows.","templates")}
    ${moreCard("🌸","Bloom View","Progress as petals.","bloom")}
    ${moreCard("📌","Pinboard","Quick references.","pinboard")}
    ${moreCard("🌱","Someday","Ideas without urgency.","someday")}
    ${moreCard("🌙","Daily Close","Process the day gently.","daily-close")}
    ${moreCard("🕰️","History","See what you already completed.","history")}
    ${moreCard("🗑️","Trash",`${state.trash.length} deleted item${state.trash.length===1?"":"s"}.`,"trash")}
  </div>

  <section class="section"><div class="section-header"><h2>Your spaces</h2></div><div class="settings-card">
    <h3>Organize Hana your way 🌷</h3><p>Work and Personal stay available, but you can rename them and create as many other spaces as you need.</p>
    <div class="space-manager-list">${state.spaces.map(space=>`<div class="space-manager-row"><span class="space-manager-label">${escapeHTML(space.emoji)} <strong>${escapeHTML(space.name)}</strong>${space.protected?`<small>Built in</small>`:""}</span><div><button class="text-button" data-edit-space="${escapeHTML(space.id)}">Edit</button>${space.protected?"":`<button class="text-button danger-text" data-delete-space="${escapeHTML(space.id)}">Remove</button>`}</div></div>`).join("")}</div>
    <div class="space-add-row"><input id="newSpaceEmoji" type="text" maxlength="4" value="🌸" aria-label="Space icon" /><input id="newSpaceName" type="text" placeholder="New space name" /><button class="secondary-button" id="addSpaceButton">Add space</button></div>
  </div></section>

  <section class="section"><div class="section-header"><h2>Planning defaults</h2></div><div class="settings-card"><h3>Your Bloom Budget 🌷</h3><p>Set how much task time you realistically want Hana to place in one day's Focus Bouquet. Tasks without an estimate count as 30 minutes.</p><div class="form-group"><label for="dailyCapacitySetting">Daily task capacity</label><div class="inline-field"><input id="dailyCapacitySetting" type="number" min="30" max="960" step="30" value="${Math.max(30,Number(state.settings.dailyCapacityMinutes||240))}" /><span>minutes</span></div></div><label class="check-row"><input id="overloadGuardrailSetting" type="checkbox" ${state.settings.overloadGuardrail!==false?"checked":""}/><span>Warn me before I overfill today's bouquet<small>You can still override Hana when a day genuinely needs to be full.</small></span></label><div class="form-group"><label for="defaultSpaceSetting">Default space</label><select id="defaultSpaceSetting">${spaceOptionsHTML(state.settings.defaultSpace)}</select></div></div></section>
  <section class="section"><div class="section-header"><h2>Work Firewall</h2></div><div class="settings-card"><h3>Protect personal time 🌙</h3><p>When enabled, Hana hides the built-in Work space outside your work window. Your other custom spaces stay visible.</p><label class="check-row"><input id="firewallEnabled" type="checkbox" ${state.settings.workFirewallEnabled?"checked":""}/><span>Enable Work Firewall</span></label><div class="settings-inline"><div class="form-group"><label>Work starts</label><input id="workStartSetting" type="time" value="${state.settings.workStart}" /></div><div class="form-group"><label>Work ends</label><input id="workEndSetting" type="time" value="${state.settings.workEnd}" /></div></div><label class="check-row"><input id="allowUrgentWorkSetting" type="checkbox" ${state.settings.allowHighPriorityWorkReminders?"checked":""}/><span>Allow high-priority linked work reminders outside work hours</span></label><button id="saveSettingsButton" class="secondary-button full-width">Save app settings</button></div></section>
  <section class="section"><div class="section-header"><h2>Backup & restore</h2></div><div class="settings-card"><p>Hana is still local-first. Export your garden regularly so your data does not live on one device only. Wallpaper photos are private device media and are not included in the JSON backup.</p><div class="data-actions"><button id="exportDataButton" class="secondary-button">Export backup</button><button id="importDataButton" class="secondary-button">Import backup</button></div></div></section>`;}

function saveSettings(){const selected=document.getElementById("defaultSpaceSetting")?.value;state.settings.defaultSpace=state.spaces.some(space=>space.id===selected)?selected:"personal";state.settings.dailyCapacityMinutes=Math.max(30,Math.min(960,Number(document.getElementById("dailyCapacitySetting")?.value||240)));state.settings.overloadGuardrail=Boolean(document.getElementById("overloadGuardrailSetting")?.checked);state.settings.workFirewallEnabled=document.getElementById("firewallEnabled").checked;state.settings.workStart=document.getElementById("workStartSetting").value||"08:00";state.settings.workEnd=document.getElementById("workEndSetting").value||"18:00";state.settings.allowHighPriorityWorkReminders=document.getElementById("allowUrgentWorkSetting").checked;showToast("Hana settings saved 🌷");render();}

function addCustomSpace(){const name=document.getElementById("newSpaceName")?.value.trim();const emoji=document.getElementById("newSpaceEmoji")?.value.trim()||"🌸";if(!name)return showToast("Give the space a name 🌸");const id=`space-${name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,24)||"custom"}-${Math.random().toString(36).slice(2,6)}`;state.spaces.push(normalizeSpace({id,name,emoji,protected:false}));showToast(`${emoji} ${name} added`);render();}
function editSpace(spaceId){const space=state.spaces.find(item=>item.id===spaceId);if(!space)return;const name=prompt("Space name",space.name);if(name===null)return;const cleanName=name.trim();if(!cleanName)return showToast("Space name can't be empty.");const emoji=prompt("Space icon / emoji",space.emoji);if(emoji===null)return;space.name=cleanName;space.emoji=(emoji.trim()||"🌸").slice(0,4);showToast("Space updated 🌷");render();}
function deleteSpace(spaceId){const space=state.spaces.find(item=>item.id===spaceId);if(!space||space.protected)return;if(!confirm(`Remove “${space.name}”? Items in it will move to Personal.`))return;[state.tasks,state.notes,state.reminders,state.tables,state.lists,state.pins,state.inbox].forEach(collection=>collection.forEach(item=>{if(item?.space===spaceId)item.space="personal";}));state.spaces=state.spaces.filter(item=>item.id!==spaceId);if(state.settings.defaultSpace===spaceId)state.settings.defaultSpace="personal";if(state.currentMode===spaceId)state.currentMode="all";showToast("Space removed; its items moved to Personal.");render();}

/* ================= APPEARANCE / WALLPAPER ================= */

let hanaWallpaperData = null;

function openHanaMediaDB() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) return reject(new Error("IndexedDB unavailable"));
    const request = indexedDB.open("hana_media_v1", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("media")) db.createObjectStore("media");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Unable to open media storage"));
  });
}

async function mediaGet(key) {
  const db = await openHanaMediaDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("media", "readonly");
    const request = tx.objectStore("media").get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

async function mediaPut(key, value) {
  const db = await openHanaMediaDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("media", "readwrite");
    tx.objectStore("media").put(value, key);
    tx.oncomplete = () => { db.close(); resolve(true); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

async function mediaDelete(key) {
  const db = await openHanaMediaDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("media", "readwrite");
    tx.objectStore("media").delete(key);
    tx.oncomplete = () => { db.close(); resolve(true); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("Unable to read image"));
    reader.readAsDataURL(file);
  });
}

async function resizeWallpaper(file) {
  const source = await fileToDataURL(file);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const maxSide = 1800;
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      try { resolve(canvas.toDataURL("image/jpeg", 0.84)); }
      catch (error) { reject(error); }
    };
    img.onerror = () => reject(new Error("That image could not be loaded."));
    img.src = source;
  });
}

function wallpaperOverlayAlpha() {
  return ({ light:0.30, medium:0.52, strong:0.72 })[state.appearance.overlayStrength] ?? 0.52;
}

async function ensureWallpaperLoaded() {
  if (hanaWallpaperData) return hanaWallpaperData;
  try { hanaWallpaperData = await mediaGet("wallpaper"); }
  catch (error) { console.warn("Wallpaper storage unavailable:", error); }
  return hanaWallpaperData;
}

async function applyAppearance() {
  document.body.dataset.theme = state.appearance.theme || "sakura";
  const data = await ensureWallpaperLoaded();
  const active = Boolean(state.appearance.wallpaperEnabled && data);
  document.body.classList.toggle("wallpaper-active", active);
  if (active) {
    const alpha = wallpaperOverlayAlpha();
    document.body.style.backgroundImage = `linear-gradient(rgba(255,255,255,${alpha}), rgba(255,255,255,${alpha})), url("${data}")`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundRepeat = "no-repeat";
    document.body.style.backgroundAttachment = "fixed";
    document.body.style.backgroundPosition = state.appearance.wallpaperPosition || "center";
  } else {
    document.body.style.removeProperty("background-image");
    document.body.style.removeProperty("background-size");
    document.body.style.removeProperty("background-repeat");
    document.body.style.removeProperty("background-attachment");
    document.body.style.removeProperty("background-position");
  }
  updateAppearanceControls();
}

function updateAppearanceControls() {
  const theme = state.appearance.theme || "sakura";
  document.querySelectorAll("[data-theme-choice]").forEach(button => button.classList.toggle("active", button.dataset.themeChoice === theme));
  const currentLabel = document.getElementById("currentThemeLabel");
  if (currentLabel) currentLabel.textContent = THEME_LABELS[theme] || "Sakura Pink";
  document.querySelectorAll("[data-overlay-strength]").forEach(button => button.classList.toggle("active", button.dataset.overlayStrength === state.appearance.overlayStrength));
  const enabled = document.getElementById("wallpaperEnabled");
  if (enabled) enabled.checked = Boolean(state.appearance.wallpaperEnabled && hanaWallpaperData);
  const stateLabel = document.getElementById("wallpaperStateLabel");
  if (stateLabel) stateLabel.textContent = state.appearance.wallpaperEnabled && hanaWallpaperData ? "On" : "Off";
  const position = document.getElementById("wallpaperPosition");
  if (position) position.value = state.appearance.wallpaperPosition || "center";
  const preview = document.getElementById("wallpaperPreview");
  if (preview) {
    if (hanaWallpaperData) {
      preview.classList.add("has-photo");
      preview.style.backgroundImage = `url("${hanaWallpaperData}")`;
      preview.style.backgroundPosition = state.appearance.wallpaperPosition || "center";
      preview.innerHTML = "";
    } else {
      preview.classList.remove("has-photo");
      preview.style.removeProperty("background-image");
      preview.innerHTML = "<span>Choose a photo from this device.<br />It stays private and local to Hana.</span>";
    }
  }
}

async function openAppearanceModal() {
  await ensureWallpaperLoaded();
  updateAppearanceControls();
  openModal("appearanceModal");
}

async function chooseWallpaper(file) {
  if (!file) return;
  try {
    showToast("Preparing wallpaper…");
    hanaWallpaperData = await resizeWallpaper(file);
    await mediaPut("wallpaper", hanaWallpaperData);
    state.appearance.wallpaperEnabled = true;
    saveState();
    await applyAppearance();
    showToast("Wallpaper saved locally 🌸");
  } catch (error) {
    console.error(error);
    showToast("Hana couldn't use that photo. Try a JPG or PNG.");
  } finally {
    const input = document.getElementById("wallpaperInput");
    if (input) input.value = "";
  }
}

async function removeWallpaper() {
  try { await mediaDelete("wallpaper"); } catch (error) { console.warn(error); }
  hanaWallpaperData = null;
  state.appearance.wallpaperEnabled = false;
  saveState();
  await applyAppearance();
  showToast("Wallpaper removed");
}

async function resetAppearance() {
  state.appearance = { theme:"sakura", wallpaperEnabled:false, overlayStrength:"medium", wallpaperPosition:"center" };
  try { await mediaDelete("wallpaper"); } catch (error) { console.warn(error); }
  hanaWallpaperData = null;
  saveState();
  await applyAppearance();
  showToast("Appearance reset 🌸");
}

function exportData(){const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`hana-backup-${todayISO()}.json`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);showToast("Hana backup exported 🌸");}
async function importData(file){if(!file)return;try{const parsed=JSON.parse(await file.text());if(!parsed||typeof parsed!=="object")throw new Error("Invalid backup");if(!confirm("Replace the current local Hana data with this backup?"))return;state=normalizeState(parsed);saveState();showToast("Hana backup restored 🌸");render();}catch(error){console.error(error);showToast("That file doesn't look like a Hana backup.");}finally{document.getElementById("importBackupInput").value="";}}

/* ================= HELPERS ================= */

function emptyState(icon,title,description,buttonLabel="",action=""){return `<div class="empty-state"><div class="empty-icon">${icon}</div><h3>${title}</h3><p>${description}</p>${buttonLabel?`<button class="secondary-button" data-empty-action="${action}">${buttonLabel}</button>`:""}</div>`;}
function insertIntoTextarea(id,text){const el=document.getElementById(id);if(!el)return;const start=el.selectionStart??el.value.length,end=el.selectionEnd??start;el.value=el.value.slice(0,start)+text+el.value.slice(end);el.focus();el.setSelectionRange(start+text.length,start+text.length);}


function prepareQuickCapture() {
  refreshSpaceSelects();
  const captureSpace = document.getElementById("captureSpace");
  if (captureSpace) captureSpace.value = preferredSpace();
  openModal("quickCaptureModal");
}

/* App-like touch behavior: prevent pinch and double-tap zoom.
   Inputs still receive normal single-touch typing/selection behavior. */
function installNoZoomGuards() {
  ["gesturestart", "gesturechange", "gestureend"].forEach(type => {
    document.addEventListener(type, event => event.preventDefault(), { passive: false });
  });

  document.addEventListener("touchmove", event => {
    if (event.touches && event.touches.length > 1) event.preventDefault();
  }, { passive: false });

  let lastTouchEnd = 0;
  document.addEventListener("touchend", event => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) event.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });
}

installNoZoomGuards();

/* ================= EVENTS ================= */

document.addEventListener("click", event => {
  const nav=event.target.closest("[data-page]");if(nav&&!nav.classList.contains("nav-center-placeholder")){changePage(nav.dataset.page);return;}
  if(event.target.closest("[data-undo-toast]")){if(lastUndoAction){const action=lastUndoAction;lastUndoAction=null;action();}return;}
  const goto=event.target.closest("[data-goto]");if(goto){closeModal("addMenu");changePage(goto.dataset.goto);return;}
  const mode=event.target.closest("[data-mode]");if(mode){state.currentMode=mode.dataset.mode;render();return;}
  const open=event.target.closest("[data-open]");if(open){const id=open.dataset.open;if(id==="taskModal")openTaskModal();else if(id==="noteModal")openNoteModal();else if(id==="reminderModal")openReminderModal();else if(id==="tableModal")openTableModal();else openModal(id);return;}
  const close=event.target.closest("[data-close-modal]");if(close){closeModal(close.dataset.closeModal);return;}

  const editTask=event.target.closest("[data-edit-task]");if(editTask){openTaskModal(editTask.dataset.editTask);return;}
  const toggleTaskBtn=event.target.closest("[data-toggle-task]");if(toggleTaskBtn){toggleTask(toggleTaskBtn.dataset.toggleTask);return;}
  const cycle=event.target.closest("[data-cycle-task]");if(cycle){cycleTaskStatus(cycle.dataset.cycleTask);return;}
  const sub=event.target.closest("[data-toggle-subtask]");if(sub){toggleSubtask(sub.dataset.toggleSubtask,sub.dataset.subtaskId);return;}
  const focus=event.target.closest("[data-focus-task]");if(focus){toggleFocusTask(focus.dataset.focusTask);return;}
  const todayView=event.target.closest("[data-today-view]");if(todayView){state.todayViewMode=todayView.dataset.todayView==="do"?"do":"plan";state.currentPage="today";render();return;}
  if(event.target.closest("[data-do-next]")){const focusTasks=focusTasksVisible();if(focusTasks.length){state.doTaskIndex=(state.doTaskIndex+1)%focusTasks.length;render();}return;}
  if(event.target.closest("[data-apply-rescue]")){applyRescuePlan();return;}
  const pocketMinutes=event.target.closest("[data-pocket-minutes]");if(pocketMinutes){state.timePocketMinutes=Number(pocketMinutes.dataset.pocketMinutes);render();return;}
  const pocketEnergy=event.target.closest("[data-pocket-energy]");if(pocketEnergy){state.timePocketEnergy=pocketEnergy.dataset.pocketEnergy;render();return;}
  const pocketFocus=event.target.closest("[data-pocket-focus]");if(pocketFocus){toggleFocusTask(pocketFocus.dataset.pocketFocus);if(state.currentPage!=="time-pockets")return;state.currentPage="time-pockets";render();return;}
  const tf=event.target.closest("[data-task-filter]");if(tf){state.taskFilter=tf.dataset.taskFilter;render();return;}

  const editNote=event.target.closest("[data-edit-note]");if(editNote){openNoteModal(editNote.dataset.editNote);return;}
  const noteCheck=event.target.closest("[data-toggle-note-check]");if(noteCheck){toggleNoteCheck(noteCheck.dataset.toggleNoteCheck,noteCheck.dataset.noteCheckId);return;}
  const noteTask=event.target.closest("[data-note-to-task]");if(noteTask){noteToTask(noteTask.dataset.noteToTask);return;}
  const noteActions=event.target.closest("[data-note-actions-to-tasks]");if(noteActions){noteActionsToTasks(noteActions.dataset.noteActionsToTasks);return;}
  const resetNote=event.target.closest("[data-reset-note]");if(resetNote){resetNoteChecklist(resetNote.dataset.resetNote);return;}
  const insert=event.target.closest("[data-note-insert]");if(insert){insertIntoTextarea("noteContent",insert.dataset.noteInsert);return;}

  const editReminder=event.target.closest("[data-edit-reminder]");if(editReminder){openReminderModal(editReminder.dataset.editReminder);return;}
  const completeRem=event.target.closest("[data-complete-reminder]");if(completeRem){completeReminder(completeRem.dataset.completeReminder);return;}
  const snooze=event.target.closest("[data-snooze-reminder]");if(snooze){snoozeReminder(snooze.dataset.snoozeReminder,snooze.dataset.snooze);return;}

  const selectTable=event.target.closest("[data-select-table]");if(selectTable){state.activeTableId=selectTable.dataset.selectTable;render();return;}
  const editTable=event.target.closest("[data-edit-table]");if(editTable){openTableModal(editTable.dataset.editTable);return;}
  const addRow=event.target.closest("[data-add-row]");if(addRow){openTableRowModal(addRow.dataset.addRow);return;}
  const editRow=event.target.closest("[data-edit-row]");if(editRow){openTableRowModal(editRow.dataset.tableId,editRow.dataset.editRow);return;}
  const rowTask=event.target.closest("[data-row-to-task]");if(rowTask){const t=state.tables.find(t=>t.id===rowTask.dataset.tableId),r=t?.rows.find(r=>r.id===rowTask.dataset.rowToTask);if(t&&r)createTaskFromTableRow(t,r);return;}
  const rowRem=event.target.closest("[data-row-remind]");if(rowRem){const t=state.tables.find(t=>t.id===rowRem.dataset.tableId),r=t?.rows.find(r=>r.id===rowRem.dataset.rowRemind);if(t&&r){createReminderFromTableRow(t,r);render();}return;}

  const selectList=event.target.closest("[data-select-list]");if(selectList){state.activeListId=selectList.dataset.selectList;render();return;}
  if(event.target.closest("[data-open-list]")){openListModal();return;}
  const editList=event.target.closest("[data-edit-list]");if(editList){openListModal(editList.dataset.editList);return;}
  const addListItem=event.target.closest("[data-add-list-item]");if(addListItem){openListItemModal(addListItem.dataset.addListItem);return;}
  const editListItem=event.target.closest("[data-edit-list-item]");if(editListItem){openListItemModal(editListItem.dataset.listId,editListItem.dataset.editListItem);return;}
  const toggleList=event.target.closest("[data-toggle-list-item]");if(toggleList){toggleListItem(toggleList.dataset.listId,toggleList.dataset.toggleListItem);return;}
  const listTemplate=event.target.closest("[data-list-template]");if(listTemplate){createListFromTemplate(listTemplate.dataset.listTemplate);return;}
  const clearChecked=event.target.closest("[data-clear-checked]");if(clearChecked){clearCheckedListItems(clearChecked.dataset.clearChecked);return;}
  const resetListButton=event.target.closest("[data-reset-list]");if(resetListButton){resetList(resetListButton.dataset.resetList);return;}

  const openAppearance=event.target.closest("[data-open-appearance]");if(openAppearance){openAppearanceModal();return;}
  const themeChoice=event.target.closest("[data-theme-choice]");if(themeChoice){state.appearance.theme=themeChoice.dataset.themeChoice;saveState();applyAppearance();return;}
  const overlayChoice=event.target.closest("[data-overlay-strength]");if(overlayChoice){state.appearance.overlayStrength=overlayChoice.dataset.overlayStrength;saveState();applyAppearance();return;}
  const editSpaceButton=event.target.closest("[data-edit-space]");if(editSpaceButton){editSpace(editSpaceButton.dataset.editSpace);return;}
  const deleteSpaceButton=event.target.closest("[data-delete-space]");if(deleteSpaceButton){deleteSpace(deleteSpaceButton.dataset.deleteSpace);return;}

  const plant=event.target.closest("[data-plant-inbox]");if(plant){plantInboxItem(plant.dataset.plantInbox);return;}
  const delInbox=event.target.closest("[data-delete-inbox]");if(delInbox){const item=state.inbox.find(i=>i.id===delInbox.dataset.deleteInbox);if(item){moveToTrash("inbox",item);state.inbox=state.inbox.filter(i=>i.id!==delInbox.dataset.deleteInbox);}render();return;}
  if(event.target.closest("[data-plant-all-inbox]")){plantAllInbox();return;}

  const searchResult=event.target.closest("[data-search-type]");if(searchResult){openSearchResult(searchResult.dataset.searchType,searchResult.dataset.searchId,searchResult.dataset.searchPage);return;}

  const daily=event.target.closest("[data-daily-task-action]");if(daily){dailyTaskAction(daily.dataset.taskId,daily.dataset.dailyTaskAction);return;}
  const closeAction=event.target.closest("[data-close-action]");if(closeAction?.dataset.closeAction==="finish"){finishDailyClose();return;}

  const template=event.target.closest("[data-use-template]");if(template){useTemplate(template.dataset.useTemplate);saveState();return;}
  const reopenTaskButton=event.target.closest("[data-reopen-task]");if(reopenTaskButton){reopenTask(reopenTaskButton.dataset.reopenTask);return;}
  const reopenReminderButton=event.target.closest("[data-reopen-reminder]");if(reopenReminderButton){reopenReminder(reopenReminderButton.dataset.reopenReminder);return;}
  const restoreTrashButton=event.target.closest("[data-restore-trash]");if(restoreTrashButton){restoreTrashItem(restoreTrashButton.dataset.restoreTrash);return;}
  const deleteTrashButton=event.target.closest("[data-delete-trash]");if(deleteTrashButton){permanentlyDeleteTrashItem(deleteTrashButton.dataset.deleteTrash);return;}
  if(event.target.closest("[data-empty-trash]")){emptyTrash();return;}

  const delPin=event.target.closest("[data-delete-pin]");if(delPin){deletePin(delPin.dataset.deletePin);return;}
  const delSomeday=event.target.closest("[data-delete-someday]");if(delSomeday){deleteSomeday(delSomeday.dataset.deleteSomeday);return;}

  const empty=event.target.closest("[data-empty-action]");if(empty){const a=empty.dataset.emptyAction;if(a==="open-task")openTaskModal();else if(a==="open-note")openNoteModal();else if(a==="open-reminder")openReminderModal();else if(a==="open-table")openTableModal();else if(a==="open-list")openListModal();else if(a==="open-pin")openModal("pinModal");else if(a==="open-someday")openModal("somedayModal");return;}

  const action=event.target.closest("[data-action]");if(action){closeModal("addMenu");const a=action.dataset.action;if(a==="task")openTaskModal();else if(a==="note")openNoteModal();else if(a==="reminder")openReminderModal();else if(a==="table")openTableModal();else if(a==="list")openListModal();else if(a==="quick")prepareQuickCapture();else if(a==="pin")openModal("pinModal");else if(a==="someday")openModal("somedayModal");return;}

  if(event.target.id==="brainDumpAddButton"){addBrainDump();return;}
  if(event.target.id==="addSpaceButton"){addCustomSpace();return;}
  if(event.target.id==="chooseWallpaperButton"){document.getElementById("wallpaperInput").click();return;}
  if(event.target.id==="removeWallpaperButton"){removeWallpaper();return;}
  if(event.target.id==="resetAppearanceButton"){if(confirm("Reset Hana's theme and remove the saved wallpaper?"))resetAppearance();return;}
  if(event.target.id==="saveSettingsButton"){saveSettings();return;}
  if(event.target.id==="exportDataButton"){exportData();return;}
  if(event.target.id==="importDataButton"){document.getElementById("importBackupInput").click();return;}
});

document.addEventListener("input",event=>{if(event.target.id==="quickCaptureInput")updateCapturePrediction();if(event.target.id==="noteSearch")searchNotes(event.target.value);if(event.target.id==="globalSearchInput")renderGlobalSearchResults(event.target.value);if(event.target.id==="taskSearch"){state.taskSearch=event.target.value;saveState();const pos=event.target.selectionStart;renderTasks();const input=document.getElementById("taskSearch");if(input){input.focus();input.setSelectionRange(pos,pos);}}});

document.addEventListener("change",event=>{if(event.target.id==="taskProjectFilter"){state.taskProjectFilter=event.target.value;render();}if(event.target.id==="taskRecurrenceType")updateTaskConditionalFields();if(event.target.id==="noteType")updateNoteConditionalFields();if(event.target.id==="reminderRepeat")updateReminderConditionalFields();if(event.target.id==="tableTemplate")applyTableTemplate(event.target.value,true);if(event.target.id==="wallpaperEnabled"){if(event.target.checked&&!hanaWallpaperData){event.target.checked=false;document.getElementById("wallpaperInput").click();}else{state.appearance.wallpaperEnabled=event.target.checked;saveState();applyAppearance();}}if(event.target.id==="wallpaperPosition"){state.appearance.wallpaperPosition=event.target.value;saveState();applyAppearance();}if(event.target.matches("[data-table-check]")){const t=state.tables.find(t=>t.id===event.target.dataset.tableCheck),r=t?.rows.find(r=>r.id===event.target.dataset.rowId);if(r){r.values[event.target.dataset.colId]=event.target.checked;saveState();}}});

document.getElementById("mainAddButton").addEventListener("click",()=>openModal("addMenu"));
document.getElementById("quickCaptureHeader").addEventListener("click",prepareQuickCapture);
document.getElementById("globalSearchButton").addEventListener("click",()=>{document.getElementById("globalSearchInput").value="";renderGlobalSearchResults("");openModal("searchModal");setTimeout(()=>document.getElementById("globalSearchInput").focus(),80);});
document.getElementById("notificationButton").addEventListener("click",requestNotificationPermission);
document.getElementById("saveQuickCapture").addEventListener("click",saveQuickCapture);
document.getElementById("sendToInboxButton").addEventListener("click",sendQuickCaptureToInbox);
document.getElementById("saveTaskButton").addEventListener("click",saveTask);
document.getElementById("deleteTaskFromModal").addEventListener("click",()=>{const id=document.getElementById("taskEditId").value;if(id)deleteTask(id);});
document.getElementById("saveNoteButton").addEventListener("click",saveNote);
document.getElementById("deleteNoteFromModal").addEventListener("click",()=>{const id=document.getElementById("noteEditId").value;if(id)deleteNote(id);});
document.getElementById("saveReminderButton").addEventListener("click",saveReminder);
document.getElementById("deleteReminderFromModal").addEventListener("click",()=>{const id=document.getElementById("reminderEditId").value;if(id)deleteReminder(id);});
document.getElementById("saveTableButton").addEventListener("click",saveTable);
document.getElementById("deleteTableFromModal").addEventListener("click",()=>{const id=document.getElementById("tableEditId").value;if(id)deleteTable(id);});
document.getElementById("saveTableRowButton").addEventListener("click",saveTableRow);
document.getElementById("deleteTableRowFromModal").addEventListener("click",()=>{const tid=document.getElementById("tableRowTableId").value,rid=document.getElementById("tableRowEditId").value;if(tid&&rid)deleteTableRow(tid,rid);});
document.getElementById("saveListButton").addEventListener("click",saveList);
document.getElementById("deleteListFromModal").addEventListener("click",()=>{const id=document.getElementById("listEditId").value;if(id)deleteList(id);});
document.getElementById("saveListItemButton").addEventListener("click",saveListItem);
document.getElementById("deleteListItemFromModal").addEventListener("click",()=>{const listId=document.getElementById("listItemListId").value,itemId=document.getElementById("listItemEditId").value;if(listId&&itemId)deleteListItem(listId,itemId);});
document.getElementById("savePinButton").addEventListener("click",savePin);
document.getElementById("saveSomedayButton").addEventListener("click",saveSomeday);
document.getElementById("importBackupInput").addEventListener("change",event=>importData(event.target.files?.[0]));
document.getElementById("wallpaperInput").addEventListener("change",event=>chooseWallpaper(event.target.files?.[0]));

document.querySelectorAll(".modal-overlay").forEach(overlay=>overlay.addEventListener("click",event=>{if(event.target===overlay)overlay.classList.add("hidden");}));

/* SERVICE WORKER */
if("serviceWorker" in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js").catch(error=>console.error("Service worker registration failed:",error)));}

setInterval(checkReminders,30*1000);checkReminders();
applyAppearance();
render();

const launchParams=new URLSearchParams(window.location.search);
if(launchParams.get("action")==="capture"){setTimeout(prepareQuickCapture,100);window.history.replaceState({},"",window.location.pathname+window.location.hash);}