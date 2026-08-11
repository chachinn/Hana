/* =====================================================
   HANA 🌸 v1.9
   Optional accounts + Firebase cloud backup
   Local-first PWA
   ===================================================== */

const STORAGE_KEY = "hana_app_v1";
const BACKUP_DB_NAME = "hana_safety_backups_v1";
const BACKUP_STORE_NAME = "snapshots";
const BACKUP_META_KEY = "hana_backup_meta_v1";
const LAST_EXPORT_KEY = "hana_last_export_at_v1";
const MAX_SAFETY_SNAPSHOTS = 6;

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
  { id: "personal", name: "Personal", emoji: "🎀" },
  { id: "work", name: "Work", emoji: "💼" },
  { id: "home", name: "Home", emoji: "🏠" },
  { id: "errands", name: "Errands", emoji: "🛍️" },
  { id: "wellness", name: "Wellness", emoji: "🌿" }
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

const QUICK_ACCESS_MENU = {
  reminders: { label: "Reminders", icon: "🔔", description: "Repeats, snooze and reminder chains" },
  tables: { label: "Trackers", icon: "📒", description: "Progress, status, remarks and custom columns" },
  calendar: { label: "Calendar", icon: "🗓️", description: "Month, week, day and time blocks" },
  projects: { label: "Projects", icon: "🌷", description: "Milestones and connected work" },
  garden: { label: "Hana Garden", icon: "🌺", description: "See what you have been nurturing" },
  agenda: { label: "Agenda", icon: "📅", description: "Tasks, events and reminders together" },
  rescue: { label: "Rescue My Day", icon: "🛟", description: "Shrink an overloaded day" },
  "time-pockets": { label: "Time Pockets", icon: "⏱", description: "Find work that fits your time and energy" },
  bloom: { label: "Bloom View", icon: "🌸", description: "See progress without pressure" },
  "daily-close": { label: "Daily Close", icon: "🌙", description: "Wrap up unfinished things gently" },
  "waiting-garden": { label: "Waiting Garden", icon: "⏳", description: "Things waiting on replies, approvals or deliveries" },
  "future-notes": { label: "Future Me", icon: "💌", description: "Notes that return when you need them" },
  threads: { label: "Memory Threads", icon: "🧵", description: "Connect context across Hana" },
  inbox: { label: "Brain Dump", icon: "🧠", description: "Sort thoughts later" },
  templates: { label: "Templates", icon: "🧩", description: "Reusable starting points" },
  pinboard: { label: "Pinboard", icon: "📌", description: "Keep quick references handy" },
  someday: { label: "Someday", icon: "🌱", description: "Ideas without urgency" },
  insights: { label: "Hana Notices", icon: "🌿", description: "Local planning patterns and suggestions" },
  "return-ritual": { label: "Return Ritual", icon: "🌱", description: "Reset overdue things without panic" },
  history: { label: "History", icon: "🕰️", description: "See what you already finished" },
  trash: { label: "Trash", icon: "🗑️", description: "Restore recently deleted things" },
  settings: { label: "Settings & Spaces", icon: "⚙️", description: "Edit spaces, planning defaults and backups" }
};


const BOTTOM_NAV_OPTIONS = {
  lists: { label: "Lists", icon: "☑️" },
  calendar: { label: "Calendar", icon: "🗓️" },
  tables: { label: "Trackers", icon: "📒" },
  notes: { label: "Notes", icon: "📝" },
  reminders: { label: "Reminders", icon: "🔔" },
  projects: { label: "Projects", icon: "🌷" },
  agenda: { label: "Agenda", icon: "📅" },
  inbox: { label: "Brain Dump", icon: "🧠" },
  "waiting-garden": { label: "Waiting", icon: "⏳" },
  "future-notes": { label: "Future Me", icon: "💌" },
  garden: { label: "Garden", icon: "🌺" },
  bloom: { label: "Bloom", icon: "🌸" }
};
const DEFAULT_BOTTOM_NAV = ["lists", "calendar"];

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
  calendarView: "month",
  calendarCursor: todayISO(),
  events: [],
  projects: [],
  activeProjectId: "",
  calendarDragTaskId: "",

  settings: {
    dailyCapacityMinutes: 240,
    overloadGuardrail: true,
    workFirewallEnabled: false,
    workFirewallSpaceId: "work",
    workStart: "08:00",
    workEnd: "18:00",
    workDays: [1, 2, 3, 4, 5],
    allowHighPriorityWorkReminders: true,
    defaultSpace: "personal",
    quickAccess: ["reminders"],
    bottomNav: DEFAULT_BOTTOM_NAV.slice(),
    birthdayLabels: ["Me", "Partner", "Mom", "Dad", "Other"],
    tutorialCompleted: false,
    accountPromptSeen: false
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
  futureNotes: [],
  threads: [],
  tinyWins: [],
  releaseHistory: [],
  dayIntentions: {},
  activeThreadId: "",
  pendingRescheduleTaskId: "",
  lastOpenedDate: "",
  lastReturnRitualDate: "",
  returnRitualPending: false,
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
    scheduledDate: task.scheduledDate || "",
    scheduledStart: task.scheduledStart || "",
    milestoneId: String(task.milestoneId || ""),
    durationMinutes: Math.max(0, Number(task.durationMinutes || 0)),
    energy: ["low", "medium", "high"].includes(task.energy) ? task.energy : "medium",
    deadlineType: task.deadlineType === "hard" ? "hard" : "soft",
    rescheduleCount: Math.max(0, Number(task.rescheduleCount || 0)),
    rescheduleHistory: Array.isArray(task.rescheduleHistory) ? task.rescheduleHistory : [],
    focusHistory: Array.isArray(task.focusHistory) ? [...new Set(task.focusHistory.filter(Boolean))] : [],
    waitingSince: task.waitingSince || (task.status === "waiting" ? (task.createdAt ? localDateISO(new Date(Number(task.createdAt))) : todayISO()) : ""),
    lastRescheduleReason: String(task.lastRescheduleReason || ""),
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
    completedAt: task.completedAt ? Number(task.completedAt) : null,
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
    project: String(note.project || ""),
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
    repeatType: ["none", "daily", "weekdays", "weekly", "monthly", "yearly", "custom"].includes(repeatType) ? repeatType : "none",
    repeatInterval: Math.max(1, Number(reminder.repeatInterval || 1)),
    completed: Boolean(reminder.completed),
    notified: Boolean(reminder.notified),
    chainEnabled: Boolean(reminder.chainEnabled),
    chainNotified: Array.isArray(reminder.chainNotified) ? reminder.chainNotified : [],
    linkedTaskId: reminder.linkedTaskId || "",
    linkedTableId: reminder.linkedTableId || "",
    linkedRowId: reminder.linkedRowId || "",
    linkedEventId: reminder.linkedEventId || "",
    createdAt: Number(reminder.createdAt || Date.now()),
    updatedAt: Number(reminder.updatedAt || reminder.createdAt || Date.now())
  };
}

const DEFAULT_TABLE_STATUSES = ["upcoming", "to do", "doing", "waiting", "done"];

function normalizeTable(table = {}) {
  const cols = Array.isArray(table.columns) && table.columns.length
    ? table.columns.map(col => ({ id: col.id || createId(), name: String(col.name || "Column"), type: validColumnType(col.type) }))
    : [{ id: createId(), name: "Item", type: "text" }];
  const statusOptions = Array.isArray(table.statusOptions) && table.statusOptions.length
    ? table.statusOptions.map(option => String(option || "").trim()).filter(Boolean)
    : DEFAULT_TABLE_STATUSES.slice();

  return {
    id: table.id || createId(),
    name: String(table.name || "Untitled table"),
    space: String(table.space || "personal"),
    project: String(table.project || ""),
    columns: cols,
    statusOptions,
    sortMode: table.sortMode === "auto" ? "auto" : "manual",
    sortColumnId: String(table.sortColumnId || ""),
    sortDirection: table.sortDirection === "desc" ? "desc" : "asc",
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
    quantityLabel: String(list.quantityLabel || "Quantity"),
    detailLabel: String(list.detailLabel || "Detail"),
    items: Array.isArray(list.items)
      ? list.items.map(item => ({
          id: item.id || createId(),
          title: String(item.title || ""),
          quantity: String(item.quantity || ""),
          detail: String(item.detail || item.notes || ""),
          completed: Boolean(item.completed),
          createdAt: Number(item.createdAt || Date.now()),
          updatedAt: Number(item.updatedAt || item.createdAt || Date.now())
        })).filter(item => item.title)
      : [],
    createdAt: Number(list.createdAt || Date.now()),
    updatedAt: Number(list.updatedAt || list.createdAt || Date.now())
  };
}


function normalizeFutureNote(note = {}) {
  return {
    id: note.id || createId(),
    title: String(note.title || "A note for future me"),
    content: String(note.content || ""),
    date: note.date || todayISO(),
    space: String(note.space || "personal"),
    archived: Boolean(note.archived),
    createdAt: Number(note.createdAt || Date.now()),
    updatedAt: Number(note.updatedAt || note.createdAt || Date.now())
  };
}

function normalizeThread(thread = {}) {
  return {
    id: thread.id || createId(),
    title: String(thread.title || "Memory Thread"),
    emoji: String(thread.emoji || "🧵").slice(0, 4),
    space: String(thread.space || "personal"),
    description: String(thread.description || ""),
    links: Array.isArray(thread.links) ? thread.links.filter(link => link && link.type && link.id).map(link => ({ type:String(link.type), id:String(link.id), tableId:String(link.tableId || "") })) : [],
    createdAt: Number(thread.createdAt || Date.now()),
    updatedAt: Number(thread.updatedAt || thread.createdAt || Date.now())
  };
}

function normalizeTinyWin(win = {}) {
  return { id: win.id || createId(), title: String(win.title || "Tiny win"), date: win.date || todayISO(), space: String(win.space || "personal"), createdAt: Number(win.createdAt || Date.now()) };
}

function normalizeRelease(entry = {}) {
  return { id: entry.id || createId(), title: String(entry.title || "Released item"), date: entry.date || todayISO(), action: String(entry.action || "released"), taskId: String(entry.taskId || ""), createdAt: Number(entry.createdAt || Date.now()) };
}

function normalizeSpace(space = {}) {
  const id = String(space.id || "").trim() || `space-${createId()}`;
  return {
    id,
    name: String(space.name || "Space").trim() || "Space",
    emoji: String(space.emoji || "🌸").trim().slice(0, 4) || "🌸"
  };
}


function normalizeEvent(event = {}) {
  return {
    id: event.id || createId(),
    title: String(event.title || "Untitled event"),
    space: String(event.space || "personal"),
    date: event.date || todayISO(),
    startTime: event.startTime || "09:00",
    endTime: event.endTime || "10:00",
    location: String(event.location || ""),
    notes: String(event.notes || ""),
    repeatType: ["none","daily","weekly","monthly","yearly"].includes(event.repeatType) ? event.repeatType : "none",
    reminderEnabled: Boolean(event.reminderEnabled),
    createdAt: Number(event.createdAt || Date.now()),
    updatedAt: Number(event.updatedAt || event.createdAt || Date.now())
  };
}

function normalizeProject(project = {}) {
  return {
    id: project.id || createId(),
    name: String(project.name || "Untitled project").trim() || "Untitled project",
    emoji: String(project.emoji || "🌷").slice(0,4),
    space: String(project.space || "personal"),
    description: String(project.description || ""),
    dueDate: project.dueDate || "",
    status: ["active","onhold","done"].includes(project.status) ? project.status : "active",
    milestones: Array.isArray(project.milestones) ? project.milestones.map(m => ({
      id: m.id || createId(), title: String(m.title || "Milestone"), dueDate: m.dueDate || "", completed: Boolean(m.completed)
    })).filter(m=>m.title) : [],
    createdAt: Number(project.createdAt || Date.now()),
    updatedAt: Number(project.updatedAt || project.createdAt || Date.now())
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
    spaces: (Array.isArray(data.spaces) ? data.spaces : base.spaces).map(normalizeSpace),
    lists: (Array.isArray(data.lists) ? data.lists : base.lists).map(normalizeList),
    appearance: { ...base.appearance, ...(data.appearance || {}) },
    tasks: (Array.isArray(data.tasks) ? data.tasks : base.tasks).map(normalizeTask),
    notes: (Array.isArray(data.notes) ? data.notes : base.notes).map(normalizeNote),
    reminders: (Array.isArray(data.reminders) ? data.reminders : base.reminders).map(normalizeReminder),
    events: (Array.isArray(data.events) ? data.events : []).map(normalizeEvent),
    projects: (Array.isArray(data.projects) ? data.projects : []).map(normalizeProject),
    tables: (Array.isArray(data.tables) ? data.tables : (migratedTables?.length ? migratedTables : base.tables)).map(normalizeTable),
    pins: Array.isArray(data.pins) ? data.pins : base.pins,
    someday: Array.isArray(data.someday) ? data.someday : base.someday,
    inbox: Array.isArray(data.inbox) ? data.inbox : [],
    futureNotes: (Array.isArray(data.futureNotes) ? data.futureNotes : []).map(normalizeFutureNote),
    threads: (Array.isArray(data.threads) ? data.threads : []).map(normalizeThread),
    tinyWins: (Array.isArray(data.tinyWins) ? data.tinyWins : []).map(normalizeTinyWin),
    releaseHistory: (Array.isArray(data.releaseHistory) ? data.releaseHistory : []).map(normalizeRelease),
    dayIntentions: data.dayIntentions && typeof data.dayIntentions === "object" ? data.dayIntentions : {},
    activeThreadId: data.activeThreadId || "",
    pendingRescheduleTaskId: data.pendingRescheduleTaskId || "",
    lastOpenedDate: data.lastOpenedDate || "",
    lastReturnRitualDate: data.lastReturnRitualDate || "",
    returnRitualPending: Boolean(data.returnRitualPending),
    trash: Array.isArray(data.trash) ? data.trash.filter(entry => Number(entry.deletedAt || 0) > Date.now() - (30 * 24 * 60 * 60 * 1000)) : [],
    focusTaskIds: Array.isArray(data.focusTaskIds) ? data.focusTaskIds : [],
    activeListId: data.activeListId || "",
    focusDate: data.focusDate || todayISO(),
    todayViewMode: data.todayViewMode === "do" ? "do" : "plan",
    doTaskIndex: Math.max(0, Number(data.doTaskIndex || 0)),
    timePocketMinutes: [10, 15, 30, 45, 60, 90].includes(Number(data.timePocketMinutes)) ? Number(data.timePocketMinutes) : 30,
    timePocketEnergy: ["any", "low", "medium", "high"].includes(data.timePocketEnergy) ? data.timePocketEnergy : "any",
    calendarView: ["month","week","day"].includes(data.calendarView) ? data.calendarView : "month",
    calendarCursor: data.calendarCursor || todayISO(),
    activeProjectId: data.activeProjectId || "",
    calendarDragTaskId: "",
    dailyCloseHistory: Array.isArray(data.dailyCloseHistory) ? data.dailyCloseHistory : []
  };

  const incomingQuickAccess = Array.isArray(normalized.settings.quickAccess) ? normalized.settings.quickAccess : ["reminders"];
  normalized.settings.quickAccess = [...new Set(incomingQuickAccess)]
    .filter(key => Object.prototype.hasOwnProperty.call(QUICK_ACCESS_MENU, key))
    .slice(0, 3);

  const incomingBottomNav = Array.isArray(normalized.settings.bottomNav) ? normalized.settings.bottomNav : DEFAULT_BOTTOM_NAV;
  const validBottomNav = [...new Set(incomingBottomNav)]
    .filter(key => Object.prototype.hasOwnProperty.call(BOTTOM_NAV_OPTIONS, key));
  DEFAULT_BOTTOM_NAV.forEach(key => { if (validBottomNav.length < 2 && !validBottomNav.includes(key)) validBottomNav.push(key); });
  Object.keys(BOTTOM_NAV_OPTIONS).forEach(key => { if (validBottomNav.length < 2 && !validBottomNav.includes(key)) validBottomNav.push(key); });
  normalized.settings.bottomNav = validBottomNav.slice(0, 2);
  const incomingBirthdayLabels = Array.isArray(normalized.settings.birthdayLabels) ? normalized.settings.birthdayLabels : ["Me", "Partner", "Mom", "Dad", "Other"];
  normalized.settings.birthdayLabels = [...new Set(incomingBirthdayLabels.map(label => String(label || "").trim()).filter(Boolean))].slice(0, 10);
  if (!normalized.settings.birthdayLabels.length) normalized.settings.birthdayLabels = ["Me", "Partner", "Mom", "Dad", "Other"];
  // Existing Hana users should not be interrupted by a first-run tour after updating.
  // New installs inherit tutorialCompleted:false from defaultState and will see it once.
  if (data && Object.keys(data).length && !Object.prototype.hasOwnProperty.call(data.settings || {}, "tutorialCompleted")) {
    normalized.settings.tutorialCompleted = true;
  }

  // Spaces are fully user-controlled. If an imported/older state has none,
  // create one neutral fallback so Hana always has somewhere to place items.
  if (!normalized.spaces.length) {
    normalized.spaces = [normalizeSpace({ id: `space-general-${createId()}`, name: "General", emoji: "🌸" })];
  }
  const validSpaceIds = new Set(normalized.spaces.map(space => space.id));
  const firstSpaceId = normalized.spaces[0].id;
  const fallbackSpace = validSpaceIds.has(normalized.settings.defaultSpace) ? normalized.settings.defaultSpace : firstSpaceId;
  normalized.settings.defaultSpace = fallbackSpace;
  [normalized.tasks, normalized.notes, normalized.reminders, normalized.events, normalized.tables, normalized.lists, normalized.pins, normalized.inbox, normalized.futureNotes, normalized.threads, normalized.tinyWins, normalized.projects].forEach(collection => {
    collection.forEach(item => { if (item && !validSpaceIds.has(item.space)) item.space = fallbackSpace; });
  });
  if (!validSpaceIds.has(normalized.settings.workFirewallSpaceId)) {
    normalized.settings.workFirewallSpaceId = validSpaceIds.has("work") ? "work" : "";
  }
  if (!normalized.settings.workFirewallSpaceId) normalized.settings.workFirewallEnabled = false;
  // v1.7: turn legacy free-text task projects into real Project pages without changing old tasks.
  const knownProjectNames = new Set(normalized.projects.map(p => p.name.toLowerCase()));
  normalized.tasks.forEach(task => {
    const name = String(task.project || "").trim();
    if (name && !knownProjectNames.has(name.toLowerCase())) {
      normalized.projects.push(normalizeProject({ name, space: task.space, emoji:"🌷", createdAt: task.createdAt || Date.now() }));
      knownProjectNames.add(name.toLowerCase());
    }
  });
  if (!normalized.activeProjectId || !normalized.projects.some(p=>p.id===normalized.activeProjectId)) normalized.activeProjectId = normalized.projects[0]?.id || "";
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

let stateLoadStatus = "ok";
let rawStateAtLoad = "";

function loadState() {
  let raw = "";
  try { raw = localStorage.getItem(STORAGE_KEY) || ""; }
  catch (error) {
    stateLoadStatus = "storage-unavailable";
    console.error("Unable to access Hana local storage:", error);
    return normalizeState(clone(defaultState));
  }
  rawStateAtLoad = raw;
  if (!raw) {
    stateLoadStatus = "missing";
    return normalizeState(clone(defaultState));
  }
  try { return normalizeState(JSON.parse(raw)); }
  catch (error) {
    stateLoadStatus = "corrupt";
    console.error("Unable to load Hana data:", error);
    return normalizeState(clone(defaultState));
  }
}

let state = loadState();
let lastSavedStateJSON = stateLoadStatus === "ok" ? rawStateAtLoad : "";
let queuedSafetyStateJSON = "";
let safetySnapshotTimer = null;
let storageErrorShown = false;
let safetyRecoveryPending = ["missing", "corrupt", "storage-unavailable"].includes(stateLoadStatus);

const HANA_APP_VERSION = "1.9";
let hanaAccountState = {
  status: "loading",
  user: null,
  meta: null,
  error: ""
};
let authActionPending = false;
let firebaseAuthListenerInstalled = false;
let cloudOperationBusy = false;

function daysBetweenISO(from, to) {
  if (!from || !to) return 0;
  const a = new Date(`${from}T12:00:00`);
  const b = new Date(`${to}T12:00:00`);
  return Math.max(0, Math.round((b - a) / 86400000));
}

const previousOpenedDate = state.lastOpenedDate;
const daysAwayAtLaunch = daysBetweenISO(previousOpenedDate, todayISO());
if (previousOpenedDate && daysAwayAtLaunch >= 3 && state.lastReturnRitualDate !== todayISO()) {
  state.returnRitualPending = true;
  state.currentPage = "return-ritual";
}
state.lastOpenedDate = todayISO();

function saveState(options = {}) {
  let json;
  try { json = JSON.stringify(state); }
  catch (error) {
    console.error("Unable to serialize Hana data:", error);
    return false;
  }

  if (json === lastSavedStateJSON) return true;
  try {
    localStorage.setItem(STORAGE_KEY, json);
    lastSavedStateJSON = json;
    storageErrorShown = false;
    if (options.snapshot !== false && !safetyRecoveryPending) queueSafetySnapshot(json);
    return true;
  } catch (error) {
    console.error("Unable to save Hana data locally:", error);
    if (!storageErrorShown && document.getElementById("toast")) {
      storageErrorShown = true;
      showToast("Hana could not save locally. Export a backup before closing the app.");
    }
    return false;
  }
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
  return state.spaces.find(space => space.id === spaceId) || state.spaces[0] || { id:"fallback", name:"General", emoji:"🌸" };
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

function addYearsClamped(dateString, years = 1) {
  const base = new Date(`${dateString || todayISO()}T12:00:00`);
  const month = base.getMonth();
  const day = base.getDate();
  const targetYear = base.getFullYear() + Number(years || 1);
  const lastDay = new Date(targetYear, month + 1, 0, 12, 0, 0).getDate();
  const target = new Date(targetYear, month, Math.min(day, lastDay), 12, 0, 0);
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
    .filter(task => task && !task.completed && (!firewallIsActive() || task.space !== state.settings.workFirewallSpaceId));
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
  const protectedSpaceId = state.settings.workFirewallSpaceId;
  return Boolean(
    state.settings.workFirewallEnabled &&
    protectedSpaceId &&
    state.spaces.some(space => space.id === protectedSpaceId) &&
    !isWorkTime() &&
    state.currentMode !== protectedSpaceId
  );
}

function filterByMode(items, { respectFirewall = true } = {}) {
  let result = items;
  if (state.currentMode !== "all") result = result.filter(item => item.space === state.currentMode);
  if (respectFirewall && firewallIsActive()) result = result.filter(item => item.space !== state.settings.workFirewallSpaceId);
  return result;
}

function preferredSpace() {
  if (state.currentMode !== "all" && state.spaces.some(space => space.id === state.currentMode)) return state.currentMode;
  if (state.spaces.some(space => space.id === state.settings.defaultSpace)) return state.settings.defaultSpace;
  return state.spaces[0]?.id || "";
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

function quickAccessItemHTML(key) {
  const item = QUICK_ACCESS_MENU[key];
  if (!item) return "";
  return `<button class="nav-drawer-item nav-drawer-item-priority" data-goto="${key}"><span class="nav-drawer-icon">${item.icon}</span><span><strong>${escapeHTML(item.label)}</strong><small>${escapeHTML(item.description)}</small></span><b>›</b></button>`;
}

function renderQuickAccess() {
  const container = document.getElementById("quickAccessItems");
  if (!container) return;
  const selected = Array.isArray(state.settings.quickAccess) ? state.settings.quickAccess.slice(0, 3) : ["reminders"];
  container.innerHTML = selected.length
    ? selected.map(quickAccessItemHTML).join("")
    : `<button class="quick-access-empty" type="button" data-edit-quick-access><span>＋</span><strong>Add a shortcut</strong><small>Choose up to three frequently used sections.</small></button>`;

  document.querySelectorAll('.nav-drawer-group:not(.nav-drawer-quick-access) .nav-drawer-item[data-goto]').forEach(button => {
    button.classList.toggle("quick-access-duplicate", selected.includes(button.dataset.goto));
  });
}

function quickAccessOptionsHTML(selectedValue = "") {
  const options = [`<option value="">— Empty —</option>`];
  Object.entries(QUICK_ACCESS_MENU).forEach(([key, item]) => {
    options.push(`<option value="${key}" ${key === selectedValue ? "selected" : ""}>${item.icon} ${escapeHTML(item.label)}</option>`);
  });
  return options.join("");
}

function openQuickAccessEditor() {
  closeNavDrawer();
  const selected = Array.isArray(state.settings.quickAccess) ? state.settings.quickAccess.slice(0, 3) : ["reminders"];
  ["quickAccessSlot1", "quickAccessSlot2", "quickAccessSlot3"].forEach((id, index) => {
    const select = document.getElementById(id);
    if (select) select.innerHTML = quickAccessOptionsHTML(selected[index] || "");
  });
  openModal("quickAccessModal");
}

function saveQuickAccess() {
  const values = ["quickAccessSlot1", "quickAccessSlot2", "quickAccessSlot3"]
    .map(id => document.getElementById(id)?.value || "")
    .filter(Boolean);
  const unique = [...new Set(values)];
  if (unique.length !== values.length) return showToast("Choose each shortcut only once 🌸");
  state.settings.quickAccess = unique.slice(0, 3);
  saveState();
  renderQuickAccess();
  closeModal("quickAccessModal");
  showToast("Quick Access updated ✨");
}

function openNavDrawer() {
  renderQuickAccess();
  const drawer = document.getElementById("navDrawer");
  const backdrop = document.getElementById("navDrawerBackdrop");
  const button = document.getElementById("menuButton");
  drawer?.classList.remove("hidden");
  backdrop?.classList.remove("hidden");
  drawer?.setAttribute("aria-hidden", "false");
  button?.setAttribute("aria-expanded", "true");
  document.body.classList.add("nav-drawer-open");
}

function closeNavDrawer() {
  const drawer = document.getElementById("navDrawer");
  const backdrop = document.getElementById("navDrawerBackdrop");
  const button = document.getElementById("menuButton");
  drawer?.classList.add("hidden");
  backdrop?.classList.add("hidden");
  drawer?.setAttribute("aria-hidden", "true");
  button?.setAttribute("aria-expanded", "false");
  document.body.classList.remove("nav-drawer-open");
}


const HANA_TUTORIAL_STEPS = [
  { icon:"🌸", eyebrow:"WELCOME TO HANA", title:"One bloom at a time", text:"Hana is a gentle planner for tasks, notes, lists, calendars, reminders and structured trackers. You do not need to use everything. Start with what helps today.", bullets:["Use Today for what matters now","Use + whenever you need to capture something","Everything else stays organized in the menu"] },
  { icon:"🌸", eyebrow:"YOUR HOME", title:"Today", text:"Today is your calm starting point. It shows your Focus Bouquet and only the things asking for attention right now.", bullets:["Focus Bouquet = the few tasks that matter today","Plan my day hides capacity and suggestions until you need them","Daily Close helps you wrap up unfinished work"] },
  { icon:"✓", eyebrow:"THINGS TO DO", title:"Tasks", text:"Tasks are actions you need to finish. Quick Task is for fast entry; the full task form is there when you need details.", bullets:["Swipe right to reveal Edit","Swipe left to reveal Delete","Use projects, reminders, estimates and recurrence only when useful"] },
  { icon:"☑️", eyebrow:"SIMPLE REPEATABLE THINGS", title:"Lists", text:"Lists are independent checklists for groceries, packing, shopping, routines or anything else you want to tick off.", bullets:["Quick add several lines at once","Customize Quantity and Detail labels per list","Each item can still be edited separately"] },
  { icon:"🗓️", eyebrow:"WHEN IT HAPPENS", title:"Calendar", text:"Calendar combines dated tasks and events. Switch between Month, Week and Day views when you need more detail.", bullets:["Events are separate from tasks","Plan tasks into time slots","Auto-plan can place your Focus Bouquet around existing events"] },
  { icon:"📒", eyebrow:"STRUCTURED PROGRESS", title:"Trackers", text:"Trackers are customizable tables for progress, projects, bills, applications, collections or anything that needs rows and columns.", bullets:["Choose your own columns and types","Quick Add Row keeps entry fast","Pin Trackers to Quick Access or your bottom navigation if you use them often"] },
  { icon:"🔔", eyebrow:"DON’T FORGET", title:"Reminders", text:"Reminders are for things Hana should bring back to your attention. They can repeat, snooze and link to tasks or tracker rows.", bullets:["Reminders are the default Quick Access shortcut","Reminder chains can nudge you more than once","Enable browser notifications when you want alerts outside Hana"] },
  { icon:"🌷", eyebrow:"CONNECTED WORK", title:"Projects & Notes", text:"Projects collect related tasks, milestones, notes and trackers. Notes hold context that does not need to become a task.", bullets:["Projects show progress and waiting items together","Notes can be pinned or linked into Memory Threads","Meeting notes can turn lines into tasks"] },
  { icon:"☰", eyebrow:"THE REST, WITHOUT THE CLUTTER", title:"Menu & Quick Access", text:"The hamburger keeps advanced tools out of your everyday screens. Quick Access lets you pin up to three things you use most.", bullets:["Plan & Focus contains planning tools","Organize contains Reminders, Trackers and supporting tools","Review & Settings contains history, customization and backups"] },
  { icon:"✨", eyebrow:"MAKE IT YOURS", title:"Your bottom navigation", text:"Today, Tasks and + stay fixed. The two right-side tabs are yours to choose. Hana starts with Lists and Calendar.", bullets:["Change them anytime in Settings & Spaces","Choose Trackers, Notes, Reminders, Projects and more","Restore the default whenever you want"] },
  { icon:"☁️", eyebrow:"OPTIONAL ACCOUNT", title:"Cloud backup when you want it", text:"Hana works without an account. If you sign in with Google or email, you can also keep a Firebase cloud backup that can be restored on another device.", bullets:["Local autosave and safety copies still stay active","Cloud backup and restore are deliberate — Hana never silently replaces your local data","Full JSON export remains your independent backup, including your wallpaper"] },
  { icon:"🌺", eyebrow:"YOU’RE READY", title:"Use only what helps", text:"Hana has many tools, but it is designed so you can ignore most of them until you need them. Start with Today, add a few tasks, and let your system grow naturally.", bullets:["Reopen this tour anytime from Settings","Customize your bottom tabs around your real habits","Use local-only mode or sign in later whenever you want cloud backup"] }
];
let tutorialStepIndex=0;

function renderTutorialStep(){
  const step=HANA_TUTORIAL_STEPS[tutorialStepIndex]||HANA_TUTORIAL_STEPS[0];
  const content=document.getElementById("tutorialContent");
  const progress=document.getElementById("tutorialProgress");
  if(!content||!progress)return;
  content.innerHTML=`<div class="tutorial-icon">${step.icon}</div><p class="eyebrow">${escapeHTML(step.eyebrow)}</p><h2>${escapeHTML(step.title)}</h2><p class="tutorial-text">${escapeHTML(step.text)}</p>${step.bullets?.length?`<div class="tutorial-bullets">${step.bullets.map(item=>`<div><span>🌸</span><p>${escapeHTML(item)}</p></div>`).join("")}</div>`:""}`;
  progress.innerHTML=HANA_TUTORIAL_STEPS.map((_,index)=>`<span class="${index===tutorialStepIndex?"active":""}"></span>`).join("");
  const back=document.getElementById("tutorialBackButton"),next=document.getElementById("tutorialNextButton");
  if(back)back.disabled=tutorialStepIndex===0;
  if(next)next.textContent=tutorialStepIndex===HANA_TUTORIAL_STEPS.length-1?"Start using Hana":"Next";
}

function openTutorial({fromStart=true}={}){
  if(fromStart)tutorialStepIndex=0;
  closeNavDrawer();
  renderTutorialStep();
  openModal("tutorialModal");
}
function tutorialNext(){
  if(tutorialStepIndex>=HANA_TUTORIAL_STEPS.length-1){finishTutorial();return;}
  tutorialStepIndex+=1;renderTutorialStep();
}
function tutorialBack(){if(tutorialStepIndex>0){tutorialStepIndex-=1;renderTutorialStep();}}
function finishTutorial(){state.settings.tutorialCompleted=true;saveState();closeModal("tutorialModal");}
function maybeOpenFirstRunTutorial(){if(state.settings.tutorialCompleted===false)setTimeout(()=>openTutorial(),180);}

function render() {
  resetDailyFocusIfNeeded();
  renderModeBar();
  refreshSpaceSelects();
  updateNavigation();
  renderQuickAccess();

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
    case "calendar": renderCalendar(); break;
    case "projects": renderProjects(); break;
    case "garden": renderGarden(); break;
    case "insights": renderPlanningInsights(); break;
    case "rescue": renderRescueDay(); break;
    case "time-pockets": renderTimePockets(); break;
    case "waiting-garden": renderWaitingGarden(); break;
    case "future-notes": renderFutureNotes(); break;
    case "threads": renderThreads(); break;
    case "return-ritual": renderReturnRitual(); break;
    case "templates": renderTemplates(); break;
    case "history": renderHistory(); break;
    case "trash": renderTrash(); break;
    case "settings": renderSettings(); break;
    case "more": renderSettings(); break;
    default: renderToday(); break;
  }
  saveState();
}

function changePage(page) {
  state.currentPage = page;
  window.scrollTo({ top: 0, behavior: "smooth" });
  render();
}

function bottomNavOptionsHTML(selectedValue = "") {
  return Object.entries(BOTTOM_NAV_OPTIONS).map(([key,item]) => `<option value="${key}" ${key===selectedValue?"selected":""}>${item.icon} ${escapeHTML(item.label)}</option>`).join("");
}

function renderBottomNavigation() {
  const selected = Array.isArray(state.settings.bottomNav) ? state.settings.bottomNav.slice(0,2) : DEFAULT_BOTTOM_NAV.slice();
  ["bottomNavSlot1","bottomNavSlot2"].forEach((id,index) => {
    const button = document.getElementById(id);
    const key = selected[index] || DEFAULT_BOTTOM_NAV[index];
    const item = BOTTOM_NAV_OPTIONS[key] || BOTTOM_NAV_OPTIONS[DEFAULT_BOTTOM_NAV[index]];
    if (!button || !item) return;
    button.dataset.page = key;
    button.innerHTML = `<span class="nav-icon">${item.icon}</span><span>${escapeHTML(item.label)}</span>`;
    button.setAttribute("aria-label", item.label);
  });
}

function updateNavigation() {
  renderBottomNavigation();
  document.querySelectorAll(".nav-button[data-page]").forEach(button => {
    button.classList.toggle("active", button.dataset.page === state.currentPage);
  });
}

function saveBottomNavigation() {
  const values=[document.getElementById("bottomNavSlot1Setting")?.value,document.getElementById("bottomNavSlot2Setting")?.value].filter(Boolean);
  if(values.length!==2)return showToast("Choose two bottom shortcuts 🌸");
  if(values[0]===values[1])return showToast("Choose two different shortcuts 🌸");
  state.settings.bottomNav=values;
  saveState();
  showToast("Bottom navigation updated ✨");
  render();
}

function restoreBottomNavigation() {
  state.settings.bottomNav=DEFAULT_BOTTOM_NAV.slice();
  saveState();
  showToast("Bottom navigation restored 🌸");
  render();
}

function updateModeButtons() { renderModeBar(); }

/* ================= TODAY / HANA MORNING ================= */

function attentionItems() {
  const tasks = filterByMode(state.tasks).filter(t => !t.completed);
  const reminders = filterByMode(state.reminders).filter(r => !r.completed);
  const overdue = tasks.filter(t => t.dueDate && t.dueDate < todayISO()).slice(0, 2).map(t => ({ icon:"🔴", text:t.title }));
  const today = tasks.filter(t => t.dueDate === todayISO()).slice(0, 2).map(t => ({ icon:t.priority === "high" ? "🟠" : "🌸", text:t.title }));
  const nextReminder = reminders.filter(r => r.date >= todayISO()).sort((a,b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))[0];
  const nextEvent = eventsForDate(todayISO())[0];
  const list = [...overdue, ...today];
  if (nextEvent) list.push({ icon:"📅", text:`${nextEvent.title} · ${formatTime(nextEvent.startTime)}` });
  else if (nextReminder) list.push({ icon:"🔔", text:`${nextReminder.title} · ${formatDate(nextReminder.date)}` });
  return list.slice(0, 3);
}

function renderToday() {
  if (state.todayViewMode === "do") return renderDoMode();
  const container = document.getElementById("pageContent");
  const visibleTasks = filterByMode(state.tasks);
  const active = visibleTasks.filter(t => !t.completed);
  const completedToday = visibleTasks.filter(t => t.completedDate === todayISO()).length;
  const focusTasks = focusTasksVisible();
  const recommendations = getBouquetRecommendations();
  const attention = attentionItems();
  const futureDue = dueFutureNotes();
  const waitingDue = waitingTasks().filter(t => t.followUpDate && t.followUpDate <= todayISO());
  const focusTotal = focusTasks.length + completedToday;
  const progress = focusTotal ? Math.round((completedToday / focusTotal) * 100) : 0;
  const capacity = capacitySnapshot(focusTasks);
  const capacityWidth = Math.min(100, Math.round(capacity.ratio * 100));
  const intention = intentionForToday();
  container.innerHTML = `
    <div class="day-mode-switch" role="group" aria-label="Today mode"><button class="day-mode-button active" data-today-view="plan">Plan</button><button class="day-mode-button" data-today-view="do">Do</button></div>
    <section class="morning-card morning-card-simple"><div class="morning-title"><div><p class="eyebrow">${escapeHTML(formatLongToday())}</p><h1>${greeting()} 🌸</h1></div></div><div class="morning-compact-stats"><span><strong>${active.length}</strong> active</span><span><strong>${waitingTasks().length}</strong> waiting</span><span><strong>${completedToday}</strong> done</span></div>${attention.length ? `<div class="attention-list attention-list-simple">${attention.slice(0,2).map(i => `<div class="attention-item"><span>${i.icon}</span><span>${escapeHTML(i.text)}</span></div>`).join("")}${attention.length>2?`<button data-goto="agenda">+ ${attention.length-2} more</button>`:""}</div>` : `<div class="attention-item quiet-attention"><span>🌿</span><span>Nothing urgent is asking for you.</span></div>`}${firewallIsActive() ? `<div class="firewall-banner">🌙 Boundary Firewall is active.</div>` : ""}</section>
    ${(futureDue.length || waitingDue.length) ? `<section class="life-flow-strip compact-life-flow">${futureDue.length ? `<button data-goto="future-notes"><span>💌</span><strong>${futureDue.length} Future Me</strong></button>` : ""}${waitingDue.length ? `<button data-goto="waiting-garden"><span>⏳</span><strong>${waitingDue.length} follow-up${waitingDue.length===1?"":"s"}</strong></button>` : ""}</section>` : ""}
    ${futureDue.length ? `<section class="future-morning-card compact-future-card"><p class="eyebrow">FROM PAST YOU</p><h2>💌 ${escapeHTML(futureDue[0].title)}</h2><p>${escapeHTML(futureDue[0].content)}</p><div class="future-note-actions"><button data-future-note-task="${futureDue[0].id}">Make task</button><button data-archive-future-note="${futureDue[0].id}">Archive</button></div></section>` : ""}
    <section class="section focus-section-simple"><div class="section-header"><div><p class="eyebrow">TODAY</p><h2>Focus Bouquet</h2></div><button data-goto="bloom">View all</button></div><div class="bloom-count">${focusTasks.length} in focus · ${completedToday} completed</div><div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div><div class="focus-grid">${focusTasks.length ? focusTasks.map(t => focusTaskRow(t, true)).join("") : `<div class="empty-state compact-empty"><div class="empty-icon">💐</div><h3>Your bouquet is empty</h3><p>Add only what matters today.</p><button class="secondary-button" data-goto="tasks">Choose tasks</button></div>`}</div></section>
    <details class="today-planning-details"><summary><span>Plan my day</span><small>Intention, capacity &amp; suggestions</small></summary><div class="today-planning-body"><section class="intention-card simplified-inner-card"><div><p class="eyebrow">DAY INTENTION</p><h2>How should today feel?</h2></div><div class="intention-input-row"><input id="dayIntentionInput" type="text" maxlength="120" value="${escapeHTML(intention)}" placeholder="Keep today light..." /><button class="primary-button" data-save-intention>Save</button></div></section><section class="capacity-card capacity-${capacity.level} simplified-inner-card"><div class="capacity-heading"><div><p class="eyebrow">CAPACITY</p><h2>${capacityLabel(capacity.level)}</h2></div><strong>${formatDuration(capacity.minutes)} / ${formatDuration(capacity.capacity)}</strong></div><div class="capacity-track"><div class="capacity-fill" style="width:${capacityWidth}%"></div></div><div class="capacity-actions"><button class="secondary-button" data-goto="time-pockets">Time Pockets</button><button class="secondary-button" data-goto="rescue">Rescue My Day</button></div></section><section class="section recommendation-section simplified-inner-card"><div class="section-header"><div><p class="eyebrow">SUGGESTIONS</p><h2>What fits next</h2></div>${recommendations.length?`<button data-apply-recommendations>Add all</button>`:""}</div>${recommendations.length ? `<div class="recommendation-list">${recommendations.map(task=>`<div class="recommendation-card"><div><strong>${escapeHTML(task.title)}</strong><small>${formatDuration(taskPlanningMinutes(task))} · ${energyLabel(task.energy)}</small></div><button class="focus-add" data-focus-task="${task.id}">+ Add</button></div>`).join("")}</div>` : `<div class="card soft-card"><strong>Nothing else needs today 🌿</strong></div>`}</section></div></details>
    <section class="section compact-more-section"><div class="more-grid"><button class="more-card" data-goto="inbox"><span class="more-icon">🧠</span><strong>Brain Dump</strong></button><button class="more-card" data-goto="daily-close"><span class="more-icon">🌙</span><strong>Daily Close</strong></button></div></section>
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
  markFocusHistory(task);
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
  const secondary = [];
  if (task.subtasks.length) secondary.push(`${doneSubs}/${task.subtasks.length} steps`);
  if (task.durationMinutes) secondary.push(formatDuration(task.durationMinutes));
  if (task.reminderEnabled) secondary.push("Reminder");
  if (task.rescheduleCount >= 2) secondary.push(`Moved ${task.rescheduleCount}×`);

  return `<div class="task-swipe-shell" data-task-swipe-shell="${task.id}">
    <button class="task-swipe-action task-swipe-edit" data-swipe-task-edit="${task.id}" aria-label="Edit ${escapeHTML(task.title)}">Edit</button>
    <button class="task-swipe-action task-swipe-delete" data-swipe-task-delete="${task.id}" aria-label="Delete ${escapeHTML(task.title)}">Delete</button>
    <div class="task-item gesture-task-item ${task.completed ? "completed" : ""}" data-gesture-task="${task.id}">
      <button class="task-checkbox ${task.completed ? "checked" : ""}" data-toggle-task="${task.id}" aria-label="Toggle task">${task.completed ? "✓" : ""}</button>
      <div class="task-main" data-edit-task="${task.id}">
        <div class="task-title">${escapeHTML(task.title)}</div>
        <div class="task-meta task-meta-primary">
          <span class="badge ${modeBadge(task.space)}">${modeLabel(task.space)}</span>
          ${task.project ? `<span>🌷 ${escapeHTML(task.project)}</span>` : ""}
          ${task.dueDate ? `<span class="${overdue ? "overdue-text" : ""}">${overdue ? "⚠️ " : "📅 "}${formatDate(task.dueDate)}</span>` : ""}
          <span class="badge badge-${task.status}">${statusLabel(task.status)}</span>
        </div>
        ${secondary.length ? `<div class="task-secondary-meta">${secondary.map(item=>`<span>${escapeHTML(item)}</span>`).join("<i>·</i>")}</div>` : ""}
        ${task.status === "waiting" && (task.waitingOn || task.followUpDate) ? `<div class="task-waiting-note"><strong>Waiting:</strong> ${escapeHTML(task.waitingOn || "Follow-up")}${task.followUpDate ? ` · ${formatDate(task.followUpDate)}` : ""}</div>` : ""}
        ${task.rescheduleCount >= 2 && !task.completed ? `<button class="no-guilt-inline" data-reflect-reschedule="${task.id}">🌿 Help me rethink this</button>` : ""}
      </div>
    </div>
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
  const activeCount = visibleBase.filter(t=>!t.completed).length;
  const waitingCount = visibleBase.filter(t=>!t.completed&&t.status==="waiting").length;
  const overdueCount = visibleBase.filter(t=>!t.completed&&t.dueDate&&t.dueDate<todayISO()).length;
  const filtersOpen = Boolean(search || state.taskProjectFilter !== "all" || state.taskFilter !== "all");
  const filterLabel = filters.find(([value])=>value===state.taskFilter)?.[1] || "All";
  container.innerHTML = `
    <div class="page-heading simplified-page-heading"><p class="eyebrow">TASKS</p><div class="page-heading-row"><div><h1>Tasks</h1><p>${activeCount} active · ${waitingCount} waiting · ${overdueCount} overdue</p></div><button class="primary-button quick-task-launch" data-quick-task>+ Quick task</button></div></div>
    <details class="task-filter-panel" ${filtersOpen?"open":""}>
      <summary><span>Search &amp; filter</span><small>${escapeHTML(filterLabel)}${state.taskProjectFilter!=="all"?` · ${escapeHTML(state.taskProjectFilter)}`:""}</small></summary>
      <div class="task-filter-body"><div class="task-tools"><div class="search-box"><input id="taskSearch" type="search" placeholder="Search tasks..." value="${escapeHTML(state.taskSearch || "")}" /></div><select id="taskProjectFilter" class="task-project-select"><option value="all">All projects</option>${projects.map(p=>`<option value="${escapeHTML(p)}" ${state.taskProjectFilter===p?"selected":""}>${escapeHTML(p)}</option>`).join("")}</select></div><div class="filter-row">${filters.map(([v,l])=>`<button class="filter-chip ${state.taskFilter===v?"active":""}" data-task-filter="${v}">${l}</button>`).join("")}</div></div>
    </details>
    <div class="task-gesture-hint">Tap to open · swipe right to edit · swipe left to delete · hold for actions</div>
    ${tasks.length ? `<div class="task-list">${tasks.map(taskCard).join("")}</div>` : emptyState("🌱","Nothing here","No tasks match this view.","Add a task","open-task")}
  `;
}

function openQuickTaskModal(){refreshSpaceSelects();document.getElementById("quickTaskTitle").value="";document.getElementById("quickTaskSpace").value=preferredSpace();document.getElementById("quickTaskDue").value="";openModal("quickTaskModal");setTimeout(()=>document.getElementById("quickTaskTitle")?.focus(),80);}
function saveQuickTask(){const title=document.getElementById("quickTaskTitle").value.trim();if(!title)return showToast("Add a task title first 🌸");state.tasks.push(normalizeTask({title,space:document.getElementById("quickTaskSpace").value,dueDate:document.getElementById("quickTaskDue").value,priority:"medium",status:"todo",durationMinutes:0,energy:"medium",deadlineType:"soft",createdAt:Date.now()}));closeModal("quickTaskModal");showToast("Quick task added ⚡");changePage("tasks");}

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
  document.getElementById("taskScheduledDate").value = "";
  document.getElementById("taskScheduledStart").value = "";
  refreshProjectDatalist();
  refreshTaskMilestoneOptions();
  document.getElementById("taskRecurrenceInterval").value = "1";
  document.getElementById("taskModalEyebrow").textContent = "NEW BLOOM";
  document.getElementById("taskModalTitle").textContent = "Add task";
  document.getElementById("saveTaskButton").textContent = "Add task";
  document.getElementById("deleteTaskFromModal").classList.add("hidden");
  const advancedDetails = document.getElementById("taskAdvancedDetails");
  if (advancedDetails) advancedDetails.open = false;
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
    document.getElementById("taskScheduledDate").value = task.scheduledDate || "";
    document.getElementById("taskScheduledStart").value = task.scheduledStart || "";
    refreshTaskMilestoneOptions(task.project, task.milestoneId);
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
  const requestedDueDate = document.getElementById("taskDate").value;
  const manualDateChanged = Boolean(old && old.dueDate && requestedDueDate && old.dueDate !== requestedDueDate);

  const task = normalizeTask({
    ...(old || {}),
    id: id || createId(),
    title,
    space: document.getElementById("taskSpace").value,
    priority: document.getElementById("taskPriority").value,
    project: document.getElementById("taskProject").value.trim(),
    tags: parseTags(document.getElementById("taskTags").value),
    dueDate: requestedDueDate,
    dueTime: document.getElementById("taskTime").value,
    scheduledDate: document.getElementById("taskScheduledDate").value,
    scheduledStart: document.getElementById("taskScheduledStart").value,
    milestoneId: document.getElementById("taskMilestone")?.value || "",
    durationMinutes: Math.max(0, Number(document.getElementById("taskDuration").value || 0)),
    energy: document.getElementById("taskEnergy").value,
    deadlineType: document.getElementById("taskDeadlineType").value,
    status,
    completed: status === "done",
    completedDate: status === "done" ? (old?.completedDate || todayISO()) : null,
    completedAt: status === "done" ? (old?.completedAt || Date.now()) : null,
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

  if (status === "waiting") task.waitingSince = old?.status === "waiting" ? (old.waitingSince || todayISO()) : todayISO();
  else if (old?.status === "waiting") task.waitingSince = "";
  if (manualDateChanged) {
    task.rescheduleCount = Number(old.rescheduleCount || 0) + 1;
    task.rescheduleHistory = [...(old.rescheduleHistory || []), { date:todayISO(), from:old.dueDate, to:requestedDueDate, source:"manual edit", at:Date.now() }];
    if (task.rescheduleCount >= 2) state.pendingRescheduleTaskId = task.id;
  }
  if (old) state.tasks[state.tasks.findIndex(t=>t.id===id)] = task;
  else state.tasks.push(task);
  ensureProjectRecord(task.project, task.space);

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
  maybeOpenRescheduleReflection();
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
  task.completedAt = completing ? Date.now() : null;
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
  if (task.status === "waiting" && !task.waitingSince) task.waitingSince = todayISO();
  if (task.status !== "waiting") task.waitingSince = "";
  task.updatedAt = Date.now(); showToast(`Status: ${statusLabel(task.status)}`); render();
}

function deleteTask(id, options = {}) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;
  const needsConfirm = options.confirm !== false;
  if (needsConfirm && !confirm("Move this task to Trash?")) return;
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
  ["noteEditId","noteTitle","noteTags","noteContent","noteChecklist","noteProject"].forEach(id=>document.getElementById(id).value="");
  refreshProjectDatalist();
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
    document.getElementById("noteEditId").value=note.id; document.getElementById("noteTitle").value=note.title; document.getElementById("noteType").value=note.type; document.getElementById("noteSpace").value=note.space; document.getElementById("noteTags").value=note.tags.join(", "); document.getElementById("noteProject").value=note.project||""; document.getElementById("noteContent").value=note.content; document.getElementById("noteChecklist").value=note.checklist.map(i=>i.title).join("\n"); document.getElementById("noteResettable").checked=note.resettable; document.getElementById("notePinned").checked=note.pinned;
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
  const note=normalizeNote({...(old||{}),id:id||createId(),title:title||"Untitled note",type:document.getElementById("noteType").value,space:document.getElementById("noteSpace").value,project:document.getElementById("noteProject").value.trim(),tags:parseTags(document.getElementById("noteTags").value),content,checklist:checks,resettable:document.getElementById("noteResettable").checked,pinned:document.getElementById("notePinned").checked,createdAt:old?.createdAt||Date.now(),updatedAt:Date.now()});
  if(old) state.notes[state.notes.findIndex(n=>n.id===id)]=note; else state.notes.push(note);
  ensureProjectRecord(note.project, note.space);
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

function advanceReminder(r){if(r.repeatType==="monthly"){r.date=addMonthsClamped(r.date,1);}else if(r.repeatType==="yearly"){r.date=addYearsClamped(r.date,1);}else{const base=new Date(`${r.date}T12:00:00`);if(r.repeatType==="daily")base.setDate(base.getDate()+1);if(r.repeatType==="custom")base.setDate(base.getDate()+r.repeatInterval);if(r.repeatType==="weekly")base.setDate(base.getDate()+7);if(r.repeatType==="weekdays"){do{base.setDate(base.getDate()+1)}while([0,6].includes(base.getDay()));}r.date=localDateISO(base);}r.notified=false;r.chainNotified=[];r.completed=false;}

function snoozeReminder(id,type){const r=state.reminders.find(r=>r.id===id);if(!r)return;const now=new Date();if(type==="tonight"){r.date=todayISO();r.time="19:00";}if(type==="tomorrow"){r.date=addDaysISO(todayISO(),1);r.time="08:00";}if(type==="workday"){r.date=nextWorkdayISO(now);r.time="09:00";}if(type==="week"){r.date=addDaysISO(todayISO(),7);r.time="09:00";}r.notified=false;r.chainNotified=[];showToast("Reminder snoozed 🌙");render();}

function reminderCanNotify(r){const protectedSpaceId=state.settings.workFirewallSpaceId;if(!protectedSpaceId||r.space!==protectedSpaceId||!state.settings.workFirewallEnabled||isWorkTime())return true;if(!state.settings.allowHighPriorityWorkReminders)return false;const t=state.tasks.find(t=>t.id===r.linkedTaskId);return t?.priority==="high";}

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
      <div class="quick-list-add-card">
        <div class="quick-list-add-head"><strong>Quick add</strong><small>One line per item. Optional format: item | quantity | detail</small></div>
        <textarea id="quickListInput_${list.id}" class="quick-list-textarea" placeholder="Milk
Eggs | 1 tray
Shampoo | 2 | refill pouches"></textarea>
        <div class="quick-list-add-actions"><button class="secondary-button" data-quick-add-list="${list.id}">Add lines</button></div>
      </div>
      <div class="standalone-checklist">
        ${total ? list.items.map(item => {
          const meta = [item.quantity ? `${escapeHTML(list.quantityLabel)}: ${escapeHTML(item.quantity)}` : "", item.detail ? `${escapeHTML(list.detailLabel)}: ${escapeHTML(item.detail)}` : ""].filter(Boolean).join(" · ");
          return `
          <div class="standalone-check-item ${item.completed?"done":""}">
            <button class="list-check-box ${item.completed?"checked":""}" data-toggle-list-item="${item.id}" data-list-id="${list.id}" aria-label="Toggle ${escapeHTML(item.title)}">${item.completed?"✓":""}</button>
            <button class="list-item-main" data-edit-list-item="${item.id}" data-list-id="${list.id}">
              <strong>${escapeHTML(item.title)}</strong>
              ${meta ? `<small>${meta}</small>` : ""}
            </button>
            <button class="mini-icon-button" data-edit-list-item="${item.id}" data-list-id="${list.id}" title="Edit item">✎</button>
          </div>`;
        }).join("") : `<div class="empty-state checklist-empty"><div class="empty-icon">☑️</div><h3>Nothing on this list yet</h3><p>Add items one by one or use Quick add so each entry still stays independently checkable.</p><button class="secondary-button" data-add-list-item="${list.id}">Add first item</button></div>`}
      </div>
    </section>`;
}

function clearListForm() {
  refreshSpaceSelects();
  document.getElementById("listEditId").value = "";
  document.getElementById("listIcon").value = "☑️";
  document.getElementById("listName").value = "";
  document.getElementById("listSpace").value = preferredSpace();
  document.getElementById("listQuantityLabel").value = "Quantity";
  document.getElementById("listDetailLabel").value = "Detail";
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
    document.getElementById("listQuantityLabel").value = list.quantityLabel || "Quantity";
    document.getElementById("listDetailLabel").value = list.detailLabel || "Detail";
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
    quantityLabel: document.getElementById("listQuantityLabel").value.trim() || "Quantity",
    detailLabel: document.getElementById("listDetailLabel").value.trim() || "Detail",
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
  document.getElementById("listItemQuantity").value = item?.quantity || "";
  document.getElementById("listItemDetail").value = item?.detail || "";
  document.getElementById("listItemQuantityLabel").innerHTML = `${escapeHTML(list.quantityLabel || "Quantity")} <span class="optional-label">optional</span>`;
  document.getElementById("listItemDetailLabel").innerHTML = `${escapeHTML(list.detailLabel || "Detail")} <span class="optional-label">optional</span>`;
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
    quantity: document.getElementById("listItemQuantity").value.trim(),
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

function quickAddListItems(listId) {
  const list = state.lists.find(item => item.id === listId);
  const input = document.getElementById(`quickListInput_${listId}`);
  if (!list || !input) return;
  const lines = parseLines(input.value);
  if (!lines.length) return showToast("Type at least one line first 🌸");
  const created = lines.map(line => {
    const [titleRaw, quantityRaw = "", detailRaw = ""] = line.split("|").map(part => part.trim());
    return { id: createId(), title: titleRaw, quantity: quantityRaw, detail: detailRaw, completed: false, createdAt: Date.now(), updatedAt: Date.now() };
  }).filter(item => item.title);
  if (!created.length) return showToast("Nothing to add yet 🌸");
  list.items.push(...created);
  list.updatedAt = Date.now();
  input.value = "";
  showToast(`${created.length} item${created.length===1?"":"s"} added ☑️`);
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


function getSortedTableRows(table){
  const rows=[...table.rows];
  if(table.sortMode!=="auto"||!table.sortColumnId)return rows;
  const col=table.columns.find(c=>c.id===table.sortColumnId);
  if(!col)return rows;
  const dir=table.sortDirection==="desc"?-1:1;
  return rows.sort((a,b)=>{
    const av=a.values[col.id], bv=b.values[col.id];
    if(["number","money","progress"].includes(col.type)) return (Number(av||0)-Number(bv||0))*dir;
    if(["date","reminder"].includes(col.type)) return String(av||"").localeCompare(String(bv||""))*dir;
    if(col.type==="checkbox") return (Number(Boolean(av))-Number(Boolean(bv)))*dir;
    return String(av??"").localeCompare(String(bv??""),undefined,{numeric:true,sensitivity:"base"})*dir;
  });
}

/* ===== v1.9.1 TRACKER BULK EDIT / CLIPBOARD ===== */
let tableBulkState={tableId:"",active:false,selectedRows:new Set(),selectedCols:new Set()};
function resetTableBulkState(table=null,active=false){
  tableBulkState={tableId:table?.id||"",active:Boolean(active),selectedRows:new Set(),selectedCols:new Set(active&&table?table.columns.map(col=>col.id):[])};
}
function ensureTableBulkState(table){
  if(!table||tableBulkState.tableId!==table.id)resetTableBulkState(table,false);
  if(tableBulkState.active){
    const rowIds=new Set(table.rows.map(row=>row.id)),colIds=new Set(table.columns.map(col=>col.id));
    tableBulkState.selectedRows=new Set([...tableBulkState.selectedRows].filter(id=>rowIds.has(id)));
    tableBulkState.selectedCols=new Set([...tableBulkState.selectedCols].filter(id=>colIds.has(id)));
  }
  return tableBulkState;
}
function isTableBulkActive(tableId){return tableBulkState.active&&tableBulkState.tableId===tableId;}
function selectedBulkRows(table){const bulk=ensureTableBulkState(table);return getSortedTableRows(table).filter(row=>bulk.selectedRows.has(row.id));}
function selectedBulkCols(table){const bulk=ensureTableBulkState(table);return table.columns.filter(col=>bulk.selectedCols.has(col.id));}
function toggleTableBulkMode(tableId){
  const table=state.tables.find(item=>item.id===tableId);if(!table)return;
  if(isTableBulkActive(tableId))resetTableBulkState(table,false);else resetTableBulkState(table,true);
  render();
}
function refreshBulkControls(tableId){
  const table=state.tables.find(item=>item.id===tableId);if(!table||!isTableBulkActive(tableId))return;
  const rows=selectedBulkRows(table),cols=selectedBulkCols(table),allRows=getSortedTableRows(table);
  const summary=document.querySelector(`[data-bulk-summary="${tableId}"]`);
  if(summary)summary.textContent=`${rows.length} row${rows.length===1?"":"s"} · ${cols.length} column${cols.length===1?"":"s"}`;
  document.querySelectorAll(`[data-bulk-action-for="${tableId}"]`).forEach(button=>button.disabled=!rows.length||!cols.length);
  const rowAll=document.querySelector(`[data-bulk-select-all-rows="${tableId}"]`);if(rowAll){rowAll.checked=Boolean(allRows.length&&rows.length===allRows.length);rowAll.indeterminate=rows.length>0&&rows.length<allRows.length;}
  const colAll=document.querySelector(`[data-bulk-select-all-cols="${tableId}"]`);if(colAll){colAll.checked=Boolean(table.columns.length&&cols.length===table.columns.length);colAll.indeterminate=cols.length>0&&cols.length<table.columns.length;}
  document.querySelectorAll(`[data-bulk-row="${tableId}"]`).forEach(row=>row.classList.toggle("bulk-selected",tableBulkState.selectedRows.has(row.dataset.rowId)));
  document.querySelectorAll(`[data-bulk-col-head="${tableId}"]`).forEach(head=>head.classList.toggle("bulk-selected",tableBulkState.selectedCols.has(head.dataset.colId)));
}
function bulkCellEditorHTML(col,value,table,rowId){
  const attrs=`data-bulk-cell data-bulk-row-id="${rowId}" data-bulk-col-id="${col.id}" data-bulk-col-type="${col.type}"`;
  if(col.type==="checkbox")return `<label class="bulk-cell-check"><input ${attrs} type="checkbox" ${value?"checked":""}/><span>${value?"Yes":"No"}</span></label>`;
  if(col.type==="status")return `<select ${attrs}>${(table.statusOptions||DEFAULT_TABLE_STATUSES).map(option=>`<option value="${escapeHTML(option)}" ${String(value||"").toLowerCase()===String(option).toLowerCase()?"selected":""}>${escapeHTML(option)}</option>`).join("")}</select>`;
  if(col.type==="progress")return `<select ${attrs}>${progressOptions(value)}</select>`;
  const inputType=["date","reminder"].includes(col.type)?"date":(["number","money"].includes(col.type)?"number":col.type==="link"?"url":"text");
  return `<input ${attrs} type="${inputType}" ${col.type==="money"?'step="0.01"':""} value="${escapeHTML(value??"")}" />`;
}
function openBulkTableEdit(tableId){
  const table=state.tables.find(item=>item.id===tableId);if(!table)return;
  const rows=selectedBulkRows(table),cols=selectedBulkCols(table);if(!rows.length||!cols.length)return showToast("Select at least one row and column 🌸");
  document.getElementById("bulkTableEditId").value=tableId;
  document.getElementById("bulkTableEditTitle").textContent=`Edit ${rows.length} row${rows.length===1?"":"s"}`;
  document.getElementById("bulkTableEditMeta").textContent=`${cols.length} selected column${cols.length===1?"":"s"} · changes save together`;
  document.getElementById("bulkTableEditGrid").innerHTML=`<table class="bulk-edit-table"><thead><tr><th>Row</th>${cols.map(col=>`<th>${escapeHTML(col.name)}</th>`).join("")}</tr></thead><tbody>${rows.map((row,index)=>`<tr><th>${index+1}</th>${cols.map(col=>`<td>${bulkCellEditorHTML(col,row.values[col.id],table,row.id)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  openModal("bulkTableEditModal");
}
function readBulkEditorValue(el){
  const type=el.dataset.bulkColType;
  if(type==="checkbox")return el.checked;
  if(["number","money","progress"].includes(type))return el.value===""?"":Number(el.value||0);
  return el.value;
}
function saveBulkTableEdits(){
  const table=state.tables.find(item=>item.id===document.getElementById("bulkTableEditId").value);if(!table)return;
  createSafetySnapshot("pre-bulk-edit",JSON.stringify(state),{force:true});
  let changedRows=0;const touched=new Set();
  document.querySelectorAll("#bulkTableEditGrid [data-bulk-cell]").forEach(el=>{const row=table.rows.find(item=>item.id===el.dataset.bulkRowId);if(!row)return;const value=readBulkEditorValue(el);if(row.values[el.dataset.bulkColId]!==value){row.values[el.dataset.bulkColId]=value;row.updatedAt=Date.now();touched.add(row.id);}});
  changedRows=touched.size;closeModal("bulkTableEditModal");
  if(changedRows)showToast(`${changedRows} row${changedRows===1?"":"s"} updated 🌸`);else showToast("No changes to save 🌿");
  render();
}
async function copyBulkEditorGrid(){
  const rows=[...document.querySelectorAll("#bulkTableEditGrid tbody tr")];if(!rows.length)return;
  const text=rows.map(row=>[...row.querySelectorAll("[data-bulk-cell]")].map(el=>{const value=readBulkEditorValue(el);return el.dataset.bulkColType==="checkbox"?(value?"TRUE":"FALSE"):String(value??"").replace(/\t/g," ").replace(/[\r\n]+/g," ");}).join("\t")).join("\n");
  const ok=await writeClipboardText(text);showToast(ok?"Bulk edit grid copied 📋":"Couldn’t access the clipboard.");
}
function clipboardCellValue(col,value){
  if(col.type==="checkbox")return value?"TRUE":"FALSE";
  return String(value??"").replace(/\t/g," ").replace(/[\r\n]+/g," ");
}
function bulkClipboardText(table){
  const rows=selectedBulkRows(table),cols=selectedBulkCols(table);
  return rows.map(row=>cols.map(col=>clipboardCellValue(col,row.values[col.id])).join("\t")).join("\n");
}
async function writeClipboardText(text){
  try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);return true;}}catch{}
  try{const area=document.createElement("textarea");area.value=text;area.setAttribute("readonly","");area.style.position="fixed";area.style.opacity="0";document.body.appendChild(area);area.select();const ok=document.execCommand("copy");area.remove();return ok;}catch{return false;}
}
async function copyBulkTableCells(tableId){
  const table=state.tables.find(item=>item.id===tableId);if(!table)return;
  const rows=selectedBulkRows(table),cols=selectedBulkCols(table);if(!rows.length||!cols.length)return showToast("Select rows and columns first 🌸");
  const ok=await writeClipboardText(bulkClipboardText(table));
  showToast(ok?`Copied ${rows.length} × ${cols.length} cells 📋`:"Couldn’t access the clipboard. Try Edit selected and copy manually.");
}
function openBulkPasteModal(tableId){
  const table=state.tables.find(item=>item.id===tableId);if(!table)return;
  const rows=selectedBulkRows(table),cols=selectedBulkCols(table);if(!rows.length||!cols.length)return showToast("Select rows and columns first 🌸");
  document.getElementById("bulkPasteTableId").value=tableId;
  document.getElementById("bulkPasteMeta").textContent=`Paste ${cols.length} column${cols.length===1?"":"s"} into ${rows.length} selected row${rows.length===1?"":"s"}. One pasted row can be repeated across all selected rows.`;
  document.getElementById("bulkPasteArea").value="";
  openModal("bulkTablePasteModal");setTimeout(()=>document.getElementById("bulkPasteArea")?.focus(),80);
}
function normalizeBulkDate(value){
  const text=String(value||"").trim();if(!text)return "";if(/^\d{4}-\d{2}-\d{2}$/.test(text))return text;
  const date=new Date(text);return Number.isNaN(date.getTime())?text:localDateISO(date);
}
function coerceBulkPasteValue(col,value,table){
  const text=String(value??"").trim();
  if(col.type==="checkbox")return /^(true|yes|y|1|x|checked|done)$/i.test(text);
  if(["number","money"].includes(col.type)){if(!text)return "";const n=Number(text.replace(/[^0-9.+-]/g,""));return Number.isFinite(n)?n:"";}
  if(col.type==="progress"){if(!text)return "";const n=Number(text.replace(/[^0-9.+-]/g,""));return Number.isFinite(n)?Math.max(0,Math.min(100,n)):0;}
  if(["date","reminder"].includes(col.type))return normalizeBulkDate(text);
  if(col.type==="status"&&text){const match=(table.statusOptions||[]).find(option=>String(option).toLowerCase()===text.toLowerCase());if(match)return match;table.statusOptions=[...(table.statusOptions||DEFAULT_TABLE_STATUSES),text.toLowerCase()];return text.toLowerCase();}
  return String(value??"");
}
function parseTSV(text){
  const clean=String(text||"").replace(/\r/g,"").replace(/\n+$/,"");if(!clean)return [];
  return clean.split("\n").map(line=>line.split("\t"));
}
function applyBulkPaste(){
  const table=state.tables.find(item=>item.id===document.getElementById("bulkPasteTableId").value);if(!table)return;
  const rows=selectedBulkRows(table),cols=selectedBulkCols(table),matrix=parseTSV(document.getElementById("bulkPasteArea").value);if(!matrix.length)return showToast("Paste some cells first 🌸");
  createSafetySnapshot("pre-bulk-paste",JSON.stringify(state),{force:true});
  const first=matrix[0]||[];const looksLikeHeader=cols.length&&cols.every((col,index)=>String(first[index]||"").trim().toLowerCase()===String(col.name).trim().toLowerCase());if(looksLikeHeader)matrix.shift();if(!matrix.length)return showToast("Only a header row was pasted.");
  let changed=0;rows.forEach((row,rowIndex)=>{const source=matrix.length===1?matrix[0]:matrix[rowIndex];if(!source)return;cols.forEach((col,colIndex)=>{if(colIndex>=source.length)return;const next=coerceBulkPasteValue(col,source[colIndex],table);if(row.values[col.id]!==next){row.values[col.id]=next;row.updatedAt=Date.now();changed++;}});});
  closeModal("bulkTablePasteModal");showToast(changed?`${changed} cell${changed===1?"":"s"} pasted 🌸`:"No cells changed 🌿");render();
}
function refreshTableSortColumnOptions(selected=""){
  const select=document.getElementById("tableSortColumn"); if(!select)return;
  select.innerHTML=tableBuilderColumns.map(c=>`<option value="${c.id}" ${c.id===selected?"selected":""}>${escapeHTML(c.name||"Column")}</option>`).join("");
}
function updateTableSortFields(){
  const auto=document.getElementById("tableSortMode")?.value==="auto";
  document.getElementById("tableAutoSortFields")?.classList.toggle("hidden",!auto);
  if(auto)refreshTableSortColumnOptions(document.getElementById("tableSortColumn")?.value||tableBuilderColumns[0]?.id||"");
}

function parseStatusOptions(text){
  const options = String(text || "").split(",").map(option => option.trim().toLowerCase()).filter(Boolean);
  return options.length ? [...new Set(options)] : DEFAULT_TABLE_STATUSES.slice();
}

let tableBuilderColumns = [];
function getTemplateDefinition(templateId){return TABLE_TEMPLATES[templateId] || TABLE_TEMPLATES.progress;}
function cloneTemplateColumns(columns){return columns.map(col => ({ id: col.id || createId(), name: String(col.name || "Column"), type: validColumnType(col.type) }));}
function renderTableColumnsBuilder(){
  const wrap = document.getElementById("tableColumnsBuilder");
  if(!wrap) return;
  wrap.innerHTML = tableBuilderColumns.map((col,index)=>`<div class="table-column-row"><div class="table-column-grip" title="Column ${index+1}">⋮⋮</div><input data-table-col-name="${col.id}" type="text" value="${escapeHTML(col.name)}" placeholder="Column name" /><select data-table-col-type="${col.id}"><option value="text" ${col.type==="text"?"selected":""}>Text</option><option value="number" ${col.type==="number"?"selected":""}>Number</option><option value="progress" ${col.type==="progress"?"selected":""}>Progress</option><option value="date" ${col.type==="date"?"selected":""}>Date</option><option value="checkbox" ${col.type==="checkbox"?"selected":""}>Checkbox</option><option value="status" ${col.type==="status"?"selected":""}>Status</option><option value="money" ${col.type==="money"?"selected":""}>Money</option><option value="tag" ${col.type==="tag"?"selected":""}>Tag</option><option value="link" ${col.type==="link"?"selected":""}>Link</option><option value="reminder" ${col.type==="reminder"?"selected":""}>Reminder date</option></select><div class="table-column-row-actions"><button type="button" class="mini-icon-button" data-shift-table-col="up" data-col-id="${col.id}" ${index===0?"disabled":""}>↑</button><button type="button" class="mini-icon-button" data-shift-table-col="down" data-col-id="${col.id}" ${index===tableBuilderColumns.length-1?"disabled":""}>↓</button><button type="button" class="mini-icon-button danger-outline-button" data-remove-table-col="${col.id}">×</button></div></div>`).join("");
  refreshTableSortColumnOptions(document.getElementById("tableSortColumn")?.value || tableBuilderColumns[0]?.id || "");
}
function syncTableBuilderFromDOM(){
  tableBuilderColumns = tableBuilderColumns.map(col => ({ ...col, name: document.querySelector(`[data-table-col-name="${col.id}"]`)?.value || col.name, type: validColumnType(document.querySelector(`[data-table-col-type="${col.id}"]`)?.value || col.type) }));
}
function setTableBuilderColumns(columns){ tableBuilderColumns = cloneTemplateColumns(columns && columns.length ? columns : [{id:createId(),name:"Item",type:"text"}]); renderTableColumnsBuilder(); }
function addTableColumnBuilder(column={name:"",type:"text"}){ syncTableBuilderFromDOM(); tableBuilderColumns.push({id:createId(),name:String(column.name||""),type:validColumnType(column.type||"text")}); renderTableColumnsBuilder(); }
function moveTableColumn(colId, direction){ syncTableBuilderFromDOM(); const index = tableBuilderColumns.findIndex(col => col.id===colId); if(index<0) return; const target = direction==="up" ? index-1 : index+1; if(target<0 || target>=tableBuilderColumns.length) return; [tableBuilderColumns[index], tableBuilderColumns[target]] = [tableBuilderColumns[target], tableBuilderColumns[index]]; renderTableColumnsBuilder(); }
function removeTableColumnBuilder(colId){ if(tableBuilderColumns.length<=1) return showToast("Keep at least one column 🌸"); tableBuilderColumns = tableBuilderColumns.filter(col => col.id!==colId); renderTableColumnsBuilder(); }
function getBuiltTableColumns(){ syncTableBuilderFromDOM(); return tableBuilderColumns.map(col => ({...col, name:String(col.name||"").trim()})).filter(col => col.name).map(col => ({id:col.id||createId(), name:col.name, type:validColumnType(col.type)})); }

const TABLE_TEMPLATES={
  progress:{name:"Progress Tracker",columns:[{name:"Item",type:"text"},{name:"Progress",type:"progress"},{name:"Status",type:"status"},{name:"Due",type:"date"},{name:"Remarks",type:"text"},{name:"Done",type:"checkbox"}],statusOptions:DEFAULT_TABLE_STATUSES.slice()},
  project:{name:"Project Tracker",columns:[{name:"Task",type:"text"},{name:"Owner",type:"text"},{name:"Progress",type:"progress"},{name:"Status",type:"status"},{name:"Due",type:"date"},{name:"Remarks",type:"text"}],statusOptions:DEFAULT_TABLE_STATUSES.slice()},
  expenses:{name:"Expense Tracker",columns:[{name:"Item",type:"text"},{name:"Amount",type:"money"},{name:"Date",type:"date"},{name:"Status",type:"status"},{name:"Remarks",type:"text"}],statusOptions:["pending","completed","reimbursed"]},
  blank:{name:"",columns:[{name:"Item",type:"text"}],statusOptions:DEFAULT_TABLE_STATUSES.slice()}
};
function applyTableTemplate(templateId,force=false){const template=getTemplateDefinition(templateId);const name=document.getElementById("tableName");if(force||!name.value.trim())name.value=template.name;setTableBuilderColumns(template.columns);document.getElementById("tableStatusOptions").value=(template.statusOptions||DEFAULT_TABLE_STATUSES).join(", ");}
function clearTableForm(){refreshSpaceSelects();document.getElementById("tableEditId").value="";document.getElementById("tableTemplate").value="progress";document.getElementById("tableName").value="";document.getElementById("tableSpace").value=preferredSpace();document.getElementById("tableProject").value="";refreshProjectDatalist();applyTableTemplate("progress",true);document.getElementById("tableSortMode").value="manual";document.getElementById("tableSortDirection").value="asc";refreshTableSortColumnOptions(tableBuilderColumns[0]?.id||"");updateTableSortFields();document.getElementById("tableModalEyebrow").textContent="TRACKER / TABLE";document.getElementById("tableModalTitle").textContent="Create tracker";document.getElementById("saveTableButton").textContent="Create tracker";document.getElementById("deleteTableFromModal").classList.add("hidden");}
function openTableModal(id=""){clearTableForm();const t=state.tables.find(t=>t.id===id);if(t){document.getElementById("tableEditId").value=t.id;document.getElementById("tableTemplate").value="blank";document.getElementById("tableName").value=t.name;document.getElementById("tableSpace").value=t.space;document.getElementById("tableProject").value=t.project||"";setTableBuilderColumns(t.columns);document.getElementById("tableStatusOptions").value=(t.statusOptions||DEFAULT_TABLE_STATUSES).join(", ");document.getElementById("tableSortMode").value=t.sortMode||"manual";refreshTableSortColumnOptions(t.sortColumnId||t.columns[0]?.id||"");document.getElementById("tableSortDirection").value=t.sortDirection||"asc";updateTableSortFields();document.getElementById("tableModalTitle").textContent="Edit tracker";document.getElementById("saveTableButton").textContent="Save tracker";document.getElementById("deleteTableFromModal").classList.remove("hidden");}openModal("tableModal");}

function saveTable(){const id=document.getElementById("tableEditId").value;const old=id?state.tables.find(t=>t.id===id):null;const name=document.getElementById("tableName").value.trim();const parsed=getBuiltTableColumns();if(!name)return showToast("Give the table a name 🌸");if(!parsed.length)return showToast("Add at least one column.");let columns=parsed;if(old){columns=parsed.map(c=>{const match=old.columns.find(x=>x.name.toLowerCase()===c.name.toLowerCase()&&x.type===c.type);return match?{...match,name:c.name}:c;});}const table=normalizeTable({...(old||{}),id:id||createId(),name,space:document.getElementById("tableSpace").value,project:document.getElementById("tableProject").value.trim(),columns,statusOptions:parseStatusOptions(document.getElementById("tableStatusOptions").value),sortMode:document.getElementById("tableSortMode").value,sortColumnId:document.getElementById("tableSortColumn").value||columns[0]?.id||"",sortDirection:document.getElementById("tableSortDirection").value,rows:old?.rows||[],createdAt:old?.createdAt||Date.now()});if(old)state.tables[state.tables.findIndex(t=>t.id===id)]=table;else{state.tables.push(table);state.activeTableId=table.id;}ensureProjectRecord(table.project,table.space);closeModal("tableModal");showToast(old?"Table updated 📋":"Table created 📋");changePage("tables");}
function deleteTable(id){const table=state.tables.find(t=>t.id===id);if(!table||!confirm("Move this table and all its rows to Trash?"))return;const linkedReminders=state.reminders.filter(r=>r.linkedTableId===id);moveToTrash("table",table,{linkedReminders});state.tables=state.tables.filter(t=>t.id!==id);state.reminders=state.reminders.filter(r=>r.linkedTableId!==id);state.activeTableId=state.tables[0]?.id||"";closeModal("tableModal");render();}

function openTableRowModal(tableId,rowId=""){const table=state.tables.find(t=>t.id===tableId);if(!table)return;const row=table.rows.find(r=>r.id===rowId);document.getElementById("tableRowTableId").value=tableId;document.getElementById("tableRowEditId").value=rowId;document.getElementById("tableRowModalTitle").textContent=row?`Edit ${table.name} row`:`Add to ${table.name}`;document.getElementById("deleteTableRowFromModal").classList.toggle("hidden",!row);document.getElementById("tableRowReminder").checked=false;document.getElementById("tableRowFields").innerHTML=table.columns.map(c=>tableFieldHTML(c,row?.values[c.id],table)).join("");openModal("tableRowModal");}
function progressOptions(value){const current=Math.max(0,Math.min(100,Number(value||0)));return Array.from({length:21},(_,i)=>i*5).map(n=>`<option value="${n}" ${n===current?"selected":""}>${n}%</option>`).join("");}
function tableFieldHTML(col,value,table){
  const id=`rowField_${col.id}`;
  if(col.type==="checkbox")return `<label class="check-row"><input id="${id}" data-row-field="${col.id}" data-col-type="checkbox" type="checkbox" ${value?"checked":""}/><span>${escapeHTML(col.name)}</span></label>`;
  if(col.type==="status")return `<div class="form-group"><label>${escapeHTML(col.name)}</label><select id="${id}" data-row-field="${col.id}" data-col-type="status">${(table.statusOptions||DEFAULT_TABLE_STATUSES).map(option=>`<option value="${escapeHTML(option)}" ${String(value||"upcoming").toLowerCase()===String(option).toLowerCase()?"selected":""}>${escapeHTML(option)}</option>`).join("")}</select></div>`;
  if(col.type==="progress")return `<div class="form-group"><label>${escapeHTML(col.name)}</label><select id="${id}" data-row-field="${col.id}" data-col-type="progress">${progressOptions(value)}</select></div>`;
  const inputType=["date","reminder"].includes(col.type)?"date":(["number","money"].includes(col.type)?"number":col.type==="link"?"url":"text");
  return `<div class="form-group"><label>${escapeHTML(col.name)}</label><input id="${id}" data-row-field="${col.id}" data-col-type="${col.type}" type="${inputType}" ${col.type==="money"?'step="0.01"':""} value="${escapeHTML(value??"")}" /></div>`;
}

function saveTableRow(){const table=state.tables.find(t=>t.id===document.getElementById("tableRowTableId").value);if(!table)return;const rowId=document.getElementById("tableRowEditId").value;const old=table.rows.find(r=>r.id===rowId);const values={};document.querySelectorAll("[data-row-field]").forEach(el=>{const type=el.dataset.colType;values[el.dataset.rowField]=type==="checkbox"?el.checked:( ["number","money","progress"].includes(type)?Number(el.value||0):el.value);});const row={id:rowId||createId(),values,createdAt:old?.createdAt||Date.now()};if(old)table.rows[table.rows.findIndex(r=>r.id===rowId)]=row;else table.rows.push(row);if(document.getElementById("tableRowReminder").checked)createReminderFromTableRow(table,row);closeModal("tableRowModal");showToast("Row saved 📋");render();}
function saveInlineTableRow(tableId){const table=state.tables.find(t=>t.id===tableId);if(!table)return;const values={};table.columns.forEach(col=>{const el=document.getElementById(`inline_${tableId}_${col.id}`);if(!el) return; if(col.type==="checkbox") values[col.id]=el.checked; else if(["number","money","progress"].includes(col.type)) values[col.id]=Number(el.value||0); else values[col.id]=el.value;});if(!Object.values(values).some(value=>String(value||"").trim()||value===true||Number(value)>0)) return showToast("Add something to the row first 🌸");table.rows.push({id:createId(),values,createdAt:Date.now()});showToast("Row added 📋");render();}
function moveTableRow(tableId,rowId,direction){const t=state.tables.find(t=>t.id===tableId);if(!t||t.sortMode==="auto")return showToast("Switch this tracker to Manual order first 🌸");const i=t.rows.findIndex(r=>r.id===rowId);if(i<0)return;const target=direction==="up"?i-1:i+1;if(target<0||target>=t.rows.length)return;[t.rows[i],t.rows[target]]=[t.rows[target],t.rows[i]];render();}
function deleteTableRow(tableId,rowId){const t=state.tables.find(t=>t.id===tableId);const row=t?.rows.find(r=>r.id===rowId);if(!t||!row||!confirm("Move this row to Trash?"))return;const linkedReminders=state.reminders.filter(r=>r.linkedTableId===tableId&&r.linkedRowId===rowId);moveToTrash("tableRow",row,{tableId,tableName:t.name,linkedReminders});t.rows=t.rows.filter(r=>r.id!==rowId);state.reminders=state.reminders.filter(r=>!(r.linkedTableId===tableId&&r.linkedRowId===rowId));closeModal("tableRowModal");render();}
function rowTitle(table,row){const col=table.columns.find(c=>["text","tag"].includes(c.type));return String(row.values[col?.id]||`${table.name} row`);}
function rowDate(table,row){const col=table.columns.find(c=>["date","reminder"].includes(c.type));return row.values[col?.id]||"";}
function createReminderFromTableRow(table,row){const title=rowTitle(table,row),date=rowDate(table,row);if(!date)return showToast("This row needs a date column before Hana can remind you.");const existing=state.reminders.find(r=>r.linkedTableId===table.id&&r.linkedRowId===row.id);const rem=normalizeReminder({...(existing||{}),id:existing?.id||createId(),title,space:table.space,date,time:"09:00",repeatType:"none",linkedTableId:table.id,linkedRowId:row.id,completed:false,notified:false,createdAt:existing?.createdAt||Date.now()});if(existing)state.reminders[state.reminders.findIndex(r=>r.id===existing.id)]=rem;else state.reminders.push(rem);showToast("Row reminder created 🔔");}
function createTaskFromTableRow(table,row){const task=normalizeTask({title:rowTitle(table,row),space:table.space,priority:"medium",status:"todo",dueDate:rowDate(table,row),project:table.name,tags:["from-table"],notes:`Created from ${table.name}`,createdAt:Date.now()});state.tasks.push(task);showToast("Table row became a task 🌱");render();}
function inlineFieldHTML(table,col){
  const id=`inline_${table.id}_${col.id}`;
  if(col.type==="checkbox")return `<label class="inline-table-checkbox"><input id="${id}" type="checkbox" /><span>${escapeHTML(col.name)}</span></label>`;
  if(col.type==="status")return `<div class="form-group compact"><label>${escapeHTML(col.name)}</label><select id="${id}">${(table.statusOptions||DEFAULT_TABLE_STATUSES).map(o=>`<option value="${escapeHTML(o)}">${escapeHTML(o)}</option>`).join("")}</select></div>`;
  if(col.type==="progress")return `<div class="form-group compact"><label>${escapeHTML(col.name)}</label><select id="${id}">${progressOptions(0)}</select></div>`;
  const inputType=["date","reminder"].includes(col.type)?"date":(["number","money"].includes(col.type)?"number":col.type==="link"?"url":"text");
  return `<div class="form-group compact"><label>${escapeHTML(col.name)}</label><input id="${id}" type="${inputType}" ${col.type==="money"?'step="0.01"':""} placeholder="${escapeHTML(col.name)}" /></div>`;
}
function renderInlineTableRow(table){return `<div id="quickRow_${table.id}" class="inline-table-row-card hidden"><div class="inline-table-row-head"><strong>Quick add row</strong><small>Type directly here when you want a fast entry.</small></div><div class="inline-table-row-grid">${table.columns.map(col=>inlineFieldHTML(table,col)).join("")}</div><div class="inline-table-row-actions"><button class="secondary-button" data-add-row="${table.id}">Open full form</button><button class="primary-button" data-save-inline-row="${table.id}">Save row</button></div></div>`;}
function renderBulkPreviewCell(col,value,tableId,rowId){
  if(col.type==="checkbox")return `<span class="bulk-checkbox-preview" aria-label="${value?"Checked":"Unchecked"}">${value?"✓":"—"}</span>`;
  return renderTableCell(col,value,tableId,rowId);
}
function renderSingleTable(table){
  const rows=getSortedTableRows(table),bulk=ensureTableBulkState(table),bulkActive=bulk.active;
  const selectedRows=selectedBulkRows(table),selectedCols=selectedBulkCols(table);
  const normalActions=`<div class="table-head-actions"><button class="primary-button" data-add-row="${table.id}">+ Add row</button><button class="secondary-button" data-toggle-quick-row="${table.id}">⚡ Quick add row</button><button class="secondary-button" data-toggle-bulk-table="${table.id}">☑ Bulk edit</button><button class="secondary-button" data-edit-table="${table.id}">Edit tracker</button><button class="danger-button tracker-delete-button" data-delete-table="${table.id}">Delete tracker</button></div>`;
  const bulkActions=`<div class="table-bulk-bar"><div><strong data-bulk-summary="${table.id}">${selectedRows.length} row${selectedRows.length===1?"":"s"} · ${selectedCols.length} column${selectedCols.length===1?"":"s"}</strong><small>Select rows and columns, then edit or copy them together.</small></div><div class="table-bulk-actions"><button class="primary-button" data-bulk-edit="${table.id}" data-bulk-action-for="${table.id}" ${!selectedRows.length||!selectedCols.length?"disabled":""}>✎ Edit selected</button><button class="secondary-button" data-bulk-copy="${table.id}" data-bulk-action-for="${table.id}" ${!selectedRows.length||!selectedCols.length?"disabled":""}>Copy cells</button><button class="secondary-button" data-bulk-paste="${table.id}" data-bulk-action-for="${table.id}" ${!selectedRows.length||!selectedCols.length?"disabled":""}>Paste cells</button><button class="secondary-button" data-toggle-bulk-table="${table.id}">Done</button></div></div>`;
  const head=bulkActive?`<tr><th class="bulk-select-head"><label class="bulk-check-label" title="Select all rows"><input type="checkbox" data-bulk-select-all-rows="${table.id}" ${rows.length&&selectedRows.length===rows.length?"checked":""}/><span>Rows</span></label></th>${table.columns.map(c=>`<th class="bulk-column-head ${bulk.selectedCols.has(c.id)?"bulk-selected":""}" data-bulk-col-head="${table.id}" data-col-id="${c.id}"><label class="bulk-check-label"><input type="checkbox" data-bulk-col-toggle="${c.id}" data-table-id="${table.id}" ${bulk.selectedCols.has(c.id)?"checked":""}/><span>${escapeHTML(c.name)}</span></label></th>`).join("")}</tr>`:`<tr>${table.columns.map(c=>`<th>${escapeHTML(c.name)}</th>`).join("")}</tr>`;
  const body=rows.length?rows.map(row=>bulkActive?`<tr class="bulk-table-row ${bulk.selectedRows.has(row.id)?"bulk-selected":""}" data-bulk-row="${table.id}" data-row-id="${row.id}"><td class="bulk-row-check"><input type="checkbox" data-bulk-row-toggle="${row.id}" data-table-id="${table.id}" ${bulk.selectedRows.has(row.id)?"checked":""} aria-label="Select row" /></td>${table.columns.map(c=>`<td>${renderBulkPreviewCell(c,row.values[c.id],table.id,row.id)}</td>`).join("")}</tr>`:`<tr class="gesture-table-row" data-gesture-row="${row.id}" data-table-id="${table.id}"><td class="swipe-edge edit-edge">Edit</td>${table.columns.map(c=>`<td>${renderTableCell(c,row.values[c.id],table.id,row.id)}</td>`).join("")}<td class="swipe-edge delete-edge">Delete</td></tr>`).join(""):`<tr><td colspan="${table.columns.length+(bulkActive?1:0)}">No rows yet.</td></tr>`;
  const bulkSelectAll=bulkActive?`<div class="bulk-selection-shortcuts"><label><input type="checkbox" data-bulk-select-all-cols="${table.id}" ${selectedCols.length===table.columns.length?"checked":""}/> All columns</label><span>Tip: select one column + all rows to copy a whole column.</span></div>`:"";
  return `${bulkActive?bulkActions:normalActions}${bulkActive?"":renderInlineTableRow(table)}${bulkSelectAll}<div class="table-wrapper ${bulkActive?"bulk-table-wrapper":""}"><table class="smart-table ${bulkActive?"smart-table-bulk":""}"><thead>${head}</thead><tbody>${body}</tbody></table></div><p class="gesture-hint">${bulkActive?"Bulk mode: choose rows and columns. Edit selected saves several rows at once; Copy/Paste uses spreadsheet-style tab-separated cells.":"Tip: double-tap to edit · long-press for actions · swipe right to edit · swipe left to delete."}</p>`;
}
function renderTableCell(col,value,tableId,rowId){if(col.type==="checkbox")return `<input class="cell-checkbox" type="checkbox" ${value?"checked":""} data-table-check="${tableId}" data-row-id="${rowId}" data-col-id="${col.id}" />`;if(col.type==="money")return formatCurrency(value);if(col.type==="date")return value?formatDate(value):"—";if(col.type==="link")return value?`<a href="${escapeHTML(value)}" target="_blank" rel="noopener">Open</a>`:"—";if(col.type==="status")return `<span class="badge badge-${String(value||"upcoming").toLowerCase().replace(/\s+/g,"-")}">${escapeHTML(value||"upcoming")}</span>`;if(col.type==="progress"){const pct=Math.max(0,Math.min(100,Number(value||0)));return `<div class="table-progress"><div class="table-progress-bar"><span style="width:${pct}%"></span></div><strong>${pct}%</strong></div>`;}return escapeHTML(value??"")||"—";}


/* ================= HANA v1.7 · CALENDAR / PROJECTS / GARDEN ================= */

function isoFromDate(date){ return localDateISO(date); }
function parseISODate(value){ return new Date(`${value || todayISO()}T12:00:00`); }
function startOfWeekISO(value=todayISO()) { const d=parseISODate(value); const day=(d.getDay()+6)%7; d.setDate(d.getDate()-day); return isoFromDate(d); }
function addMonthsISO(value, amount){ const d=parseISODate(value); d.setDate(1); d.setMonth(d.getMonth()+amount); return isoFromDate(d); }
function monthTitle(value){ return parseISODate(value).toLocaleDateString(undefined,{month:"long",year:"numeric"}); }
function dayTitle(value){ return parseISODate(value).toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric",year:"numeric"}); }
function shortDay(value){ return parseISODate(value).toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"}); }
function minutesFromTime(time="00:00"){ const [h,m]=String(time).split(":").map(Number); return (h||0)*60+(m||0); }
function timeFromMinutes(total){ const safe=Math.max(0,Math.min(1439,Number(total)||0)); return `${String(Math.floor(safe/60)).padStart(2,"0")}:${String(safe%60).padStart(2,"0")}`; }
function addMinutesToTime(time, minutes){ return timeFromMinutes(minutesFromTime(time)+Number(minutes||0)); }

function eventOccursOn(event,date){
  if(!event?.date||date<event.date)return false;
  if(event.repeatType==="none")return date===event.date;
  const start=parseISODate(event.date), target=parseISODate(date), diff=Math.round((target-start)/86400000);
  if(event.repeatType==="daily")return diff>=0;
  if(event.repeatType==="weekly")return diff>=0&&diff%7===0;
  if(event.repeatType==="monthly"){const months=(target.getFullYear()-start.getFullYear())*12+(target.getMonth()-start.getMonth());return months>=0&&addMonthsClamped(event.date,months)===date;}
  if(event.repeatType==="yearly"){const years=target.getFullYear()-start.getFullYear();return years>=0&&addYearsClamped(event.date,years)===date;}
  return false;
}
function eventsForDate(date){ return filterByMode(state.events,{respectFirewall:false}).filter(e=>eventOccursOn(e,date)).sort((a,b)=>a.startTime.localeCompare(b.startTime)); }
function tasksForCalendarDate(date){ return filterByMode(state.tasks,{respectFirewall:false}).filter(t=>!t.completed&&(t.scheduledDate===date||(!t.scheduledDate&&t.dueDate===date))).sort((a,b)=>(a.scheduledStart||a.dueTime||"23:59").localeCompare(b.scheduledStart||b.dueTime||"23:59")); }

function birthdayLabels() {
  const labels = Array.isArray(state.settings.birthdayLabels) ? state.settings.birthdayLabels : ["Me", "Partner", "Mom", "Dad", "Other"];
  return labels.length ? labels : ["Me", "Partner", "Mom", "Dad", "Other"];
}
function birthdayPersonOptionsHTML(selected="") {
  return birthdayLabels().map(label => `<option value="${escapeHTML(label)}" ${label===selected?"selected":""}>${escapeHTML(label)}</option>`).join("");
}
function updateBirthdayOtherField() {
  const select=document.getElementById("birthdayPerson"), wrap=document.getElementById("birthdayOtherWrap");
  if(!select||!wrap)return;
  wrap.classList.toggle("hidden", select.value.toLowerCase()!=="other");
}
function toggleBirthdayHelper(forceOpen=null) {
  const helper=document.getElementById("birthdayHelper"); if(!helper)return;
  const open=forceOpen===null?helper.classList.contains("hidden"):Boolean(forceOpen);
  helper.classList.toggle("hidden",!open);
  if(open){const select=document.getElementById("birthdayPerson"); if(select){select.innerHTML=birthdayPersonOptionsHTML(select.value||birthdayLabels()[0]);}updateBirthdayOtherField();}
}
function birthdayPresetTitle() {
  const select=document.getElementById("birthdayPerson");
  if(!select)return "Birthday 🎂";
  let label=select.value||birthdayLabels()[0]||"Other";
  if(label.toLowerCase()==="other") label=document.getElementById("birthdayOtherName")?.value.trim()||"";
  if(!label)return "Birthday 🎂";
  if(label.toLowerCase()==="me")return "My Birthday 🎂";
  if(label.toLowerCase()==="birthday")return "Birthday 🎂";
  return `${label}'s Birthday 🎂`;
}
function applyBirthdayPreset(showMessage=true) {
  const titleInput=document.getElementById("eventTitle");
  if(titleInput)titleInput.value=birthdayPresetTitle();
  document.getElementById("eventRepeat").value="yearly";
  document.getElementById("eventStart").value=document.getElementById("eventStart").value||"09:00";
  document.getElementById("eventEnd").value=document.getElementById("eventEnd").value||"10:00";
  if(showMessage)showToast("Birthday preset applied 🎂");
}
function syncBirthdayPresetFromPerson() {
  updateBirthdayOtherField();
  const helper=document.getElementById("birthdayHelper");
  if(helper && !helper.classList.contains("hidden")) applyBirthdayPreset(false);
}


function openEventModal(eventId="", presets={}){
  refreshSpaceSelects(); const old=state.events.find(e=>e.id===eventId);
  document.getElementById("eventEditId").value=old?.id||"";
  document.getElementById("eventTitle").value=old?.title||presets.title||"";
  document.getElementById("eventSpace").value=old?.space||presets.space||preferredSpace();
  document.getElementById("eventDate").value=old?.date||presets.date||state.calendarCursor||todayISO();
  document.getElementById("eventStart").value=old?.startTime||presets.startTime||"09:00";
  document.getElementById("eventEnd").value=old?.endTime||presets.endTime||addMinutesToTime(presets.startTime||"09:00",60);
  document.getElementById("eventLocation").value=old?.location||"";
  document.getElementById("eventNotes").value=old?.notes||"";
  document.getElementById("eventRepeat").value=old?.repeatType||"none";
  document.getElementById("eventReminder").checked=Boolean(old?.reminderEnabled);
  const birthdaySelect=document.getElementById("birthdayPerson");
  if(birthdaySelect) birthdaySelect.innerHTML=birthdayPersonOptionsHTML(presets.birthdayPerson||birthdayLabels()[0]);
  document.getElementById("birthdayOtherName").value=presets.birthdayOtherName||"";
  toggleBirthdayHelper(Boolean(presets.birthday));
  if(presets.birthday) applyBirthdayPreset();
  document.getElementById("eventModalTitle").textContent=old?"Edit event":"Add event";
  document.getElementById("deleteEventButton").classList.toggle("hidden",!old);
  openModal("eventModal"); setTimeout(()=>document.getElementById("eventTitle")?.focus(),60);
}
function saveEvent(){
  const id=document.getElementById("eventEditId").value, old=state.events.find(e=>e.id===id);
  const title=document.getElementById("eventTitle").value.trim(); if(!title)return showToast("Give the event a name 🌸");
  const start=document.getElementById("eventStart").value||"09:00", end=document.getElementById("eventEnd").value||addMinutesToTime(start,60);
  if(minutesFromTime(end)<=minutesFromTime(start))return showToast("End time needs to be after start time.");
  const item=normalizeEvent({...(old||{}),id:id||createId(),title,space:document.getElementById("eventSpace").value,date:document.getElementById("eventDate").value,startTime:start,endTime:end,location:document.getElementById("eventLocation").value.trim(),notes:document.getElementById("eventNotes").value.trim(),repeatType:document.getElementById("eventRepeat").value,reminderEnabled:document.getElementById("eventReminder").checked,createdAt:old?.createdAt||Date.now(),updatedAt:Date.now()});
  if(old)state.events[state.events.findIndex(e=>e.id===id)]=item;else state.events.push(item);
  syncEventReminder(item); closeModal("eventModal"); showToast(old?"Event updated 📅":"Event added 📅"); render();
}
function syncEventReminder(event){
  const existing=state.reminders.find(r=>r.linkedEventId===event.id);
  if(!event.reminderEnabled){ if(existing)state.reminders=state.reminders.filter(r=>r.id!==existing.id); return; }
  const r=normalizeReminder({...(existing||{}),id:existing?.id||createId(),title:event.title,space:event.space,date:event.date,time:event.startTime,repeatType:event.repeatType,completed:false,notified:false,linkedEventId:event.id,createdAt:existing?.createdAt||Date.now(),updatedAt:Date.now()});
  if(existing)state.reminders[state.reminders.findIndex(x=>x.id===existing.id)]=r;else state.reminders.push(r);
}
function deleteEvent(id){ const e=state.events.find(x=>x.id===id);if(!e||!confirm("Delete this event?"))return;state.events=state.events.filter(x=>x.id!==id);state.reminders=state.reminders.filter(r=>r.linkedEventId!==id);closeModal("eventModal");showToast("Event removed");render(); }

function calendarCursorMove(direction){
  if(state.calendarView==="month")state.calendarCursor=addMonthsISO(state.calendarCursor,direction);
  else state.calendarCursor=addDaysISO(state.calendarCursor,direction*(state.calendarView==="week"?7:1));
  render();
}
function calendarItemHTML(date){
  const events=eventsForDate(date), tasks=tasksForCalendarDate(date); const all=[...events.map(e=>({kind:"event",id:e.id,title:e.title,time:e.startTime})),...tasks.map(t=>({kind:"task",id:t.id,title:t.title,time:t.scheduledStart||t.dueTime||""}))].sort((a,b)=>(a.time||"99").localeCompare(b.time||"99"));
  return all.slice(0,3).map(i=>`<button class="calendar-mini-item ${i.kind}" ${i.kind==="event"?`data-edit-event="${i.id}"`:`data-edit-task="${i.id}"`}><span>${i.kind==="event"?"●":"✓"}</span>${i.time?`<b>${formatTime(i.time)}</b>`:""}<em>${escapeHTML(i.title)}</em></button>`).join("")+(all.length>3?`<small class="calendar-more">+${all.length-3} more</small>`:"");
}
function renderCalendarMonth(){
  const cursor=parseISODate(state.calendarCursor);const y=cursor.getFullYear(),m=cursor.getMonth();const first=new Date(y,m,1,12);const offset=(first.getDay()+6)%7;const start=new Date(y,m,1-offset,12);let cells="";
  for(let i=0;i<42;i++){const d=new Date(start);d.setDate(start.getDate()+i);const iso=isoFromDate(d),inMonth=d.getMonth()===m;cells+=`<div class="calendar-day ${inMonth?"":"outside"} ${iso===todayISO()?"today":""}"><button class="calendar-day-number" data-calendar-day="${iso}">${d.getDate()}</button><div class="calendar-day-items">${calendarItemHTML(iso)}</div><button class="calendar-day-add" data-add-event-date="${iso}" aria-label="Add event">+</button></div>`;}
  return `<div class="calendar-weekdays">${["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(x=>`<span>${x}</span>`).join("")}</div><div class="calendar-month-grid">${cells}</div>`;
}
function renderCalendarWeek(){
  const start=startOfWeekISO(state.calendarCursor);let days="";const unscheduled=filterByMode(state.tasks,{respectFirewall:false}).filter(t=>!t.completed&&!t.scheduledDate).sort(taskSort).slice(0,8);
  for(let i=0;i<7;i++){const date=addDaysISO(start,i),ev=eventsForDate(date),ts=tasksForCalendarDate(date);days+=`<section class="calendar-week-day ${date===todayISO()?"today":""}"><button class="calendar-week-heading" data-calendar-day="${date}"><strong>${shortDay(date)}</strong><small>${ev.length+ts.length} planned</small></button>${[...ev.map(e=>({kind:"event",obj:e,time:e.startTime})),...ts.map(t=>({kind:"task",obj:t,time:t.scheduledStart||t.dueTime||"23:59"}))].sort((a,b)=>a.time.localeCompare(b.time)).map(x=>x.kind==="event"?`<button class="week-plan event" data-edit-event="${x.obj.id}"><b>${formatTime(x.obj.startTime)}</b><span>${escapeHTML(x.obj.title)}</span></button>`:`<button class="week-plan task" draggable="true" data-calendar-drag-task="${x.obj.id}" data-edit-task="${x.obj.id}"><b>${x.obj.scheduledStart?formatTime(x.obj.scheduledStart):"Anytime"}</b><span>${escapeHTML(x.obj.title)}</span></button>`).join("")||`<div class="week-empty">Open space</div>`}<div class="week-drop-row">${["09:00","13:00","17:00"].map(time=>`<div class="week-drop-slot" data-time-slot data-date="${date}" data-time="${time}">${formatTime(time)}</div>`).join("")}</div><button class="calendar-inline-add" data-add-event-date="${date}">+ Event</button></section>`;}
  return `${unscheduled.length?`<div class="week-unscheduled-tray"><div><strong>Drag into the week</strong><small>Or tap Plan on iPhone</small></div>${unscheduled.map(t=>`<div class="week-unscheduled-task" draggable="true" data-calendar-drag-task="${t.id}"><span>${escapeHTML(t.title)}</span><button data-plan-task="${t.id}" data-plan-date="${state.calendarCursor}">Plan</button></div>`).join("")}</div>`:""}<div class="calendar-week-scroll">${days}</div>`;
}
function daySlotHTML(date,hour){
  const start=`${String(hour).padStart(2,"0")}:00`;const ev=eventsForDate(date).filter(e=>Number(e.startTime.slice(0,2))===hour);const tasks=tasksForCalendarDate(date).filter(t=>t.scheduledDate===date&&Number((t.scheduledStart||"00:00").slice(0,2))===hour);
  return `<div class="time-slot" data-time-slot data-date="${date}" data-time="${start}"><div class="time-slot-label">${formatTime(start)}</div><div class="time-slot-content">${ev.map(e=>`<button class="time-block event" data-edit-event="${e.id}"><strong>${escapeHTML(e.title)}</strong><small>${formatTime(e.startTime)}–${formatTime(e.endTime)}${e.location?` · ${escapeHTML(e.location)}`:""}</small></button>`).join("")}${tasks.map(t=>`<button class="time-block task" draggable="true" data-calendar-drag-task="${t.id}" data-edit-task="${t.id}"><strong>${escapeHTML(t.title)}</strong><small>${formatTime(t.scheduledStart)} · ${formatDuration(taskPlanningMinutes(t))}</small></button>`).join("")}<button class="slot-add" data-add-event-slot data-date="${date}" data-time="${start}">+</button></div></div>`;
}
function renderCalendarDay(){
  const date=state.calendarCursor;const due=filterByMode(state.tasks,{respectFirewall:false}).filter(t=>!t.completed&&!t.scheduledDate&&(t.dueDate===date||!t.dueDate)).sort(taskSort).slice(0,10);
  return `<div class="day-planner"><div class="day-unscheduled"><div class="section-header"><h2>Unscheduled</h2><button data-new-task-for-date="${date}">+ Task</button></div>${due.length?due.map(t=>`<div class="unscheduled-task" draggable="true" data-calendar-drag-task="${t.id}"><span><strong>${escapeHTML(t.title)}</strong><small>${formatDuration(taskPlanningMinutes(t))} · ${energyLabel(t.energy)}</small></span><button data-plan-task="${t.id}" data-plan-date="${date}">Plan</button></div>`).join(""):`<div class="day-empty">Nothing waiting for a time 🌿</div>`}</div><div class="day-timeline">${Array.from({length:15},(_,i)=>daySlotHTML(date,i+7)).join("")}</div></div>`;
}
function renderCalendar(){
  const c=document.getElementById("pageContent");const title=state.calendarView==="month"?monthTitle(state.calendarCursor):(state.calendarView==="week"?`${shortDay(startOfWeekISO(state.calendarCursor))} – ${shortDay(addDaysISO(startOfWeekISO(state.calendarCursor),6))}`:dayTitle(state.calendarCursor));
  c.innerHTML=`<div class="page-heading calendar-page-heading"><div><p class="eyebrow">PLAN TIME, NOT JUST TASKS</p><h1>Calendar</h1><p>Events and task blocks live together without turning events into chores.</p></div><div class="calendar-heading-actions">${state.calendarView==="day"?`<button class="secondary-button" data-auto-plan-day>✨ Auto-plan bouquet</button>`:""}<button class="primary-button" data-new-event>+ Event</button></div></div><div class="calendar-toolbar"><div class="segmented-control"><button class="${state.calendarView==="month"?"active":""}" data-calendar-view="month">Month</button><button class="${state.calendarView==="week"?"active":""}" data-calendar-view="week">Week</button><button class="${state.calendarView==="day"?"active":""}" data-calendar-view="day">Day</button></div><div class="calendar-nav"><button data-calendar-prev>‹</button><button data-calendar-today>Today</button><strong>${escapeHTML(title)}</strong><button data-calendar-next>›</button></div></div>${state.calendarView==="month"?renderCalendarMonth():state.calendarView==="week"?renderCalendarWeek():renderCalendarDay()}`;
}

function openScheduleTaskModal(taskId,date=state.calendarCursor,time="09:00"){
  const task=state.tasks.find(t=>t.id===taskId);if(!task)return;document.getElementById("scheduleTaskId").value=task.id;document.getElementById("scheduleTaskTitle").textContent=task.title;document.getElementById("scheduleTaskDate").value=task.scheduledDate||date||todayISO();document.getElementById("scheduleTaskTime").value=task.scheduledStart||time||"09:00";openModal("scheduleTaskModal");
}
function saveTaskSchedule(){const task=state.tasks.find(t=>t.id===document.getElementById("scheduleTaskId").value);if(!task)return;task.scheduledDate=document.getElementById("scheduleTaskDate").value;task.scheduledStart=document.getElementById("scheduleTaskTime").value;task.updatedAt=Date.now();closeModal("scheduleTaskModal");showToast("Task placed on your day 🌷");render();}
function scheduleTaskAt(taskId,date,time){const task=state.tasks.find(t=>t.id===taskId);if(!task)return;task.scheduledDate=date;task.scheduledStart=time;task.updatedAt=Date.now();state.calendarDragTaskId="";showToast(`${task.title} · ${formatTime(time)} 🌷`);render();}
function dayOccupiedRanges(date){const ranges=[];eventsForDate(date).forEach(e=>ranges.push([minutesFromTime(e.startTime),minutesFromTime(e.endTime)]));state.tasks.filter(t=>!t.completed&&t.scheduledDate===date&&t.scheduledStart).forEach(t=>{const start=minutesFromTime(t.scheduledStart);ranges.push([start,start+taskPlanningMinutes(t)]);});return ranges.sort((a,b)=>a[0]-b[0]);}
function rangeIsFree(start,end,ranges){return !ranges.some(([a,b])=>start<b&&end>a);}
function autoPlanBouquet(date=state.calendarCursor){const candidates=focusTasksVisible().filter(t=>!t.scheduledDate).sort((a,b)=>recommendationScore(b)-recommendationScore(a));if(!candidates.length)return showToast("Your bouquet is already placed or empty 🌿");const ranges=dayOccupiedRanges(date);let placed=0;for(const task of candidates){const duration=Math.max(15,Math.min(180,taskPlanningMinutes(task)));let found=null;for(let start=9*60;start+duration<=18*60;start+=15){if(rangeIsFree(start,start+duration,ranges)){found=start;break;}}if(found===null)continue;task.scheduledDate=date;task.scheduledStart=timeFromMinutes(found);task.updatedAt=Date.now();ranges.push([found,found+duration]);ranges.sort((a,b)=>a[0]-b[0]);placed++;}showToast(placed?`Hana placed ${placed} bouquet task${placed===1?"":"s"} 🌷`:"No open time blocks fit the bouquet today.");render();}

function refreshProjectDatalist(){const list=document.getElementById("hanaProjectOptions");if(list)list.innerHTML=state.projects.filter(p=>p.status!=="done").map(p=>`<option value="${escapeHTML(p.name)}"></option>`).join("");}
function projectByName(name){const key=String(name||"").trim().toLowerCase();return state.projects.find(p=>p.name.toLowerCase()===key);}
function ensureProjectRecord(name,space=preferredSpace()){const clean=String(name||"").trim();if(!clean)return null;let p=projectByName(clean);if(!p){p=normalizeProject({name:clean,space,emoji:"🌷",createdAt:Date.now(),updatedAt:Date.now()});state.projects.push(p);}return p;}
function refreshTaskMilestoneOptions(projectName=document.getElementById("taskProject")?.value||"",selected=document.getElementById("taskMilestone")?.value||""){
  const select=document.getElementById("taskMilestone");if(!select)return;const p=projectByName(projectName);select.innerHTML=`<option value="">No milestone</option>${p?p.milestones.map(m=>`<option value="${m.id}" ${m.id===selected?"selected":""}>${m.completed?"✓ ":""}${escapeHTML(m.title)}</option>`).join(""):""}`;select.disabled=!p||!p.milestones.length;
}
function projectTasks(project){return state.tasks.filter(t=>t.project.trim().toLowerCase()===project.name.toLowerCase());}
function projectProgress(project){const ts=projectTasks(project);return ts.length?Math.round(ts.filter(t=>t.completed).length/ts.length*100):(project.status==="done"?100:0);}
function milestoneProgress(project,m){const ts=projectTasks(project).filter(t=>t.milestoneId===m.id);return ts.length?Math.round(ts.filter(t=>t.completed).length/ts.length*100):(m.completed?100:0);}
function openProjectModal(projectId=""){
  refreshSpaceSelects();const p=state.projects.find(p=>p.id===projectId);document.getElementById("projectEditId").value=p?.id||"";document.getElementById("projectEmoji").value=p?.emoji||"🌷";document.getElementById("projectName").value=p?.name||"";document.getElementById("projectSpace").value=p?.space||preferredSpace();document.getElementById("projectDue").value=p?.dueDate||"";document.getElementById("projectStatus").value=p?.status||"active";document.getElementById("projectDescription").value=p?.description||"";document.getElementById("projectModalTitle").textContent=p?"Edit project":"Create project";document.getElementById("deleteProjectButton").classList.toggle("hidden",!p);openModal("projectModal");
}
function saveProject(){
  const id=document.getElementById("projectEditId").value,old=state.projects.find(p=>p.id===id),name=document.getElementById("projectName").value.trim();if(!name)return showToast("Give the project a name 🌷");if(state.projects.some(p=>p.id!==id&&p.name.toLowerCase()===name.toLowerCase()))return showToast("A project already uses that name.");
  const p=normalizeProject({...(old||{}),id:id||createId(),emoji:document.getElementById("projectEmoji").value||"🌷",name,space:document.getElementById("projectSpace").value,dueDate:document.getElementById("projectDue").value,status:document.getElementById("projectStatus").value,description:document.getElementById("projectDescription").value.trim(),milestones:old?.milestones||[],createdAt:old?.createdAt||Date.now(),updatedAt:Date.now()});
  if(old&&old.name!==name){state.tasks.forEach(t=>{if(t.project===old.name)t.project=name});state.notes.forEach(n=>{if(n.project===old.name)n.project=name});state.tables.forEach(t=>{if(t.project===old.name)t.project=name});}
  if(old)state.projects[state.projects.findIndex(x=>x.id===id)]=p;else state.projects.push(p);state.activeProjectId=p.id;closeModal("projectModal");showToast(old?"Project updated 🌷":"Project planted 🌱");render();
}
function deleteProject(id){const p=state.projects.find(p=>p.id===id);if(!p||!confirm(`Remove project “${p.name}”? Its tasks, notes and trackers will stay, but their Project field will be cleared.`))return;state.tasks.forEach(t=>{if(t.project===p.name){t.project="";t.milestoneId="";}});state.notes.forEach(n=>{if(n.project===p.name)n.project=""});state.tables.forEach(t=>{if(t.project===p.name)t.project=""});state.projects=state.projects.filter(x=>x.id!==id);state.activeProjectId=state.projects[0]?.id||"";closeModal("projectModal");render();}
function openMilestoneModal(projectId,milestoneId="") {const p=state.projects.find(p=>p.id===projectId);if(!p)return;const m=p.milestones.find(m=>m.id===milestoneId);document.getElementById("milestoneProjectId").value=p.id;document.getElementById("milestoneEditId").value=m?.id||"";document.getElementById("milestoneTitle").value=m?.title||"";document.getElementById("milestoneDue").value=m?.dueDate||"";document.getElementById("milestoneCompleted").checked=Boolean(m?.completed);document.getElementById("deleteMilestoneButton").classList.toggle("hidden",!m);openModal("milestoneModal");}
function saveMilestone(){const p=state.projects.find(p=>p.id===document.getElementById("milestoneProjectId").value);if(!p)return;const id=document.getElementById("milestoneEditId").value,title=document.getElementById("milestoneTitle").value.trim();if(!title)return showToast("Give the milestone a name 🌷");const old=p.milestones.find(m=>m.id===id),m={id:id||createId(),title,dueDate:document.getElementById("milestoneDue").value,completed:document.getElementById("milestoneCompleted").checked};if(old)p.milestones[p.milestones.findIndex(x=>x.id===id)]=m;else p.milestones.push(m);p.updatedAt=Date.now();closeModal("milestoneModal");render();}
function deleteMilestone(projectId,milestoneId){const p=state.projects.find(p=>p.id===projectId);if(!p||!confirm("Delete this milestone? Tasks will stay in the project."))return;p.milestones=p.milestones.filter(m=>m.id!==milestoneId);state.tasks.forEach(t=>{if(t.milestoneId===milestoneId)t.milestoneId=""});closeModal("milestoneModal");render();}

function renderProjectDetail(p){
  const ts=projectTasks(p),open=ts.filter(t=>!t.completed),waiting=open.filter(t=>t.status==="waiting"),notes=state.notes.filter(n=>n.project===p.name),tables=state.tables.filter(t=>t.project===p.name),progress=projectProgress(p),links=ts.filter(t=>t.link),activity=[...ts].sort((a,b)=>(b.updatedAt||b.createdAt)-(a.updatedAt||a.createdAt)).slice(0,8);
  return `<article class="project-detail"><div class="project-hero"><div><span class="project-emoji">${escapeHTML(p.emoji)}</span><span class="badge ${modeBadge(p.space)}">${modeLabel(p.space)}</span><h2>${escapeHTML(p.name)}</h2><p>${escapeHTML(p.description||"A place for everything this project is carrying.")}</p>${p.dueDate?`<small>📅 ${formatFullDate(p.dueDate)}</small>`:""}</div><button class="secondary-button" data-edit-project="${p.id}">Edit</button></div><div class="project-progress"><div><strong>${progress}%</strong><span>${ts.filter(t=>t.completed).length}/${ts.length} tasks complete</span></div><div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div></div><section class="project-section"><div class="section-header"><h3>Milestones</h3><button data-new-milestone="${p.id}">+ Add</button></div>${p.milestones.length?p.milestones.map(m=>{const pct=milestoneProgress(p,m);return `<button class="milestone-card" data-edit-milestone="${m.id}" data-project-id="${p.id}"><span>${pct===100?"🌸":"🌷"}</span><span><strong>${escapeHTML(m.title)}</strong><small>${m.dueDate?formatDate(m.dueDate)+" · ":""}${pct}% complete</small><i><b style="width:${pct}%"></b></i></span></button>`}).join(""):`<div class="project-empty">Add milestones when the project has meaningful stages.</div>`}</section><div class="project-columns"><section class="project-section"><div class="section-header"><h3>Next</h3><button data-new-project-task="${escapeHTML(p.name)}">+ Task</button></div>${open.filter(t=>t.status!=="waiting").slice(0,6).map(taskCard).join("")||`<div class="project-empty">Nothing next 🌿</div>`}</section><section class="project-section"><div class="section-header"><h3>Waiting</h3><span>${waiting.length}</span></div>${waiting.slice(0,5).map(t=>`<button class="project-link-row" data-edit-task="${t.id}"><span>⏳</span><span><strong>${escapeHTML(t.title)}</strong><small>${escapeHTML(t.waitingOn||"Waiting")}</small></span></button>`).join("")||`<div class="project-empty">Nothing waiting.</div>`}</section></div><div class="project-columns"><section class="project-section"><div class="section-header"><h3>Notes</h3><button data-new-project-note="${escapeHTML(p.name)}">+ Note</button></div>${notes.slice(0,5).map(n=>`<button class="project-link-row" data-edit-note="${n.id}"><span>📝</span><span><strong>${escapeHTML(n.title)}</strong><small>${escapeHTML(n.content).slice(0,80)}</small></span></button>`).join("")||`<div class="project-empty">No linked notes.</div>`}</section><section class="project-section"><div class="section-header"><h3>Trackers</h3><button data-new-project-table="${escapeHTML(p.name)}">+ Tracker</button></div>${tables.map(t=>`<button class="project-link-row" data-open-project-table="${t.id}"><span>📒</span><span><strong>${escapeHTML(t.name)}</strong><small>${t.rows.length} rows</small></span></button>`).join("")||`<div class="project-empty">No linked trackers.</div>`}</section></div><div class="project-columns"><section class="project-section"><div class="section-header"><h3>Links</h3><span>${links.length}</span></div>${links.slice(0,6).map(t=>`<a class="project-link-row project-external-link" href="${escapeHTML(t.link)}" target="_blank" rel="noopener"><span>🔗</span><span><strong>${escapeHTML(t.title)}</strong><small>${escapeHTML(t.link).slice(0,55)}</small></span></a>`).join("")||`<div class="project-empty">Task links will collect here.</div>`}</section><section class="project-section"><div class="section-header"><h3>Recent activity</h3><span>${activity.length}</span></div>${activity.map(t=>`<button class="project-link-row" data-edit-task="${t.id}"><span>${t.completed?"🌸":t.status==="waiting"?"⏳":"🌱"}</span><span><strong>${escapeHTML(t.title)}</strong><small>${t.completed?`Completed ${formatDate(t.completedDate)}`:t.status==="waiting"?`Waiting · ${escapeHTML(t.waitingOn||"dependency")}`:`Updated ${new Date(t.updatedAt||t.createdAt).toLocaleDateString()}`}</small></span></button>`).join("")||`<div class="project-empty">Project activity will gather here.</div>`}</section></div></article>`;
}
function renderProjects(){const c=document.getElementById("pageContent");const projects=filterByMode(state.projects,{respectFirewall:false});if(!projects.some(p=>p.id===state.activeProjectId))state.activeProjectId=projects[0]?.id||"";const active=projects.find(p=>p.id===state.activeProjectId);c.innerHTML=`<div class="page-heading projects-heading"><div><p class="eyebrow">FROM TASK LIST TO REAL PROJECT</p><h1>Projects</h1><p>Milestones, tasks, waiting items, notes and trackers stay together.</p></div><button class="primary-button" data-new-project>+ Project</button></div>${projects.length?`<div class="project-tabs">${projects.map(p=>`<button class="${p.id===state.activeProjectId?"active":""}" data-select-project="${p.id}">${escapeHTML(p.emoji)} ${escapeHTML(p.name)}</button>`).join("")}</div>${active?renderProjectDetail(active):""}`:emptyState("🌷","No projects yet","Create a project when a goal needs more than a single task.","Create project","open-project")}`;}

function bloomStage(progress,activity=0){if(progress>=100)return{icon:"🌸",label:"Blooming"};if(progress>=60||activity>=8)return{icon:"🌺",label:"Growing strong"};if(progress>=25||activity>=3)return{icon:"🌷",label:"Growing"};if(progress>0||activity>0)return{icon:"🌿",label:"Taking root"};return{icon:"🌱",label:"Ready to nurture"};}
function recentCompletedForSpace(spaceId,days=30){const cutoff=addDaysISO(todayISO(),-days);return state.tasks.filter(t=>t.space===spaceId&&t.completedDate&&t.completedDate>=cutoff).length+state.tinyWins.filter(w=>w.space===spaceId&&w.date>=cutoff).length;}
function renderGarden(){const c=document.getElementById("pageContent");const spaces=state.spaces.filter(s=>state.currentMode==="all"||s.id===state.currentMode);c.innerHTML=`<div class="page-heading"><p class="eyebrow">WHAT YOU HAVE BEEN NURTURING</p><h1>Hana Garden 🌺</h1><p>No streaks to break. This garden reflects progress and care, not perfect attendance.</p></div><section class="garden-section"><div class="section-header"><h2>Life flowerbeds</h2><small>Last 30 days</small></div><div class="garden-grid">${spaces.map(s=>{const all=state.tasks.filter(t=>t.space===s.id),done=all.filter(t=>t.completed).length,pct=all.length?Math.round(done/all.length*100):0,activity=recentCompletedForSpace(s.id),stage=bloomStage(pct,activity);return `<article class="garden-bed"><div class="garden-flower">${stage.icon}</div><h3>${escapeHTML(s.emoji)} ${escapeHTML(s.name)}</h3><p>${stage.label}</p><div class="garden-stat"><strong>${activity}</strong><span>things nurtured</span></div><div class="progress-track"><div class="progress-fill" style="width:${Math.min(100,pct)}%"></div></div></article>`}).join("")}</div></section><section class="garden-section"><div class="section-header"><h2>Project garden</h2><button data-goto="projects">Projects</button></div><div class="garden-projects">${filterByMode(state.projects,{respectFirewall:false}).map(p=>{const pct=projectProgress(p),stage=bloomStage(pct);return `<button class="garden-project" data-open-garden-project="${p.id}"><span>${stage.icon}</span><span><strong>${escapeHTML(p.emoji)} ${escapeHTML(p.name)}</strong><small>${pct}% · ${stage.label}</small></span></button>`}).join("")||`<div class="project-empty">Projects will grow here when you create them.</div>`}</div></section>`;}

function completionRate(tasks){if(!tasks.length)return null;return Math.round(tasks.filter(t=>t.completed).length/tasks.length*100);}
function localPlanningInsights(){
  const visible=filterByMode(state.tasks,{respectFirewall:false}),open=visible.filter(t=>!t.completed),done=visible.filter(t=>t.completed),today=todayISO();const insights=[];
  const planned=focusTasksVisible().reduce((s,t)=>s+taskPlanningMinutes(t),0),cap=Number(state.settings.dailyCapacityMinutes||240);if(planned>cap)insights.push({icon:"🌷",title:"Your bouquet is over capacity",text:`You planned ${formatDuration(planned)} against ${formatDuration(cap)} of capacity. Rescue My Day can make room.`});
  const hard=open.filter(t=>t.deadlineType==="hard"&&t.dueDate&&t.dueDate<=addDaysISO(today,3));if(hard.length)insights.push({icon:"🔒",title:`${hard.length} protected deadline${hard.length===1?"":"s"} nearby`,text:`Hana will keep ${hard.slice(0,2).map(t=>t.title).join(" and ")} visible while planning.`});
  const repeatMoves=open.filter(t=>t.rescheduleCount>=2).sort((a,b)=>b.rescheduleCount-a.rescheduleCount);if(repeatMoves.length)insights.push({icon:"🌿",title:"A task keeps moving",text:`“${repeatMoves[0].title}” has moved ${repeatMoves[0].rescheduleCount} times. It may need a smaller next step, a better day, or permission to leave.`});
  const short=visible.filter(t=>t.durationMinutes>0&&t.durationMinutes<=15),shortRate=completionRate(short);if(short.length>=4)insights.push({icon:"⏱",title:"Small tasks tell a pattern",text:`You complete about ${shortRate}% of tasks estimated at 15 minutes or less. Use Time Pockets when you have a short gap.`});
  const byEnergy=["low","medium","high"].map(e=>({e,n:done.filter(t=>t.energy===e).length})).sort((a,b)=>b.n-a.n)[0];if(done.length>=5&&byEnergy.n)insights.push({icon:"⚡",title:"Your completion pattern is taking shape",text:`Most of your completed estimated tasks are ${byEnergy.e}-energy. Hana will keep learning locally as you use it.`});
  const timed=done.filter(t=>t.completedAt);if(timed.length>=5){const buckets={morning:0,afternoon:0,evening:0};timed.forEach(t=>{const h=new Date(t.completedAt).getHours();if(h<12)buckets.morning++;else if(h<18)buckets.afternoon++;else buckets.evening++;});const strongest=Object.entries(buckets).sort((a,b)=>b[1]-a[1])[0];if(strongest[1]>=2)insights.push({icon:"🕰️",title:`Your ${strongest[0]}s look productive`,text:`Most timestamped completions so far happened in the ${strongest[0]}. This is a pattern, not a rule—Hana will keep updating it.`});}
  const byProject=state.projects.map(p=>({p,n:projectTasks(p).filter(t=>!t.completed).length})).sort((a,b)=>b.n-a.n)[0];if(byProject?.n>=5)insights.push({icon:"🌷",title:"One project is carrying a lot",text:`${byProject.p.name} has ${byProject.n} open tasks. Milestones can make that load easier to scan.`});
  if(!insights.length)insights.push({icon:"🌱",title:"Hana is still learning your rhythm",text:"Complete, schedule and reschedule naturally. Insights appear from your local activity; nothing needs to be performed for the app."});return insights;
}
function renderPlanningInsights(){const c=document.getElementById("pageContent"),insights=localPlanningInsights();c.innerHTML=`<div class="page-heading"><p class="eyebrow">LOCAL PATTERNS, NOT JUDGMENT</p><h1>Hana Notices</h1><p>Planning patterns calculated only from the Hana data on this device.</p></div><div class="insight-grid">${insights.map(i=>`<article class="insight-card"><span>${i.icon}</span><div><h3>${escapeHTML(i.title)}</h3><p>${escapeHTML(i.text)}</p></div></article>`).join("")}</div><div class="card soft-card insight-privacy"><strong>🌿 Private by design</strong><p>These observations use simple local rules, not cloud AI. They become more useful as Hana gets real completion and scheduling history.</p></div>`;}

function parseCaptureMeta(text,defaultSpace=preferredSpace()){
  let clean=String(text||"").trim(),space=defaultSpace,tags=[],duration=0,energy="medium",deadlineType="soft",project="",time="",date=extractDate(clean);
  const dur=clean.match(/(?:^|\s)(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours|m|min|mins|minute|minutes)\b/i);if(dur){duration=Math.round(Number(dur[1])*(dur[2].toLowerCase().startsWith("h")?60:1));clean=clean.replace(dur[0]," ");}
  const en=clean.match(/\b(low|medium|high)\s+energy\b/i);if(en){energy=en[1].toLowerCase();clean=clean.replace(en[0],"");}
  if(/!hard\b|\bhard deadline\b/i.test(clean)){deadlineType="hard";clean=clean.replace(/!hard\b|\bhard deadline\b/ig,"");}
  const tm=clean.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i)||clean.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);if(tm){if(tm[3]){let h=Number(tm[1])%12;if(tm[3].toLowerCase()==="pm")h+=12;time=`${String(h).padStart(2,"0")}:${tm[2]||"00"}`;}else time=`${String(tm[1]).padStart(2,"0")}:${tm[2]}`;clean=clean.replace(tm[0],"");}
  state.spaces.forEach(s=>{const re=new RegExp(`#${s.name.replace(/[.*+?^${}()|[\]\\]/g,"\\$&").replace(/\s+/g,"\\s+")}\\b`,"i");if(re.test(clean)){space=s.id;clean=clean.replace(re,"");}});
  const pMatch=clean.match(/\bproject:\s*([^#@!]+?)(?=\s+#|\s+!|$)/i);if(pMatch){project=pMatch[1].trim();clean=clean.replace(pMatch[0],"");}
  tags=[...clean.matchAll(/#([\w-]+)/g)].map(m=>m[1]);clean=clean.replace(/#[\w-]+/g,"");
  clean=clean.replace(/\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/ig,"").replace(/\s+/g," ").trim().replace(/^[-–—:,]+|[-–—:,]+$/g,"").trim();
  return{title:clean||String(text).trim(),space,tags,duration,energy,deadlineType,project,time,date};
}


/* ================= BRAIN DUMP / INBOX ================= */

function predictCapture(text){const value=text.trim().toLowerCase();if(!value)return{type:"unknown",label:"🌱 Something new"};if(value.startsWith("event:")||value.startsWith("appointment:"))return{type:"event",label:"📅 Event"};if(value.startsWith("list:")||value.startsWith("groceries:"))return{type:"list",label:"☑️ Checklist"};if(/\b(remind|due|tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}:\d{2}|\d+\s?(am|pm)|\d+\s?(min|mins|m|h|hr|hrs))\b/.test(value))return{type:"task",label:"✅ Smart task · Hana sees planning details"};if(value.includes("|")||value.startsWith("table:"))return{type:"table",label:"📋 Table item"};if(/\b(maybe|someday|one day|want to|learn|visit|try)\b/.test(value))return{type:"someday",label:"🌱 Someday"};if(/^(buy|send|finish|submit|call|email|book|pay|check|clean|prepare|review|ask|follow up)\b/.test(value))return{type:"task",label:"✅ Task"};return{type:"note",label:"📝 Note"};}

function updateCapturePrediction(){const input=document.getElementById("quickCaptureInput");const p=document.getElementById("capturePrediction");if(!input||!p)return;const lines=parseLines(input.value);p.textContent=lines.length>1?`🧠 ${lines.length} items · Hana can organize these` : predictCapture(input.value).label;}
function extractDate(text){const lower=text.toLowerCase();if(lower.includes("tomorrow"))return addDaysISO(todayISO(),1);if(lower.includes("today"))return todayISO();const days={sunday:0,monday:1,tuesday:2,wednesday:3,thursday:4,friday:5,saturday:6};for(const [name,day] of Object.entries(days)){if(lower.includes(name)){const d=new Date();let diff=(day-d.getDay()+7)%7;if(diff===0)diff=7;d.setDate(d.getDate()+diff);return localDateISO(d);}}return"";}
function plantText(text,space=preferredSpace()){
  const pred=predictCapture(text),meta=parseCaptureMeta(text,space);
  if(pred.type==="event"){
    const raw=text.replace(/^\s*(event|appointment):\s*/i,"");const m=parseCaptureMeta(raw,space);const e=normalizeEvent({title:m.title,space:m.space,date:m.date||todayISO(),startTime:m.time||"09:00",endTime:addMinutesToTime(m.time||"09:00",60),createdAt:Date.now()});state.events.push(e);return"event";
  }
  if(pred.type==="list"){
    const raw=text.replace(/^\s*(list|groceries):\s*/i,"");const parts=raw.split(/[,;]+/).map(x=>x.trim()).filter(Boolean);const name=/^groceries:/i.test(text)?"Groceries":"Quick List";state.lists.push(normalizeList({name,icon:name==="Groceries"?"🛒":"☑️",space,items:parts.map(title=>({id:createId(),title,completed:false,createdAt:Date.now()}))}));return"list";
  }
  if(pred.type==="task"){
    const task=normalizeTask({title:meta.title,space:meta.space,priority:"medium",status:"todo",dueDate:meta.date,dueTime:meta.time,durationMinutes:meta.duration,energy:meta.energy,deadlineType:meta.deadlineType,project:meta.project,tags:meta.tags,reminderEnabled:Boolean(meta.date&&meta.time),createdAt:Date.now()});state.tasks.push(task);if(task.reminderEnabled)syncTaskReminder(task);return"task";
  }
  if(pred.type==="someday"){state.someday.push({id:createId(),title:meta.title,category:"ideas",notes:"",createdAt:Date.now()});return"someday";}
  if(pred.type==="table"){const table=state.tables[0];if(table){const row={id:createId(),values:{},createdAt:Date.now()};const textCol=table.columns.find(c=>c.type==="text");if(textCol)row.values[textCol.id]=text;table.rows.push(row);}return"table";}
  state.notes.push(normalizeNote({title:text.slice(0,55),content:text,space,pinned:false,createdAt:Date.now()}));return"note";
}
function saveQuickCapture(){const text=document.getElementById("quickCaptureInput").value.trim();const space=document.getElementById("captureSpace").value;if(!text)return showToast("Write something first 🌸");const lines=parseLines(text);lines.forEach(line=>plantText(line,space));document.getElementById("quickCaptureInput").value="";closeModal("quickCaptureModal");showToast(`${lines.length} item${lines.length===1?"":"s"} planted 🌱`);render();}
function sendQuickCaptureToInbox(){const text=document.getElementById("quickCaptureInput").value.trim();const space=document.getElementById("captureSpace").value;if(!text)return showToast("Write something first 🌸");const lines=parseLines(text);lines.forEach(line=>state.inbox.push({id:createId(),text:line,space,prediction:predictCapture(line).type,createdAt:Date.now()}));document.getElementById("quickCaptureInput").value="";closeModal("quickCaptureModal");showToast(`${lines.length} item${lines.length===1?"":"s"} sent to Inbox 🧠`);render();}

function renderInbox(){const container=document.getElementById("pageContent");const defaultSpace=preferredSpace();container.innerHTML=`<div class="page-heading"><p class="eyebrow">MESSY BRAIN, CLEAN GARDEN</p><h1>Brain Dump</h1><p>Dump first. Decide what things are later.</p></div><div class="inbox-compose"><textarea id="brainDumpText" class="large-textarea" placeholder="Paste or type one thing per line..."></textarea><div class="form-row brain-dump-controls" style="margin-top:9px;"><select id="brainDumpSpace">${spaceOptionsHTML(defaultSpace," default")}</select><button class="primary-button" id="brainDumpAddButton">Organize lines ✨</button></div></div><section class="section"><div class="section-header"><h2>Inbox <span class="brain-dump-count">${state.inbox.length}</span></h2>${state.inbox.length?`<button data-plant-all-inbox>Plant all</button>`:""}</div>${state.inbox.length?state.inbox.map(inboxCard).join(""):emptyState("🧠","Inbox zero","Nothing is waiting to be organized.","","")}</section>`;}
function inboxCard(item){const p=predictCapture(item.text);return `<div class="inbox-item"><div><strong style="font-size:12px;">${escapeHTML(item.text)}</strong><div class="inbox-prediction">${p.label}</div><div class="task-meta" style="margin-top:6px;">${modeLabel(item.space)}</div></div><div class="inbox-actions"><button class="mini-icon-button" data-plant-inbox="${item.id}">🌱</button><button class="mini-icon-button" data-delete-inbox="${item.id}">×</button></div></div>`;}
function addBrainDump(){const text=document.getElementById("brainDumpText")?.value.trim();const space=document.getElementById("brainDumpSpace")?.value||preferredSpace();if(!text)return showToast("Add a few thoughts first 🌸");parseLines(text).forEach(line=>state.inbox.push({id:createId(),text:line,space,prediction:predictCapture(line).type,createdAt:Date.now()}));showToast("Brain dump organized into the Inbox 🧠");render();}
function plantInboxItem(id){const item=state.inbox.find(i=>i.id===id);if(!item)return;plantText(item.text,item.space);state.inbox=state.inbox.filter(i=>i.id!==id);showToast("Planted 🌱");render();}
function plantAllInbox(){const items=[...state.inbox];items.forEach(i=>plantText(i.text,i.space));state.inbox=[];showToast(`${items.length} items planted 🌸`);render();}

/* ================= HANA LIFE FLOW ================= */

function intentionForToday() { return String(state.dayIntentions?.[todayISO()] || ""); }
function saveDayIntention() {
  const input = document.getElementById("dayIntentionInput");
  if (!input) return;
  const value = input.value.trim();
  if (value) state.dayIntentions[todayISO()] = value;
  else delete state.dayIntentions[todayISO()];
  saveState(); showToast(value ? "Today's intention is set 🌷" : "Intention cleared"); render();
}

function markFocusHistory(task) {
  if (!task) return;
  if (!Array.isArray(task.focusHistory)) task.focusHistory = [];
  if (!task.focusHistory.includes(todayISO())) task.focusHistory.push(todayISO());
}

function rescheduleTask(task, newDate, source = "manual") {
  if (!task || !newDate || task.dueDate === newDate) return false;
  const oldDate = task.dueDate || "";
  task.dueDate = newDate;
  task.rescheduleCount = Number(task.rescheduleCount || 0) + 1;
  if (!Array.isArray(task.rescheduleHistory)) task.rescheduleHistory = [];
  task.rescheduleHistory.push({ date: todayISO(), from: oldDate, to: newDate, source, at: Date.now() });
  task.updatedAt = Date.now();
  syncTaskReminder(task);
  if (task.rescheduleCount >= 2 && !state.pendingRescheduleTaskId) state.pendingRescheduleTaskId = task.id;
  return true;
}

function maybeOpenRescheduleReflection() {
  const id = state.pendingRescheduleTaskId;
  if (!id) return;
  const task = state.tasks.find(item => item.id === id);
  state.pendingRescheduleTaskId = "";
  if (!task || task.completed) return;
  setTimeout(() => openRescheduleReflection(task.id), 90);
}

function openRescheduleReflection(taskId) {
  const task = state.tasks.find(item => item.id === taskId);
  if (!task) return;
  document.getElementById("rescheduleTaskId").value = task.id;
  document.getElementById("rescheduleTaskName").textContent = task.title;
  document.getElementById("rescheduleCountLabel").textContent = `This has moved ${task.rescheduleCount} times.`;
  document.querySelectorAll("[data-reschedule-reason]").forEach(button => button.classList.toggle("active", button.dataset.rescheduleReason === task.lastRescheduleReason));
  openModal("rescheduleModal");
}

function chooseRescheduleReason(reason) {
  const task = state.tasks.find(item => item.id === document.getElementById("rescheduleTaskId")?.value);
  if (!task) return;
  task.lastRescheduleReason = reason;
  task.updatedAt = Date.now();
  document.querySelectorAll("[data-reschedule-reason]").forEach(button => button.classList.toggle("active", button.dataset.rescheduleReason === reason));
  saveState();
}

function rescheduleReflectionAction(action) {
  const task = state.tasks.find(item => item.id === document.getElementById("rescheduleTaskId")?.value);
  if (!task) return closeModal("rescheduleModal");
  if (action === "breakdown") { closeModal("rescheduleModal"); return openBreakdownModal(task.id); }
  if (action === "waiting") {
    task.status = "waiting"; task.waitingSince = task.waitingSince || todayISO();
    task.waitingOn = task.waitingOn || "Something outside my control";
    task.updatedAt = Date.now(); closeModal("rescheduleModal"); showToast("Moved to the Waiting Garden ⏳"); return render();
  }
  if (action === "someday") {
    state.someday.push({ id:createId(), title:task.title, category:"ideas", notes:task.notes, createdAt:Date.now() });
    state.releaseHistory.push(normalizeRelease({ title:task.title, taskId:task.id, action:"someday" }));
    deleteTaskSilent(task.id); closeModal("rescheduleModal"); showToast("Released to Someday 🌱"); return render();
  }
  if (action === "release") {
    const linkedReminders = state.reminders.filter(r => r.linkedTaskId === task.id);
    moveToTrash("task", task, { linkedReminders });
    state.releaseHistory.push(normalizeRelease({ title:task.title, taskId:task.id, action:"let go" }));
    deleteTaskSilent(task.id); closeModal("rescheduleModal"); showToast("Let go, with no guilt 🌿"); return render();
  }
  closeModal("rescheduleModal"); showToast("Kept as planned 🌸"); render();
}

function openBreakdownModal(taskId) {
  const task = state.tasks.find(item => item.id === taskId); if (!task) return;
  document.getElementById("breakdownTaskId").value = task.id;
  document.getElementById("breakdownTaskTitle").textContent = task.title;
  document.getElementById("breakdownSteps").value = task.subtasks.map(item => item.title).join("\n");
  openModal("breakdownModal");
}

function saveTaskBreakdown() {
  const task = state.tasks.find(item => item.id === document.getElementById("breakdownTaskId")?.value); if (!task) return;
  const old = task.subtasks || [];
  const titles = parseLines(document.getElementById("breakdownSteps").value);
  task.subtasks = titles.map(title => old.find(item => item.title === title) || { id:createId(), title, completed:false });
  task.updatedAt = Date.now(); closeModal("breakdownModal"); showToast("Mini plan saved 🌱"); render();
}

function waitingTasks() {
  return filterByMode(state.tasks).filter(task => !task.completed && (task.status === "waiting" || task.waitingOn));
}

function renderWaitingGarden() {
  const c = document.getElementById("pageContent");
  const items = waitingTasks().sort((a,b) => (a.followUpDate || "9999").localeCompare(b.followUpDate || "9999"));
  c.innerHTML = `<div class="page-heading"><p class="eyebrow">THINGS THAT ARE NOT YOURS TO PUSH</p><h1>Waiting Garden ⏳</h1><p>Keep replies, approvals, deliveries and dependencies visible without carrying them as active work.</p></div>
  <div class="waiting-summary"><span>⏳ ${items.length} waiting</span><span>🔔 ${items.filter(t=>t.followUpDate&&t.followUpDate<=todayISO()).length} need follow-up</span></div>
  ${items.length ? `<div class="waiting-garden-list">${items.map(task => `<article class="waiting-garden-card"><div class="waiting-garden-top"><div><span class="badge ${modeBadge(task.space)}">${modeLabel(task.space)}</span><h3>${escapeHTML(task.title)}</h3></div><button class="mini-icon-button" data-edit-task="${task.id}">✎</button></div><div class="waiting-details"><span><b>Waiting on</b>${escapeHTML(task.waitingOn || "Not specified")}</span><span><b>Since</b>${task.waitingSince ? formatDate(task.waitingSince) : "—"}</span><span><b>Follow up</b>${task.followUpDate ? formatDate(task.followUpDate) : "Not scheduled"}</span></div><div class="waiting-actions"><button class="primary-button" data-follow-up-today="${task.id}">Follow up today</button><button class="secondary-button" data-waiting-resolved="${task.id}">No longer waiting</button></div></article>`).join("")}</div>` : emptyState("🌿","Nothing is waiting on anyone","When a task depends on someone else, it can rest here.","","")}`;
}

function followUpToday(taskId) {
  const task = state.tasks.find(item => item.id === taskId); if (!task) return;
  task.dueDate = todayISO(); task.followUpDate = todayISO(); task.reminderEnabled = true; task.updatedAt = Date.now(); syncTaskReminder(task);
  showToast("Follow-up brought into today 🔔"); render();
}

function resolveWaiting(taskId) {
  const task = state.tasks.find(item => item.id === taskId); if (!task) return;
  task.status = "todo"; task.waitingOn = ""; task.followUpDate = ""; task.waitingSince = ""; task.updatedAt = Date.now(); syncTaskReminder(task);
  showToast("Back in your hands 🌱"); render();
}

function dueFutureNotes() { return filterByMode(state.futureNotes).filter(note => !note.archived && note.date <= todayISO()).sort((a,b)=>a.date.localeCompare(b.date)); }

function openFutureNoteModal(noteId = "") {
  const note = state.futureNotes.find(item => item.id === noteId);
  document.getElementById("futureNoteEditId").value = note?.id || "";
  document.getElementById("futureNoteTitle").value = note?.title || "";
  document.getElementById("futureNoteContent").value = note?.content || "";
  document.getElementById("futureNoteDate").value = note?.date || addDaysISO(todayISO(), 7);
  refreshSpaceSelects(); document.getElementById("futureNoteSpace").value = note?.space || preferredSpace();
  document.getElementById("futureNoteModalTitle").textContent = note ? "Edit Future Me note" : "Write to Future Me";
  document.getElementById("deleteFutureNoteButton").classList.toggle("hidden", !note);
  openModal("futureNoteModal");
}

function saveFutureNote() {
  const id = document.getElementById("futureNoteEditId").value;
  const title = document.getElementById("futureNoteTitle").value.trim() || "A note for future me";
  const content = document.getElementById("futureNoteContent").value.trim();
  const date = document.getElementById("futureNoteDate").value;
  if (!content) return showToast("Write something for Future You 💌");
  if (!date) return showToast("Choose when Hana should bring it back 🌷");
  const old = state.futureNotes.find(item => item.id === id);
  const note = normalizeFutureNote({ ...(old||{}), id:id||createId(), title, content, date, space:document.getElementById("futureNoteSpace").value, archived:false, createdAt:old?.createdAt||Date.now(), updatedAt:Date.now() });
  if (old) state.futureNotes[state.futureNotes.findIndex(item=>item.id===id)] = note; else state.futureNotes.push(note);
  closeModal("futureNoteModal"); showToast("Future You will see this 💌"); render();
}

function deleteFutureNote(id) { state.futureNotes = state.futureNotes.filter(note => note.id !== id); closeModal("futureNoteModal"); showToast("Future note removed"); render(); }
function archiveFutureNote(id) { const note=state.futureNotes.find(n=>n.id===id); if(note){note.archived=true;note.updatedAt=Date.now();} showToast("Note tucked into the past 🌸"); render(); }
function futureNoteToTask(id) { const note=state.futureNotes.find(n=>n.id===id); if(!note)return; state.tasks.push(normalizeTask({ title:note.title, notes:note.content, dueDate:todayISO(), space:note.space, createdAt:Date.now() })); note.archived=true; showToast("Planted as a task 🌱"); render(); }

function renderFutureNotes() {
  const c=document.getElementById("pageContent");
  const active=filterByMode(state.futureNotes).filter(note=>!note.archived).sort((a,b)=>a.date.localeCompare(b.date));
  c.innerHTML=`<div class="page-heading"><p class="eyebrow">LEAVE CONTEXT, NOT JUST REMINDERS</p><h1>Future Me 💌</h1><p>Write something that should return on a future Hana Morning. It can be context, advice, an idea or a reminder of why something mattered.</p></div><button class="primary-button full-width" data-new-future-note>+ Write to Future Me</button><section class="section"><div class="section-header"><h2>${active.length} note${active.length===1?"":"s"}</h2></div>${active.length?`<div class="future-note-list">${active.map(note=>`<article class="future-note-card ${note.date<=todayISO()?"future-note-due":""}"><div><span class="badge ${modeBadge(note.space)}">${modeLabel(note.space)}</span><h3>${escapeHTML(note.title)}</h3><p>${escapeHTML(note.content)}</p><small>${note.date<=todayISO()?"💌 Ready for you":"Returns "+formatFullDate(note.date)}</small></div><div class="future-note-actions"><button data-edit-future-note="${note.id}">Edit</button>${note.date<=todayISO()?`<button data-future-note-task="${note.id}">→ Task</button><button data-archive-future-note="${note.id}">Archive</button>`:""}</div></article>`).join("")}</div>`:emptyState("💌","Nothing waiting for Future You","Leave a note when present-you has context worth saving.","","")}</section>`;
}

function getThreadableItems() {
  const items=[];
  state.tasks.forEach(item=>items.push({type:"task",id:item.id,title:`✅ ${item.title}`,meta:modeLabel(item.space)}));
  state.notes.forEach(item=>items.push({type:"note",id:item.id,title:`📝 ${item.title}`,meta:modeLabel(item.space)}));
  state.reminders.forEach(item=>items.push({type:"reminder",id:item.id,title:`🔔 ${item.title}`,meta:modeLabel(item.space)}));
  state.futureNotes.forEach(item=>items.push({type:"future",id:item.id,title:`💌 ${item.title}`,meta:formatDate(item.date)}));
  state.tables.forEach(table=>table.rows.forEach(row=>items.push({type:"row",id:row.id,tableId:table.id,title:`📒 ${rowTitle(table,row)}`,meta:table.name})));
  return items;
}

function resolveThreadItem(link) {
  if(link.type==="task"){const x=state.tasks.find(i=>i.id===link.id);return x?{title:x.title,meta:modeLabel(x.space),icon:"✅"}:null;}
  if(link.type==="note"){const x=state.notes.find(i=>i.id===link.id);return x?{title:x.title,meta:modeLabel(x.space),icon:"📝"}:null;}
  if(link.type==="reminder"){const x=state.reminders.find(i=>i.id===link.id);return x?{title:x.title,meta:x.date?formatDate(x.date):"Reminder",icon:"🔔"}:null;}
  if(link.type==="future"){const x=state.futureNotes.find(i=>i.id===link.id);return x?{title:x.title,meta:`Returns ${formatDate(x.date)}`,icon:"💌"}:null;}
  if(link.type==="row"){const t=state.tables.find(i=>i.id===link.tableId),r=t?.rows.find(i=>i.id===link.id);return t&&r?{title:rowTitle(t,r),meta:t.name,icon:"📒"}:null;}
  return null;
}

function openThreadModal(threadId="") {
  const thread=state.threads.find(item=>item.id===threadId);
  document.getElementById("threadEditId").value=thread?.id||""; document.getElementById("threadTitle").value=thread?.title||""; document.getElementById("threadEmoji").value=thread?.emoji||"🧵"; document.getElementById("threadDescription").value=thread?.description||"";
  refreshSpaceSelects(); document.getElementById("threadSpace").value=thread?.space||preferredSpace(); document.getElementById("deleteThreadButton").classList.toggle("hidden",!thread); openModal("threadModal");
}
function saveThread(){const id=document.getElementById("threadEditId").value,title=document.getElementById("threadTitle").value.trim();if(!title)return showToast("Give the thread a name 🧵");const old=state.threads.find(t=>t.id===id);const thread=normalizeThread({...(old||{}),id:id||createId(),title,emoji:document.getElementById("threadEmoji").value.trim()||"🧵",description:document.getElementById("threadDescription").value.trim(),space:document.getElementById("threadSpace").value,links:old?.links||[],createdAt:old?.createdAt||Date.now(),updatedAt:Date.now()});if(old)state.threads[state.threads.findIndex(t=>t.id===id)]=thread;else state.threads.push(thread);state.activeThreadId=thread.id;closeModal("threadModal");showToast("Memory Thread saved 🧵");render();}
function deleteThread(id){state.threads=state.threads.filter(t=>t.id!==id);if(state.activeThreadId===id)state.activeThreadId="";closeModal("threadModal");showToast("Thread removed");render();}
function openThreadLinkModal(threadId){const thread=state.threads.find(t=>t.id===threadId);if(!thread)return;document.getElementById("threadLinkThreadId").value=thread.id;const linked=new Set(thread.links.map(l=>`${l.type}|${l.tableId||""}|${l.id}`));const items=getThreadableItems().filter(i=>!linked.has(`${i.type}|${i.tableId||""}|${i.id}`));document.getElementById("threadLinkItem").innerHTML=items.length?items.map(i=>`<option value="${escapeHTML(i.type)}|${escapeHTML(i.tableId||"")}|${escapeHTML(i.id)}">${escapeHTML(i.title)} · ${escapeHTML(i.meta)}</option>`).join(""):`<option value="">Everything is already linked</option>`;openModal("threadLinkModal");}
function saveThreadLink(){const thread=state.threads.find(t=>t.id===document.getElementById("threadLinkThreadId").value),raw=document.getElementById("threadLinkItem").value;if(!thread||!raw)return closeModal("threadLinkModal");const[type,tableId,id]=raw.split("|");thread.links.push({type,tableId,id});thread.updatedAt=Date.now();closeModal("threadLinkModal");showToast("Added to the thread 🧵");render();}
function removeThreadLink(threadId,index){const t=state.threads.find(x=>x.id===threadId);if(!t)return;t.links.splice(Number(index),1);t.updatedAt=Date.now();render();}
function openThreadLinkedItem(type,id,tableId=""){if(type==="task")return openTaskModal(id);if(type==="note")return openNoteModal(id);if(type==="reminder")return openReminderModal(id);if(type==="future")return openFutureNoteModal(id);if(type==="row"){state.activeTableId=tableId;changePage("tables");return setTimeout(()=>openTableRowModal(tableId,id),50);}}
function renderThreads(){const c=document.getElementById("pageContent");const threads=filterByMode(state.threads,{respectFirewall:false});if(!state.activeThreadId||!threads.some(t=>t.id===state.activeThreadId))state.activeThreadId=threads[0]?.id||"";const active=threads.find(t=>t.id===state.activeThreadId);c.innerHTML=`<div class="page-heading"><p class="eyebrow">KEEP THE STORY TOGETHER</p><h1>Memory Threads 🧵</h1><p>Connect tasks, notes, reminders, tracker rows and Future Me notes so context does not disappear between screens.</p></div><div class="thread-toolbar"><button class="primary-button" data-new-thread>+ New thread</button></div>${threads.length?`<div class="thread-tabs">${threads.map(t=>`<button class="filter-chip ${active?.id===t.id?"active":""}" data-select-thread="${t.id}">${escapeHTML(t.emoji)} ${escapeHTML(t.title)}</button>`).join("")}</div>${active?`<article class="thread-detail"><div class="thread-detail-head"><div><span class="badge ${modeBadge(active.space)}">${modeLabel(active.space)}</span><h2>${escapeHTML(active.emoji)} ${escapeHTML(active.title)}</h2><p>${escapeHTML(active.description||"A connected trail of context.")}</p></div><button class="secondary-button" data-edit-thread="${active.id}">Edit</button></div><div class="thread-linked-list">${active.links.length?active.links.map((link,index)=>{const item=resolveThreadItem(link);return item?`<div class="thread-linked-item"><button data-open-thread-item data-thread-type="${link.type}" data-thread-id="${link.id}" data-thread-table="${link.tableId||""}"><span>${item.icon}</span><span><strong>${escapeHTML(item.title)}</strong><small>${escapeHTML(item.meta)}</small></span></button><button class="mini-icon-button" data-remove-thread-link="${index}" data-thread-owner="${active.id}">×</button></div>`:""}).join(""):`<div class="thread-empty">Nothing linked yet. Add the first piece of this story.</div>`}</div><button class="secondary-button full-width" data-link-thread-item="${active.id}">+ Link something</button></article>`:""}`:emptyState("🧵","No Memory Threads yet","Create one when a task, note and reminder belong to the same story.","","")}`;}

function addTinyWin(){const input=document.getElementById("tinyWinInput");if(!input||!input.value.trim())return showToast("What did you get done? ✨");state.tinyWins.push(normalizeTinyWin({title:input.value.trim(),date:todayISO(),space:preferredSpace()}));input.value="";showToast("Tiny win counted ✨");render();}
function deleteTinyWin(id){state.tinyWins=state.tinyWins.filter(w=>w.id!==id);render();}

function getReturnRitualTasks(){return state.tasks.filter(t=>!t.completed&&t.dueDate&&t.dueDate<todayISO()).sort(taskSort);}
function renderReturnRitual(){const c=document.getElementById("pageContent"),items=getReturnRitualTasks();c.innerHTML=`<div class="return-ritual-shell"><div class="return-ritual-flower">🌸</div><p class="eyebrow">WELCOME BACK</p><h1>Your garden waited for you.</h1><p>${daysAwayAtLaunch>=3?`You were away for ${daysAwayAtLaunch} days. `:"Use this whenever overdue things start feeling noisy. "}Nothing needs to become an emergency just because time passed.</p>${items.length?`<div class="return-list">${items.map(t=>`<article class="return-item"><div><span class="badge ${modeBadge(t.space)}">${modeLabel(t.space)}</span><h3>${escapeHTML(t.title)}</h3><small>${t.deadlineType==="hard"?"🔒 Hard deadline · ":""}Was due ${formatDate(t.dueDate)}</small></div><div class="return-actions"><button data-return-action="still" data-task-id="${t.id}">Still matters</button><button data-return-action="reschedule" data-task-id="${t.id}">Tomorrow</button><button data-return-action="someday" data-task-id="${t.id}">Someday</button><button data-return-action="done" data-task-id="${t.id}">Done already</button><button data-return-action="letgo" data-task-id="${t.id}">Let go</button></div></article>`).join("")}</div>`:`<div class="card soft-card"><strong>Nothing overdue came back with you 🌿</strong></div>`}<button class="primary-button full-width return-finish" data-finish-return>Continue to Hana</button></div>`;}
function returnRitualAction(taskId,action){const task=state.tasks.find(t=>t.id===taskId);if(!task)return;if(action==="still"){if(task.deadlineType!=="hard")rescheduleTask(task,todayISO(),"return ritual");if(!state.focusTaskIds.includes(task.id)){state.focusTaskIds.push(task.id);markFocusHistory(task);}}if(action==="reschedule"){if(task.deadlineType==="hard")return openTaskModal(task.id);rescheduleTask(task,addDaysISO(todayISO(),1),"return ritual");}if(action==="someday"){state.someday.push({id:createId(),title:task.title,category:"ideas",notes:task.notes,createdAt:Date.now()});state.releaseHistory.push(normalizeRelease({title:task.title,taskId:task.id,action:"someday"}));deleteTaskSilent(task.id);}if(action==="done"){task.completed=true;task.status="done";task.completedDate=todayISO();task.updatedAt=Date.now();state.reminders=state.reminders.filter(r=>r.linkedTaskId!==task.id);scheduleNextRecurringTask(task);createFollowUpFromCompletedTask(task);}if(action==="letgo"){const linkedReminders=state.reminders.filter(r=>r.linkedTaskId===task.id);moveToTrash("task",task,{linkedReminders});state.releaseHistory.push(normalizeRelease({title:task.title,taskId:task.id,action:"let go"}));deleteTaskSilent(task.id);}render();maybeOpenRescheduleReflection();}
function finishReturnRitual(){state.returnRitualPending=false;state.lastReturnRitualDate=todayISO();state.currentPage="today";showToast("Welcome back 🌸");render();}

function intentionWords(){return intentionForToday().toLowerCase().split(/[^a-z0-9]+/).filter(w=>w.length>=3);}
function recommendationScore(task){let score=priorityWeight(task.priority)*12;const today=todayISO();if(task.deadlineType==="hard")score+=25;if(task.dueDate&&task.dueDate<today)score+=40;if(task.dueDate===today)score+=30;if(task.dueDate===addDaysISO(today,1))score+=12;if(task.status==="doing")score+=16;if(task.rescheduleCount>=2)score-=4;const words=intentionWords();if(words.length){const blob=[task.title,task.project,...task.tags,task.notes].join(" ").toLowerCase();if(words.some(w=>blob.includes(w)))score+=18;}return score;}
function recommendationReason(task){if(task.deadlineType==="hard"&&task.dueDate&&task.dueDate<=todayISO())return"Protected deadline";if(task.dueDate&&task.dueDate<todayISO())return"Overdue";if(task.dueDate===todayISO())return"Due today";if(intentionWords().some(w=>[task.title,task.project,...task.tags].join(" ").toLowerCase().includes(w)))return"Matches your intention";if(task.priority==="high")return"High priority";return`${formatDuration(taskPlanningMinutes(task))} fits your day`;}
function getBouquetRecommendations(){const current=focusTasksVisible(),capacity=capacitySnapshot(current),remaining=Math.max(0,capacity.remaining);let used=0;const candidates=filterByMode(state.tasks).filter(t=>!t.completed&&!state.focusTaskIds.includes(t.id)&&!["waiting","blocked"].includes(t.status)).sort((a,b)=>recommendationScore(b)-recommendationScore(a));const picks=[];for(const task of candidates){const mins=taskPlanningMinutes(task);if(picks.length>=4)break;if(mins<=Math.max(remaining-used,15)||task.deadlineType==="hard"&&task.dueDate&&task.dueDate<=todayISO()){picks.push(task);used+=mins;}}return picks;}
function applyBouquetRecommendations(){const picks=getBouquetRecommendations();picks.forEach(task=>{if(!state.focusTaskIds.includes(task.id)){state.focusTaskIds.push(task.id);markFocusHistory(task);}});showToast(picks.length?`Hana added ${picks.length} suggested bloom${picks.length===1?"":"s"} 💐`:"Your bouquet already looks good 🌸");render();}

/* ================= UNIVERSAL SEARCH ================= */

function globalSearch(query){
  const q=query.trim().toLowerCase();
  if(!q)return[];
  const results=[];
  const add=(type,id,title,snippet,page)=>results.push({type,id,title,snippet,page});
  filterByMode(state.tasks).forEach(t=>{if([t.title,t.project,t.notes,t.waitingOn,...t.tags,...t.subtasks.map(s=>s.title)].join(" ").toLowerCase().includes(q))add("Task",t.id,t.title,t.project||t.notes,"tasks")});
  filterByMode(state.events,{respectFirewall:false}).forEach(e=>{if([e.title,e.location,e.notes].join(" ").toLowerCase().includes(q))add("Event",e.id,e.title,`${e.date} ${e.location||""}`,"calendar")});
  filterByMode(state.projects,{respectFirewall:false}).forEach(p=>{if([p.name,p.description,...p.milestones.map(m=>m.title)].join(" ").toLowerCase().includes(q))add("Project",p.id,p.name,p.description,"projects")});
  filterByMode(state.notes).forEach(n=>{if([n.title,n.content,...n.tags,...n.checklist.map(i=>i.title)].join(" ").toLowerCase().includes(q))add("Note",n.id,n.title,n.content,"notes")});
  filterByMode(state.reminders).forEach(r=>{if(r.title.toLowerCase().includes(q))add("Reminder",r.id,r.title,`${formatDate(r.date)} ${formatTime(r.time)}`,"reminders")});
  filterByMode(state.tables).forEach(t=>{if(t.name.toLowerCase().includes(q))add("Table",t.id,t.name,`${t.rows.length} rows`,"tables");t.rows.forEach(row=>{const blob=Object.values(row.values).join(" ").toLowerCase();if(blob.includes(q))add("Table row",`${t.id}:${row.id}`,rowTitle(t,row),t.name,"tables")})});
  filterByMode(state.lists).forEach(list=>{const blob=[list.name,...list.items.map(item=>`${item.title} ${item.detail}`)].join(" ").toLowerCase();if(blob.includes(q))add("Checklist",list.id,`${list.icon} ${list.name}`,`${list.items.length} items`,"lists")});
  filterByMode(state.pins).forEach(p=>{if([p.title,p.content].join(" ").toLowerCase().includes(q))add("Pin",p.id,p.title,p.content,"pinboard")});
  state.someday.forEach(s=>{if([s.title,s.notes].join(" ").toLowerCase().includes(q))add("Someday",s.id,s.title,s.notes,"someday")});
  state.inbox.filter(i=>state.currentMode==="all"||i.space===state.currentMode).filter(i=>!firewallIsActive()||i.space!==state.settings.workFirewallSpaceId).forEach(i=>{if(i.text.toLowerCase().includes(q))add("Inbox",i.id,i.text,predictCapture(i.text).label,"inbox")});
  filterByMode(state.futureNotes,{respectFirewall:false}).forEach(n=>{if([n.title,n.content].join(" ").toLowerCase().includes(q))add("Future note",n.id,n.title,n.content,"future-notes")});
  filterByMode(state.threads,{respectFirewall:false}).forEach(t=>{if([t.title,t.description].join(" ").toLowerCase().includes(q))add("Memory Thread",t.id,t.title,t.description,"threads")});
  return results.slice(0,50);
}
function renderGlobalSearchResults(query){const el=document.getElementById("globalSearchResults");if(!el)return;const results=globalSearch(query);el.innerHTML=query.trim()?results.length?results.map(r=>`<button class="search-result" data-search-type="${r.type}" data-search-id="${r.id}" data-search-page="${r.page}"><strong>${escapeHTML(r.title)}</strong><small>${escapeHTML(r.type)}</small><div class="search-result-snippet">${escapeHTML(String(r.snippet||"")).slice(0,140)}</div></button>`).join(""):`<div class="empty-state"><div class="empty-icon">🔎</div><h3>No matches</h3><p>Try another word.</p></div>`:`<div class="empty-state"><div class="empty-icon">🌸</div><h3>Search everything</h3><p>Tasks, events, projects, notes, reminders, Future Me, Memory Threads, trackers, checklists, pins, Someday and Inbox.</p></div>`;}
function openSearchResult(type,id,page){closeModal("searchModal");if(type==="Task")return openTaskModal(id);if(type==="Note")return openNoteModal(id);if(type==="Reminder")return openReminderModal(id);if(type==="Event")return openEventModal(id);if(type==="Project"){state.activeProjectId=id;return changePage("projects");}if(type==="Table"){state.activeTableId=id;return changePage("tables");}if(type==="Checklist"){state.activeListId=id;return changePage("lists");}if(type==="Future note")return openFutureNoteModal(id);if(type==="Memory Thread"){state.activeThreadId=id;return changePage("threads");}if(type==="Table row"){const[tid,rid]=id.split(":");state.activeTableId=tid;changePage("tables");return setTimeout(()=>openTableRowModal(tid,rid),50);}changePage(page);}

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
  plan.keep.forEach(markFocusHistory);
  plan.move.forEach(task => {
    if (task.dueDate && task.dueDate <= todayISO() && task.deadlineType !== "hard") {
      rescheduleTask(task, tomorrow, "Rescue My Day");
    }
  });
  showToast(`Day rescued 🌷 ${plan.move.length} task${plan.move.length === 1 ? "" : "s"} released.`);
  changePage("today");
  maybeOpenRescheduleReflection();
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

function dailyCloseSnapshot() {
  const today = todayISO();
  const planned = state.tasks.filter(task => (task.focusHistory || []).includes(today) || state.focusTaskIds.includes(task.id)).length;
  const completed = state.tasks.filter(task => task.completedDate === today).length;
  const wins = state.tinyWins.filter(win => win.date === today).length;
  const moved = state.tasks.reduce((sum, task) => sum + (task.rescheduleHistory || []).filter(entry => entry.date === today).length, 0);
  const waiting = state.tasks.filter(task => !task.completed && task.status === "waiting").length;
  const released = state.releaseHistory.filter(entry => entry.date === today).length;
  return { planned, completed, wins, moved, waiting, released };
}

function renderDailyClose(){
  const c=document.getElementById("pageContent");
  const unfinished=filterByMode(state.tasks).filter(t=>!t.completed&&t.dueDate&&t.dueDate<=todayISO());
  const snapshot=dailyCloseSnapshot();
  const wins=filterByMode(state.tinyWins,{respectFirewall:false}).filter(win=>win.date===todayISO());
  c.innerHTML=`<div class="page-heading"><p class="eyebrow">CLEAR THE GARDEN</p><h1>Daily Close</h1><p>A truthful end-of-day story: what you planned, what you finished, what appeared unexpectedly, and what you chose to release.</p></div>
  <section class="daily-close-hero"><div class="daily-close-icon">🌙</div><h2>You did enough for one day.</h2><p style="color:var(--text-soft);font-size:12px;">${formatLongToday()}</p><div class="close-story-grid"><div><strong>${snapshot.planned}</strong><span>Planned</span></div><div><strong>${snapshot.completed}</strong><span>Completed</span></div><div><strong>${snapshot.wins}</strong><span>Tiny wins</span></div><div><strong>${snapshot.moved}</strong><span>Moved</span></div><div><strong>${snapshot.waiting}</strong><span>Waiting</span></div><div><strong>${snapshot.released}</strong><span>Released</span></div></div></section>
  <section class="section tiny-win-section"><div class="section-header"><div><p class="eyebrow">INVISIBLE WORK COUNTS</p><h2>Tiny Wins ✨</h2></div></div><p class="section-copy">Add something useful you did today that was never on the original list.</p><div class="tiny-win-compose"><input id="tinyWinInput" type="text" placeholder="Helped a teammate · finally called the clinic · cleaned the desk..."/><button class="primary-button" data-add-tiny-win>Add win</button></div>${wins.length?`<div class="tiny-win-list">${wins.map(win=>`<div class="tiny-win-item"><span>✨</span><strong>${escapeHTML(win.title)}</strong><button data-delete-tiny-win="${win.id}">×</button></div>`).join("")}</div>`:""}</section>
  <section class="section"><div class="section-header"><h2>Unfinished</h2></div>${unfinished.length?`<div class="daily-task-review">${unfinished.map(t=>`<div class="daily-task-row"><div><strong>${escapeHTML(t.title)}</strong>${t.deadlineType==="hard"?`<div class="task-meta" style="margin-top:4px;"><span>🔒 Hard deadline · reschedule manually if the real deadline changed</span></div>`:""}${t.rescheduleCount>=2?`<button class="no-guilt-inline" data-reflect-reschedule="${t.id}">🌿 Moved ${t.rescheduleCount}× · rethink it</button>`:""}</div><div class="daily-task-actions">${t.deadlineType==="hard"?`<button data-daily-task-action="edit" data-task-id="${t.id}">Schedule</button><button data-daily-task-action="delete" data-task-id="${t.id}">Delete</button>`:`<button data-daily-task-action="tomorrow" data-task-id="${t.id}">Tomorrow</button><button data-daily-task-action="week" data-task-id="${t.id}">Next week</button><button data-daily-task-action="someday" data-task-id="${t.id}">Someday</button><button data-daily-task-action="edit" data-task-id="${t.id}">Schedule</button><button data-daily-task-action="delete" data-task-id="${t.id}">Let go</button>`}</div></div>`).join("")}</div>`:`<div class="card soft-card"><strong>Nothing needs processing 🌸</strong></div>`}</section>
  <section class="close-story-card"><p class="eyebrow">TODAY'S STORY</p><h3>${snapshot.completed + snapshot.wins ? `You finished ${snapshot.completed} planned thing${snapshot.completed===1?"":"s"}${snapshot.wins?` and handled ${snapshot.wins} extra win${snapshot.wins===1?"":"s"}`:""}.` : "Some days are for carrying less."}</h3><p>${snapshot.moved?`${snapshot.moved} thing${snapshot.moved===1?" was":"s were"} moved without pretending it disappeared. `:""}${snapshot.waiting?`${snapshot.waiting} thing${snapshot.waiting===1?" is":"s are"} waiting on something outside you. `:""}${snapshot.released?`${snapshot.released} thing${snapshot.released===1?" was":"s were"} deliberately released.`:""}</p></section>
  <button class="primary-button full-width" style="margin-top:15px;" data-close-action="finish">Close the garden for today ✨</button>`;
}

function dailyTaskAction(taskId,action){
  const t=state.tasks.find(t=>t.id===taskId);if(!t)return;
  if(t.deadlineType==="hard"&&["tomorrow","week","someday"].includes(action))return showToast("That date is protected as a hard deadline 🔒");
  if(action==="tomorrow")rescheduleTask(t,addDaysISO(todayISO(),1),"Daily Close");
  if(action==="week")rescheduleTask(t,addDaysISO(todayISO(),7),"Daily Close");
  if(action==="someday"){state.someday.push({id:createId(),title:t.title,category:"ideas",notes:t.notes,createdAt:Date.now()});state.releaseHistory.push(normalizeRelease({title:t.title,taskId:t.id,action:"someday"}));deleteTaskSilent(taskId);}
  if(action==="delete"){const linkedReminders=state.reminders.filter(r=>r.linkedTaskId===taskId);moveToTrash("task",t,{linkedReminders});state.releaseHistory.push(normalizeRelease({title:t.title,taskId:t.id,action:"let go"}));deleteTaskSilent(taskId);}
  if(action==="edit")return openTaskModal(taskId);
  if(t&&!t.completed)syncTaskReminder(t);render();maybeOpenRescheduleReflection();
}
function deleteTaskSilent(id){state.tasks=state.tasks.filter(t=>t.id!==id);state.reminders=state.reminders.filter(r=>r.linkedTaskId!==id);state.focusTaskIds=state.focusTaskIds.filter(x=>x!==id);}
function finishDailyClose(){
  const snapshot=dailyCloseSnapshot();
  const existing=state.dailyCloseHistory.find(entry=>entry.date===todayISO());
  const entry={date:todayISO(),completedAt:Date.now(),intention:intentionForToday(),...snapshot};
  if(existing)Object.assign(existing,entry);else state.dailyCloseHistory.push(entry);
  saveState();showToast("The garden is closed for today 🌙");render();
}


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

function renderAgendaEvent(event,date=event.date) { return `<button class="agenda-item agenda-event" data-edit-event="${event.id}"><span class="agenda-icon">📅</span><span class="agenda-copy"><strong>${escapeHTML(event.title)}</strong><small>${modeLabel(event.space)} · ${formatTime(event.startTime)}–${formatTime(event.endTime)}${event.location?` · ${escapeHTML(event.location)}`:""}</small></span><span class="badge badge-custom">Event</span></button>`; }

function renderAgenda() {
  const c = document.getElementById("pageContent");
  const tasks = filterByMode(state.tasks).filter(task => !task.completed);
  const reminders = filterByMode(state.reminders).filter(reminder => !reminder.completed);
  const events = filterByMode(state.events,{respectFirewall:false});
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
    const eventItems = events.filter(event=>eventOccursOn(event,date)).sort((a,b)=>a.startTime.localeCompare(b.startTime));

    if (!taskItems.length && !reminderItems.length && !eventItems.length) return "";

    const heading = date === todayISO()
      ? `Today · ${formatFullDate(date)}`
      : date === addDaysISO(todayISO(), 1)
        ? `Tomorrow · ${formatFullDate(date)}`
        : formatFullDate(date);

    return `<section class="agenda-day">
      <div class="agenda-day-heading">
        <h2>${escapeHTML(heading)}</h2>
        <span>${taskItems.length + reminderItems.length + eventItems.length}</span>
      </div>
      <div class="agenda-list">
        ${eventItems.map(event=>renderAgendaEvent(event,date)).join("")}
        ${taskItems.map(renderAgendaTask).join("")}
        ${reminderItems.filter(r=>!r.linkedEventId).map(renderAgendaReminder).join("")}
      </div>
    </section>`;
  }).join("");

  c.innerHTML = `
    <div class="page-heading">
      <p class="eyebrow">THE NEXT TWO WEEKS AT A GLANCE</p>
      <h1>Agenda</h1>
      <p>Events, tasks and reminders in one chronological view. Tap anything to edit it.</p>
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

  const tinyWins = filterByMode(state.tinyWins, { respectFirewall: false })
    .map(win => ({ kind:"win", id:win.id, icon:"✨", title:win.title, meta:`${modeLabel(win.space)} · Tiny win ${formatDate(win.date)}`, time:win.createdAt || historyTimestamp(win.date) }));

  const closes = state.dailyCloseHistory.map((entry, index) => ({
    kind: "close",
    id: String(index),
    icon: "🌙",
    title: "Daily Close",
    meta: entry.date ? `${formatFullDate(entry.date)} · ${entry.completed ?? "?"} completed · ${entry.wins ?? 0} tiny wins · ${entry.released ?? 0} released` : "Completed",
    time: entry.completedAt || historyTimestamp(entry.date)
  }));

  const items = [...completedTasks, ...completedReminders, ...tinyWins, ...closes]
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
      <div class="stat-card"><span class="stat-number">${tinyWins.length}</span><span class="stat-label">Tiny Wins</span></div>
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
      space,
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
      space: isWork && state.spaces.some(space=>space.id==="work") ? "work" : preferredSpace(),
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



/* ================= HANA ACCOUNT / CLOUD BACKUP ================= */

function firebaseFriendlyError(error){
  const code=String(error?.code||"");
  if(code.includes("invalid-credential")||code.includes("wrong-password")||code.includes("user-not-found"))return "That email or password doesn't match a Hana account.";
  if(code.includes("email-already-in-use"))return "That email already has an account. Try Sign in instead.";
  if(code.includes("weak-password"))return "Use a password with at least 6 characters.";
  if(code.includes("invalid-email"))return "Enter a valid email address.";
  if(code.includes("too-many-requests"))return "Too many attempts. Try again a little later.";
  if(code.includes("network-request-failed"))return "Hana couldn't reach Firebase. Check your internet connection.";
  if(code.includes("popup-closed-by-user"))return "Google sign-in was closed before it finished.";
  return error?.message ? String(error.message).replace(/^Firebase:\s*/i,"") : "Something went wrong with your Hana account.";
}

async function firebaseReady(){
  const fb=window.HanaFirebase;
  if(!fb?.ready)throw new Error("Firebase is unavailable in this build.");
  await fb.ready;
  if(!fb.available)throw fb.error||new Error("Firebase is unavailable right now.");
  return fb;
}

function accountDisplayName(user=hanaAccountState.user){
  if(!user)return "Hana user";
  return user.displayName || user.email?.split("@")[0] || "Hana user";
}

function cloudMetaLabel(meta=hanaAccountState.meta){
  if(!meta?.updatedAt)return "No cloud backup yet";
  const date=new Date(meta.updatedAt);
  if(Number.isNaN(date.getTime()))return "Cloud backup available";
  return `Last cloud backup: ${date.toLocaleString(undefined,{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"})}`;
}

function renderAccountSettingsCard(){
  if(hanaAccountState.status==="loading")return `<section id="hanaAccountSection" class="section settings-section"><div class="section-header"><h2>Hana Account</h2></div><div class="settings-card account-settings-card"><h3>Connecting… ☁️</h3><p>Local Hana continues working while cloud services load.</p></div></section>`;
  if(hanaAccountState.status==="unavailable")return `<section id="hanaAccountSection" class="section settings-section"><div class="section-header"><h2>Hana Account</h2></div><div class="settings-card account-settings-card"><h3>Cloud unavailable right now</h3><p>${escapeHTML(hanaAccountState.error||"Hana could not reach Firebase. Your local data is still safe on this device.")}</p><button class="secondary-button" data-retry-firebase>Try again</button></div></section>`;
  const user=hanaAccountState.user;
  if(!user)return `<section id="hanaAccountSection" class="section settings-section"><div class="section-header"><h2>Hana Account</h2></div><div class="settings-card account-settings-card"><div class="account-settings-heading"><div class="account-avatar">🌸</div><div><h3>Optional cloud backup</h3><p>Sign in to keep a restorable copy of Hana in your Firebase account.</p></div></div><div class="account-settings-actions"><button class="google-auth-button" type="button" data-auth-google><span class="google-g">G</span><strong>Continue with Google</strong></button><button class="secondary-button" type="button" data-auth-email-mode="signin">Sign in with email</button><button class="text-button" type="button" data-auth-email-mode="create">Create account</button></div><small class="field-help">You can keep using Hana without signing in. Local autosave, safety snapshots and JSON export still work normally.</small></div></section>`;
  return `<section id="hanaAccountSection" class="section settings-section"><div class="section-header"><h2>Hana Account</h2></div><div class="settings-card account-settings-card"><div class="account-settings-heading"><div class="account-avatar">${user.photoURL?`<img src="${escapeHTML(user.photoURL)}" alt="" referrerpolicy="no-referrer" />`:"🌸"}</div><div><h3>${escapeHTML(accountDisplayName(user))}</h3><p>${escapeHTML(user.email||"Signed in")}</p></div><span class="account-signed-badge">Signed in</span></div><div class="cloud-backup-status"><span>☁️ Cloud backup</span><strong>${escapeHTML(cloudMetaLabel())}</strong>${hanaAccountState.meta?.sizeBytes?`<small>${Math.max(1,Math.round(Number(hanaAccountState.meta.sizeBytes)/1024))} KB · ${Number(hanaAccountState.meta.chunkCount||1)} cloud part${Number(hanaAccountState.meta.chunkCount||1)===1?"":"s"}</small>`:""}</div><div class="data-actions backup-actions"><button class="primary-button" data-cloud-backup-now>Back up Hana now</button><button class="secondary-button" data-cloud-restore-now ${hanaAccountState.meta?"":"disabled"}>Restore from cloud</button><button class="secondary-button" data-refresh-cloud-meta>Refresh status</button><button class="text-button danger-text" data-auth-signout>Sign out</button></div><small class="field-help">Cloud backup stores your Hana data in Firestore under your account. Wallpaper photos stay local; use Export full backup if you also want the wallpaper in your backup file.</small></div></section>`;
}

function openEmailAuth(mode="signin"){
  closeModal("accountWelcomeModal");
  const create=mode==="create";
  document.getElementById("emailAuthMode").value=create?"create":"signin";
  document.getElementById("emailAuthTitle").textContent=create?"Create account":"Sign in";
  document.getElementById("emailAuthEyebrow").textContent=create?"NEW HANA ACCOUNT":"WELCOME BACK";
  document.getElementById("submitEmailAuthButton").textContent=create?"Create account":"Sign in";
  document.getElementById("accountConfirmPasswordWrap").classList.toggle("hidden",!create);
  document.getElementById("forgotPasswordButton").classList.toggle("hidden",create);
  document.getElementById("accountPassword").setAttribute("autocomplete",create?"new-password":"current-password");
  document.getElementById("accountPassword").value="";
  document.getElementById("accountConfirmPassword").value="";
  document.getElementById("emailAuthMessage").classList.add("hidden");
  document.getElementById("emailAuthMessage").textContent="";
  openModal("emailAuthModal");
  setTimeout(()=>document.getElementById("accountEmail")?.focus(),80);
}

function setAuthMessage(message,type="error"){
  const el=document.getElementById("emailAuthMessage");if(!el)return;
  el.textContent=message;el.dataset.type=type;el.classList.toggle("hidden",!message);
}

function markAuthActionPending(){
  authActionPending=true;
  try{sessionStorage.setItem("hana_auth_flow_pending","1");}catch{}
  state.settings.accountPromptSeen=true;
  saveState({snapshot:false});
}

async function submitEmailAuth(){
  if(cloudOperationBusy)return;
  const mode=document.getElementById("emailAuthMode").value||"signin";
  const email=document.getElementById("accountEmail").value.trim();
  const password=document.getElementById("accountPassword").value;
  const confirmPassword=document.getElementById("accountConfirmPassword").value;
  if(!email||!password)return setAuthMessage("Enter your email and password.");
  if(mode==="create"&&password!==confirmPassword)return setAuthMessage("The two passwords don't match.");
  cloudOperationBusy=true;setAuthMessage(mode==="create"?"Creating your account…":"Signing you in…","info");
  try{
    const fb=await firebaseReady();markAuthActionPending();
    if(mode==="create")await fb.createEmailAccount(email,password);else await fb.signInEmail(email,password);
    closeModal("emailAuthModal");
  }catch(error){setAuthMessage(firebaseFriendlyError(error));authActionPending=false;try{sessionStorage.removeItem("hana_auth_flow_pending");}catch{}}
  finally{cloudOperationBusy=false;}
}

async function beginGoogleSignIn(){
  if(cloudOperationBusy)return;
  cloudOperationBusy=true;
  closeModal("accountWelcomeModal");
  showToast("Opening Google sign-in…");
  try{const fb=await firebaseReady();markAuthActionPending();await fb.signInGoogle();}
  catch(error){authActionPending=false;try{sessionStorage.removeItem("hana_auth_flow_pending");}catch{}showToast(firebaseFriendlyError(error));}
  finally{cloudOperationBusy=false;}
}

async function sendHanaPasswordReset(){
  const email=document.getElementById("accountEmail").value.trim();
  if(!email)return setAuthMessage("Enter your email first, then tap Forgot password.");
  try{const fb=await firebaseReady();await fb.resetPassword(email);setAuthMessage("Password reset email sent. Check your inbox.","success");}
  catch(error){setAuthMessage(firebaseFriendlyError(error));}
}

function buildCloudBackupPayload(){
  const snapshot=clone(state);
  snapshot.currentPage="today";
  snapshot.taskSearch="";
  snapshot.calendarDragTaskId="";
  snapshot.returnRitualPending=false;
  return {hanaCloudBackup:true,formatVersion:1,appVersion:HANA_APP_VERSION,savedAt:new Date().toISOString(),state:snapshot};
}

async function refreshCloudMeta(options={}){
  const user=hanaAccountState.user;if(!user)return null;
  try{
    const fb=await firebaseReady();
    hanaAccountState.meta=await fb.getCloudMeta(user.uid);
    if(state.currentPage==="settings")renderSettings();
    return hanaAccountState.meta;
  }catch(error){if(!options.quiet)showToast(firebaseFriendlyError(error));return null;}
}

async function backupHanaToCloud(options={}){
  const user=hanaAccountState.user;if(!user){openModal("accountWelcomeModal");return false;}
  if(cloudOperationBusy)return false;
  if(options.confirmReplace&&hanaAccountState.meta&&!confirm("Replace your existing Hana cloud backup with the data on this device?"))return false;
  cloudOperationBusy=true;showToast("Backing up Hana to cloud…");
  try{
    const fb=await firebaseReady();
    const meta=await fb.backupSnapshot(user.uid,buildCloudBackupPayload());
    hanaAccountState.meta=meta;
    showToast("Hana cloud backup updated ☁️🌸");
    if(state.currentPage==="settings")renderSettings();
    return true;
  }catch(error){console.error("Cloud backup failed:",error);showToast(firebaseFriendlyError(error));return false;}
  finally{cloudOperationBusy=false;}
}

async function restoreHanaFromCloud(options={}){
  const user=hanaAccountState.user;if(!user)return false;
  if(cloudOperationBusy)return false;
  if(options.confirm!==false&&!confirm("Restore your Hana cloud backup to this device? Your current local data will be saved as a safety copy first."))return false;
  cloudOperationBusy=true;showToast("Restoring Hana from cloud…");
  try{
    const fb=await firebaseReady();
    const restored=await fb.restoreSnapshot(user.uid);
    const cloudState=restored?.payload?.hanaCloudBackup?restored.payload.state:restored?.payload?.state;
    if(!cloudState||!isLikelyHanaState(cloudState))throw new Error("This cloud backup does not look like valid Hana data.");
    await createSafetySnapshot("pre-cloud-restore",JSON.stringify(state),{force:true});
    await ensureWallpaperLoaded();
    state=normalizeState(cloudState);
    state.settings.accountPromptSeen=true;
    if(!hanaWallpaperData)state.appearance.wallpaperEnabled=false;
    lastSavedStateJSON="";
    saveState({snapshot:false});
    await createSafetySnapshot("post-cloud-restore",JSON.stringify(state),{force:true});
    hanaAccountState.meta=restored.meta;
    await applyAppearance();
    render();
    showToast("Hana restored from cloud ☁️🌸");
    return true;
  }catch(error){console.error("Cloud restore failed:",error);showToast(firebaseFriendlyError(error));return false;}
  finally{cloudOperationBusy=false;}
}

async function openCloudChoiceForUser(){
  const user=hanaAccountState.user;if(!user)return;
  const meta=await refreshCloudMeta({quiet:true});
  document.getElementById("cloudChoiceAccount").innerHTML=`<div class="account-avatar">${user.photoURL?`<img src="${escapeHTML(user.photoURL)}" alt="" referrerpolicy="no-referrer" />`:"🌸"}</div><div><strong>${escapeHTML(accountDisplayName(user))}</strong><small>${escapeHTML(user.email||"")}</small></div>`;
  const metaBox=document.getElementById("cloudChoiceMeta");
  const restoreButton=document.getElementById("cloudChoiceRestoreButton");
  const backupButton=document.getElementById("cloudChoiceBackupButton");
  if(meta){
    metaBox.innerHTML=`<span>Cloud backup found</span><strong>${escapeHTML(cloudMetaLabel(meta))}</strong>`;
    restoreButton.classList.remove("hidden");
    backupButton.textContent="Use this device & replace cloud backup";
    document.getElementById("cloudChoiceMessage").textContent="Hana found both this device's data and a cloud backup. Choose which copy you want to keep. Nothing is replaced automatically.";
  }else{
    metaBox.innerHTML=`<span>No cloud backup yet</span><strong>This device can become your first backup.</strong>`;
    restoreButton.classList.add("hidden");
    backupButton.textContent="Back up this device";
    document.getElementById("cloudChoiceMessage").textContent="You're signed in. Hana can now save an independent cloud backup of the data on this device.";
  }
  openModal("cloudChoiceModal");
}

async function handleAuthChanged(user){
  hanaAccountState.user=user||null;
  hanaAccountState.status="ready";
  hanaAccountState.error="";
  if(user){
    state.settings.accountPromptSeen=true;saveState({snapshot:false});
    await refreshCloudMeta({quiet:true});
    let pending=authActionPending;try{pending=pending||sessionStorage.getItem("hana_auth_flow_pending")==="1";}catch{}
    if(pending){authActionPending=false;try{sessionStorage.removeItem("hana_auth_flow_pending");}catch{};setTimeout(openCloudChoiceForUser,100);}
  }else{hanaAccountState.meta=null;}
  if(state.currentPage==="settings")renderSettings();
}

async function initHanaFirebase(){
  if(firebaseAuthListenerInstalled)return;
  firebaseAuthListenerInstalled=true;
  window.addEventListener("hana:auth-changed",event=>handleAuthChanged(event.detail));
  try{
    const fb=await firebaseReady();
    hanaAccountState.status="ready";
    await handleAuthChanged(fb.user||null);
  }catch(error){hanaAccountState.status="unavailable";hanaAccountState.error=firebaseFriendlyError(error);if(state.currentPage==="settings")renderSettings();}
}

function continueWithoutAccount(){
  state.settings.accountPromptSeen=true;saveState({snapshot:false});closeModal("accountWelcomeModal");maybeOpenFirstRunTutorial();
}

async function signOutHanaAccount(){
  try{const fb=await firebaseReady();await fb.signOut();hanaAccountState.user=null;hanaAccountState.meta=null;showToast("Signed out. Your local Hana data stays on this device.");if(state.currentPage==="settings")renderSettings();}
  catch(error){showToast(firebaseFriendlyError(error));}
}

async function startAccountOnboarding(){
  await initHanaFirebase();
  if(hanaAccountState.user){state.settings.accountPromptSeen=true;saveState({snapshot:false});maybeOpenFirstRunTutorial();return;}
  if(hanaAccountState.status==="unavailable"){maybeOpenFirstRunTutorial();return;}
  if(state.settings.accountPromptSeen===false)setTimeout(()=>openModal("accountWelcomeModal"),180);else maybeOpenFirstRunTutorial();
}

/* ================= MORE / SETTINGS / BACKUP ================= */

function renderSettings(){const c=document.getElementById("pageContent");c.innerHTML=`
  <div class="page-heading settings-page-heading"><p class="eyebrow">MAKE HANA YOURS</p><h1>Settings & spaces</h1><p>Customization and app controls live here so your everyday screens can stay calm.</p></div>

  ${renderAccountSettingsCard()}

  <section class="section settings-section"><div class="section-header"><h2>Bottom navigation</h2></div><div class="settings-card"><h3>Your everyday tabs ✨</h3><p>Today, Tasks and + stay fixed. Choose the two shortcuts that appear on the right side of the bottom bar.</p><div class="settings-inline bottom-nav-settings"><div class="form-group"><label for="bottomNavSlot1Setting">Slot 1</label><select id="bottomNavSlot1Setting">${bottomNavOptionsHTML(state.settings.bottomNav?.[0]||"lists")}</select></div><div class="form-group"><label for="bottomNavSlot2Setting">Slot 2</label><select id="bottomNavSlot2Setting">${bottomNavOptionsHTML(state.settings.bottomNav?.[1]||"calendar")}</select></div></div><div class="settings-button-row"><button class="primary-button" data-save-bottom-nav>Save navigation</button><button class="secondary-button" data-restore-bottom-nav>Restore default</button></div><small class="field-help">Default: Today · Tasks · + · Lists · Calendar</small></div></section>

  <section class="section settings-section"><div class="section-header"><h2>Help & tutorial</h2></div><div class="settings-card tutorial-settings-card"><div><h3>New to Hana? 🌸</h3><p>Take the guided tour of the main sections and learn what each part is for.</p></div><button class="secondary-button" data-open-tutorial>Open app tutorial</button></div></section>

  <section class="section settings-section"><div class="section-header"><h2>Birthday shortcuts</h2></div><div class="settings-card"><h3>Your birthday people 🎂</h3><p>These names appear when you use the Birthday shortcut. Add, rename or remove them anytime.</p><div class="form-group"><label for="birthdayLabelsSetting">Birthday presets</label><input id="birthdayLabelsSetting" type="text" value="${escapeHTML(birthdayLabels().join(', '))}" placeholder="Me, Partner, Mom, Dad, Other" /></div><small class="field-help">Separate names with commas. “Other” gives you a free-text name field when creating a birthday.</small><button class="secondary-button" data-save-birthday-labels>Save birthday shortcuts</button></div></section>

  <section id="spaceManagerSection" class="section settings-section"><div class="section-header"><h2>Spaces</h2></div><div class="settings-card">
    <h3>Your categories 🌷</h3><p>Every space is yours. Rename it, change the emoji, reorder it, or remove it. Hana only keeps one rule: at least one space must remain.</p>
    <div class="space-manager-list">${state.spaces.map((space,index)=>`<div class="space-manager-row"><span class="space-manager-label">${escapeHTML(space.emoji)} <strong>${escapeHTML(space.name)}</strong></span><div class="space-manager-actions"><button class="space-order-button" data-move-space="${escapeHTML(space.id)}" data-direction="up" ${index===0?"disabled":""} aria-label="Move ${escapeHTML(space.name)} up">↑</button><button class="space-order-button" data-move-space="${escapeHTML(space.id)}" data-direction="down" ${index===state.spaces.length-1?"disabled":""} aria-label="Move ${escapeHTML(space.name)} down">↓</button><button class="text-button" data-edit-space="${escapeHTML(space.id)}">Edit</button><button class="text-button danger-text" data-delete-space="${escapeHTML(space.id)}" ${state.spaces.length===1?"disabled":""}>Remove</button></div></div>`).join("")}</div>
    <div class="space-add-row"><input id="newSpaceEmoji" type="text" maxlength="4" value="🌸" aria-label="Space icon" /><input id="newSpaceName" type="text" placeholder="New space name" /><button class="secondary-button" id="addSpaceButton">Add space</button></div>
  </div></section>

  <section class="section settings-section"><div class="section-header"><h2>Planning</h2></div><div class="settings-card"><h3>Bloom Budget 🌷</h3><p>Choose how much task time you realistically want in one day's Focus Bouquet. Tasks without an estimate count as 30 minutes.</p><div class="form-group"><label for="dailyCapacitySetting">Daily task capacity</label><div class="inline-field"><input id="dailyCapacitySetting" type="number" min="30" max="960" step="30" value="${Math.max(30,Number(state.settings.dailyCapacityMinutes||240))}" /><span>minutes</span></div></div><label class="check-row"><input id="overloadGuardrailSetting" type="checkbox" ${state.settings.overloadGuardrail!==false?"checked":""}/><span>Warn me before I overfill today's bouquet<small>You can still override Hana when a day genuinely needs to be full.</small></span></label><div class="form-group"><label for="defaultSpaceSetting">Default space</label><select id="defaultSpaceSetting">${spaceOptionsHTML(state.settings.defaultSpace)}</select></div></div></section>

  <section class="section settings-section"><div class="section-header"><h2>Boundary Firewall</h2></div><div class="settings-card"><h3>Protect personal time 🌙</h3><p>Choose any space that Hana should hide outside its schedule.</p><div class="form-group"><label for="workFirewallSpaceSetting">Protected space</label><select id="workFirewallSpaceSetting"><option value="">None</option>${spaceOptionsHTML(state.settings.workFirewallSpaceId)}</select></div><label class="check-row"><input id="firewallEnabled" type="checkbox" ${state.settings.workFirewallEnabled?"checked":""}/><span>Enable Boundary Firewall</span></label><div class="settings-inline"><div class="form-group"><label>Window starts</label><input id="workStartSetting" type="time" value="${state.settings.workStart}" /></div><div class="form-group"><label>Window ends</label><input id="workEndSetting" type="time" value="${state.settings.workEnd}" /></div></div><label class="check-row"><input id="allowUrgentWorkSetting" type="checkbox" ${state.settings.allowHighPriorityWorkReminders?"checked":""}/><span>Allow high-priority linked reminders from the protected space outside the window</span></label><button id="saveSettingsButton" class="primary-button full-width">Save settings</button></div></section>

  <section class="section settings-section"><div class="section-header"><h2>Backup & restore</h2></div><div class="settings-card backup-card"><h3>Your Hana safety net 🌸</h3><p>Hana saves changes locally as you use the app and also keeps up to ${MAX_SAFETY_SNAPSHOTS} rolling safety copies on this device. For protection outside this device, sign in for optional Firebase cloud backup or export a full JSON backup to iCloud Drive, Google Drive, or your computer.</p><div class="backup-status-grid"><div><span>Automatic safety copies</span><strong>On</strong></div><div><span>Latest safety copy</span><strong>${backupMetaLabel()}</strong></div><div><span>Last exported file</span><strong>${lastExportLabel()}</strong></div></div><div class="data-actions backup-actions"><button id="exportDataButton" class="primary-button">Export full backup</button><button id="importDataButton" class="secondary-button">Import backup</button><button id="createSafetyBackupButton" class="secondary-button">Make safety copy now</button><button id="restoreSafetyBackupButton" class="secondary-button">Restore latest safety copy</button></div><small class="field-help">Automatic safety copies are still stored on this device. The exported JSON file is the independent backup you can keep somewhere else.</small></div></section>`;}

// Legacy route kept so users who update while sitting on the old More page land safely in Settings.
function renderMore(){ renderSettings(); }

function saveBirthdayLabels(){
  const raw=document.getElementById("birthdayLabelsSetting")?.value||"";
  const labels=[...new Set(raw.split(",").map(value=>value.trim()).filter(Boolean))].slice(0,10);
  state.settings.birthdayLabels=labels.length?labels:["Me","Partner","Mom","Dad","Other"];
  showToast("Birthday shortcuts saved 🎂");
  render();
}

function saveSettings(){const selected=document.getElementById("defaultSpaceSetting")?.value;state.settings.defaultSpace=state.spaces.some(space=>space.id===selected)?selected:(state.spaces[0]?.id||"");state.settings.dailyCapacityMinutes=Math.max(30,Math.min(960,Number(document.getElementById("dailyCapacitySetting")?.value||240)));state.settings.overloadGuardrail=Boolean(document.getElementById("overloadGuardrailSetting")?.checked);const firewallSpace=document.getElementById("workFirewallSpaceSetting")?.value||"";state.settings.workFirewallSpaceId=state.spaces.some(space=>space.id===firewallSpace)?firewallSpace:"";state.settings.workFirewallEnabled=Boolean(document.getElementById("firewallEnabled")?.checked&&state.settings.workFirewallSpaceId);state.settings.workStart=document.getElementById("workStartSetting").value||"08:00";state.settings.workEnd=document.getElementById("workEndSetting").value||"18:00";state.settings.allowHighPriorityWorkReminders=document.getElementById("allowUrgentWorkSetting").checked;showToast("Hana settings saved 🌷");render();}

function addCustomSpace(){const name=document.getElementById("newSpaceName")?.value.trim();const emoji=document.getElementById("newSpaceEmoji")?.value.trim()||"🌸";if(!name)return showToast("Give the space a name 🌸");const id=`space-${name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,24)||"custom"}-${Math.random().toString(36).slice(2,6)}`;state.spaces.push(normalizeSpace({id,name,emoji}));showToast(`${emoji} ${name} added`);render();}
function editSpace(spaceId){const space=state.spaces.find(item=>item.id===spaceId);if(!space)return;const name=prompt("Space name",space.name);if(name===null)return;const cleanName=name.trim();if(!cleanName)return showToast("Space name can't be empty.");const emoji=prompt("Space icon / emoji",space.emoji);if(emoji===null)return;space.name=cleanName;space.emoji=(emoji.trim()||"🌸").slice(0,4);showToast("Space updated 🌷");render();}
function moveSpace(spaceId,direction){const index=state.spaces.findIndex(space=>space.id===spaceId);if(index<0)return;const nextIndex=direction==="up"?index-1:index+1;if(nextIndex<0||nextIndex>=state.spaces.length)return;[state.spaces[index],state.spaces[nextIndex]]=[state.spaces[nextIndex],state.spaces[index]];showToast("Space order updated 🌷");render();}
function deleteSpace(spaceId){const space=state.spaces.find(item=>item.id===spaceId);if(!space)return;if(state.spaces.length<=1)return showToast("Keep at least one space in Hana 🌸");const replacement=state.spaces.find(item=>item.id!==spaceId);if(!replacement)return;const affected=[state.tasks,state.notes,state.reminders,state.events,state.tables,state.lists,state.pins,state.inbox,state.futureNotes,state.threads,state.tinyWins,state.projects].reduce((count,collection)=>count+collection.filter(item=>item?.space===spaceId).length,0);const message=affected?`Remove “${space.name}”? ${affected} item${affected===1?"":"s"} will move to ${replacement.emoji} ${replacement.name}.`:`Remove “${space.name}”?`;if(!confirm(message))return;[state.tasks,state.notes,state.reminders,state.events,state.tables,state.lists,state.pins,state.inbox,state.futureNotes,state.threads,state.tinyWins,state.projects].forEach(collection=>collection.forEach(item=>{if(item?.space===spaceId)item.space=replacement.id;}));state.spaces=state.spaces.filter(item=>item.id!==spaceId);if(state.settings.defaultSpace===spaceId)state.settings.defaultSpace=replacement.id;if(state.settings.workFirewallSpaceId===spaceId){state.settings.workFirewallSpaceId="";state.settings.workFirewallEnabled=false;}if(state.currentMode===spaceId)state.currentMode="all";showToast(`Space removed; its items moved to ${replacement.name}.`);render();}

/* ================= AUTOMATIC SAFETY BACKUPS ================= */

function openSafetyBackupDB(){
  return new Promise((resolve,reject)=>{
    if(!("indexedDB" in window))return reject(new Error("IndexedDB unavailable"));
    const request=indexedDB.open(BACKUP_DB_NAME,1);
    request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(BACKUP_STORE_NAME))db.createObjectStore(BACKUP_STORE_NAME,{keyPath:"id"});};
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error||new Error("Unable to open Hana backup storage"));
  });
}
async function getSafetySnapshots(){
  const db=await openSafetyBackupDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(BACKUP_STORE_NAME,"readonly");
    const request=tx.objectStore(BACKUP_STORE_NAME).getAll();
    request.onsuccess=()=>resolve((request.result||[]).sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0)));
    request.onerror=()=>reject(request.error);
    tx.oncomplete=()=>db.close();
  });
}
async function createSafetySnapshot(reason="auto",stateJson="",options={}){
  try{
    const json=stateJson||JSON.stringify(state);
    const existing=await getSafetySnapshots().catch(()=>[]);
    if(!options.force&&existing[0]?.stateJson===json)return existing[0];
    const record={id:createId(),createdAt:Date.now(),reason,stateJson:json};
    const db=await openSafetyBackupDB();
    await new Promise((resolve,reject)=>{
      const tx=db.transaction(BACKUP_STORE_NAME,"readwrite");
      tx.objectStore(BACKUP_STORE_NAME).put(record);
      tx.oncomplete=()=>{db.close();resolve(true);};
      tx.onerror=()=>{db.close();reject(tx.error);};
    });
    const all=await getSafetySnapshots();
    const extras=all.slice(MAX_SAFETY_SNAPSHOTS);
    if(extras.length){
      const trimDB=await openSafetyBackupDB();
      await new Promise((resolve,reject)=>{
        const tx=trimDB.transaction(BACKUP_STORE_NAME,"readwrite");
        extras.forEach(item=>tx.objectStore(BACKUP_STORE_NAME).delete(item.id));
        tx.oncomplete=()=>{trimDB.close();resolve(true);};
        tx.onerror=()=>{trimDB.close();reject(tx.error);};
      });
    }
    try{localStorage.setItem(BACKUP_META_KEY,JSON.stringify({lastAt:record.createdAt,count:Math.min(all.length,MAX_SAFETY_SNAPSHOTS)}));}catch{}
    return record;
  }catch(error){
    console.warn("Hana safety backup unavailable:",error);
    return null;
  }
}
function queueSafetySnapshot(json){
  queuedSafetyStateJSON=json;
  clearTimeout(safetySnapshotTimer);
  safetySnapshotTimer=setTimeout(()=>{
    const snapshotJSON=queuedSafetyStateJSON;
    queuedSafetyStateJSON="";
    createSafetySnapshot("auto",snapshotJSON);
  },1400);
}
async function restoreSafetySnapshotRecord(record,options={}){
  try{
    if(!record?.stateJson)return false;
    const parsed=JSON.parse(record.stateJson);
    if(!isLikelyHanaState(parsed))return false;
    state=normalizeState(parsed);
    state.lastOpenedDate=todayISO();
    lastSavedStateJSON="";
    saveState({snapshot:false});
    await applyAppearance();
    render();
    if(!options.quiet)showToast("Safety copy restored 🌸");
    return true;
  }catch(error){
    console.warn("Unable to restore Hana safety copy:",error);
    if(!options.quiet)showToast("No usable safety copy was found.");
    return false;
  }
}
async function restoreLatestSafetySnapshot(options={}){
  try{
    const latest=(await getSafetySnapshots())[0];
    if(!latest)return false;
    return await restoreSafetySnapshotRecord(latest,options);
  }catch(error){
    console.warn("Unable to read Hana safety copies:",error);
    if(!options.quiet)showToast("No usable safety copy was found.");
    return false;
  }
}
async function maybeRecoverFromSafetySnapshot(){
  if(!safetyRecoveryPending)return false;
  let recovered=false;
  try{
    recovered=await restoreLatestSafetySnapshot({quiet:true});
    if(recovered)showToast(stateLoadStatus==="corrupt"?"Hana recovered your data from a safety copy 🌸":"Hana restored your local safety copy 🌸");
    return recovered;
  }finally{
    safetyRecoveryPending=false;
    if(lastSavedStateJSON)queueSafetySnapshot(lastSavedStateJSON);
  }
}
async function makeSafetyCopyNow(){
  const record=await createSafetySnapshot("manual",JSON.stringify(state),{force:true});
  if(record){showToast("Safety copy created 🌸");render();}
  else showToast("Hana could not create a safety copy on this device.");
}
async function restoreSafetyCopyFromSettings(){
  const snapshots=await getSafetySnapshots().catch(()=>[]);
  if(!snapshots.length)return showToast("No safety copy exists yet.");
  const target=snapshots[0];
  const date=new Date(Number(target.createdAt||0)).toLocaleString();
  if(!confirm(`Restore the latest safety copy from ${date}? Your current data will be saved as a new safety copy first.`))return;
  await createSafetySnapshot("pre-restore",JSON.stringify(state),{force:true});
  await restoreSafetySnapshotRecord(target);
  await createSafetySnapshot("post-restore",JSON.stringify(state),{force:true});
}

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

function backupMetaLabel(){
  try {
    const meta=JSON.parse(localStorage.getItem(BACKUP_META_KEY)||"null");
    if(!meta?.lastAt)return "Not yet";
    return new Date(Number(meta.lastAt)).toLocaleString(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});
  } catch { return "Not yet"; }
}
function lastExportLabel(){
  try {
    const at=Number(localStorage.getItem(LAST_EXPORT_KEY)||0);
    return at?new Date(at).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"}):"Not yet";
  } catch { return "Not yet"; }
}
function isLikelyHanaState(value){
  return Boolean(value&&typeof value==="object"&&["tasks","notes","reminders","tables","spaces","settings","lists","events","projects"].some(key=>Object.prototype.hasOwnProperty.call(value,key)));
}
async function exportData(){
  try {
    await ensureWallpaperLoaded();
    const payload={
      hanaBackup:true,
      formatVersion:2,
      exportedAt:new Date().toISOString(),
      state:clone(state),
      media:{wallpaper:hanaWallpaperData||null}
    };
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    const now=new Date();
    const stamp=`${localDateISO(now)}-${String(now.getHours()).padStart(2,"0")}${String(now.getMinutes()).padStart(2,"0")}`;
    a.download=`hana-full-backup-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
    try{localStorage.setItem(LAST_EXPORT_KEY,String(Date.now()));}catch{}
    showToast("Full Hana backup exported 🌸");
  } catch(error){
    console.error("Backup export failed:",error);
    showToast("Hana could not create the backup file.");
  }
}
async function importData(file){
  if(!file)return;
  try{
    const parsed=JSON.parse(await file.text());
    const backupState=parsed?.hanaBackup&&parsed?.state?parsed.state:parsed;
    const backupWallpaper=parsed?.hanaBackup?parsed?.media?.wallpaper:null;
    if(!isLikelyHanaState(backupState))throw new Error("Invalid Hana backup");
    if(!confirm("Replace the current local Hana data with this backup? Hana will make a safety copy of your current data first."))return;
    await createSafetySnapshot("pre-import",JSON.stringify(state),{force:true});
    state=normalizeState(backupState);
    lastSavedStateJSON="";
    saveState({snapshot:false});
    if(parsed?.hanaBackup){
      if(typeof backupWallpaper==="string"&&backupWallpaper.startsWith("data:image/")){
        hanaWallpaperData=backupWallpaper;
        await mediaPut("wallpaper",backupWallpaper);
      }else{
        hanaWallpaperData=null;
        await mediaDelete("wallpaper").catch(()=>{});
        state.appearance.wallpaperEnabled=false;
        lastSavedStateJSON="";
        saveState({snapshot:false});
      }
    }
    await createSafetySnapshot("post-import",JSON.stringify(state),{force:true});
    await applyAppearance();
    showToast("Hana backup restored 🌸");
    render();
  }catch(error){
    console.error(error);
    showToast("That file doesn't look like a valid Hana backup.");
  }finally{
    const input=document.getElementById("importBackupInput");if(input)input.value="";
  }
}

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
  if(event.target.closest("[data-tutorial-next]")){tutorialNext();return;}
  if(event.target.closest("[data-tutorial-back]")){tutorialBack();return;}
  if(event.target.closest("[data-tutorial-skip]")){finishTutorial();return;}
  if(event.target.closest("[data-open-tutorial]")){openTutorial();return;}
  if(event.target.closest("[data-auth-google]")){beginGoogleSignIn();return;}
  const authEmail=event.target.closest("[data-auth-email-mode]");if(authEmail){openEmailAuth(authEmail.dataset.authEmailMode||"signin");return;}
  if(event.target.closest("[data-submit-email-auth]")){submitEmailAuth();return;}
  if(event.target.closest("[data-forgot-password]")){sendHanaPasswordReset();return;}
  if(event.target.closest("[data-continue-local]")){continueWithoutAccount();return;}
  if(event.target.closest("[data-auth-signout]")){signOutHanaAccount();return;}
  if(event.target.closest("[data-cloud-backup-now]")){backupHanaToCloud({confirmReplace:true});return;}
  if(event.target.closest("[data-cloud-restore-now]")){restoreHanaFromCloud();return;}
  if(event.target.closest("[data-refresh-cloud-meta]")){refreshCloudMeta();return;}
  if(event.target.closest("[data-retry-firebase]")){firebaseAuthListenerInstalled=false;hanaAccountState.status="loading";renderSettings();initHanaFirebase();return;}
  const cloudChoice=event.target.closest("[data-cloud-choice]");if(cloudChoice){const choice=cloudChoice.dataset.cloudChoice;if(choice==="backup"){closeModal("cloudChoiceModal");backupHanaToCloud({confirmReplace:false}).then(()=>maybeOpenFirstRunTutorial());}else if(choice==="restore"){closeModal("cloudChoiceModal");restoreHanaFromCloud({confirm:false}).then(()=>maybeOpenFirstRunTutorial());}else{closeModal("cloudChoiceModal");maybeOpenFirstRunTutorial();}return;}
  if(event.target.closest("[data-save-bottom-nav]")){saveBottomNavigation();return;}
  if(event.target.closest("[data-restore-bottom-nav]")){restoreBottomNavigation();return;}
  if(event.target.closest("[data-edit-quick-access]")){openQuickAccessEditor();return;}
  const closeDrawer=event.target.closest("[data-close-nav-drawer]");if(closeDrawer){closeNavDrawer();return;}
  const enableNotifications=event.target.closest("[data-enable-notifications]");if(enableNotifications){closeNavDrawer();requestNotificationPermission();return;}
  const nav=event.target.closest("[data-page]");if(nav&&!nav.classList.contains("nav-center-placeholder")){changePage(nav.dataset.page);return;}
  if(event.target.closest("[data-undo-toast]")){if(lastUndoAction){const action=lastUndoAction;lastUndoAction=null;action();}return;}
  const goto=event.target.closest("[data-goto]");if(goto){closeModal("addMenu");closeNavDrawer();changePage(goto.dataset.goto);return;}
  const mode=event.target.closest("[data-mode]");if(mode){state.currentMode=mode.dataset.mode;render();return;}
  const open=event.target.closest("[data-open]");if(open){const id=open.dataset.open;if(id==="taskModal")openTaskModal();else if(id==="noteModal")openNoteModal();else if(id==="reminderModal")openReminderModal();else if(id==="tableModal")openTableModal();else openModal(id);return;}
  const close=event.target.closest("[data-close-modal]");if(close){closeModal(close.dataset.closeModal);return;}

  if(event.target.closest("[data-new-event]")){openEventModal();return;}
  if(event.target.closest("[data-save-birthday-labels]")){saveBirthdayLabels();return;}
  const editEvent=event.target.closest("[data-edit-event]");if(editEvent){openEventModal(editEvent.dataset.editEvent);return;}
  const addEventDate=event.target.closest("[data-add-event-date]");if(addEventDate){openEventModal("",{date:addEventDate.dataset.addEventDate});return;}
  const addEventSlot=event.target.closest("[data-add-event-slot]");if(addEventSlot){openEventModal("",{date:addEventSlot.dataset.date,startTime:addEventSlot.dataset.time});return;}
  const calDay=event.target.closest("[data-calendar-day]");if(calDay){state.calendarCursor=calDay.dataset.calendarDay;state.calendarView="day";render();return;}
  const calView=event.target.closest("[data-calendar-view]");if(calView){state.calendarView=calView.dataset.calendarView;render();return;}
  if(event.target.closest("[data-calendar-prev]")){calendarCursorMove(-1);return;}
  if(event.target.closest("[data-calendar-next]")){calendarCursorMove(1);return;}
  if(event.target.closest("[data-calendar-today]")){state.calendarCursor=todayISO();render();return;}
  if(event.target.closest("[data-auto-plan-day]")){autoPlanBouquet();return;}
  const planTask=event.target.closest("[data-plan-task]");if(planTask){openScheduleTaskModal(planTask.dataset.planTask,planTask.dataset.planDate);return;}
  const newDateTask=event.target.closest("[data-new-task-for-date]");if(newDateTask){openTaskModal();setTimeout(()=>{document.getElementById("taskDate").value=newDateTask.dataset.newTaskForDate;document.getElementById("taskScheduledDate").value=newDateTask.dataset.newTaskForDate;},20);return;}
  if(event.target.closest("[data-new-project]")){openProjectModal();return;}
  const selectProject=event.target.closest("[data-select-project]");if(selectProject){state.activeProjectId=selectProject.dataset.selectProject;render();return;}
  const editProject=event.target.closest("[data-edit-project]");if(editProject){openProjectModal(editProject.dataset.editProject);return;}
  const newMilestone=event.target.closest("[data-new-milestone]");if(newMilestone){openMilestoneModal(newMilestone.dataset.newMilestone);return;}
  const editMilestone=event.target.closest("[data-edit-milestone]");if(editMilestone){openMilestoneModal(editMilestone.dataset.projectId,editMilestone.dataset.editMilestone);return;}
  const newProjectTask=event.target.closest("[data-new-project-task]");if(newProjectTask){openTaskModal();setTimeout(()=>{document.getElementById("taskProject").value=newProjectTask.dataset.newProjectTask;refreshTaskMilestoneOptions(newProjectTask.dataset.newProjectTask);},20);return;}
  const newProjectNote=event.target.closest("[data-new-project-note]");if(newProjectNote){openNoteModal();setTimeout(()=>document.getElementById("noteProject").value=newProjectNote.dataset.newProjectNote,20);return;}
  const newProjectTable=event.target.closest("[data-new-project-table]");if(newProjectTable){openTableModal();setTimeout(()=>document.getElementById("tableProject").value=newProjectTable.dataset.newProjectTable,20);return;}
  const openProjectTable=event.target.closest("[data-open-project-table]");if(openProjectTable){state.activeTableId=openProjectTable.dataset.openProjectTable;changePage("tables");return;}
  const gardenProject=event.target.closest("[data-open-garden-project]");if(gardenProject){state.activeProjectId=gardenProject.dataset.openGardenProject;changePage("projects");return;}
  if(event.target.closest("[data-quick-task]")){openQuickTaskModal();return;}
  const editTask=event.target.closest("[data-edit-task]");if(editTask){if(Date.now()<taskGestureSuppressUntil)return;openTaskModal(editTask.dataset.editTask);return;}
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
  const breakdownTask=event.target.closest("[data-breakdown-task]");if(breakdownTask){openBreakdownModal(breakdownTask.dataset.breakdownTask);return;}
  const reflectTask=event.target.closest("[data-reflect-reschedule]");if(reflectTask){openRescheduleReflection(reflectTask.dataset.reflectReschedule);return;}
  const rescheduleReason=event.target.closest("[data-reschedule-reason]");if(rescheduleReason){chooseRescheduleReason(rescheduleReason.dataset.rescheduleReason);return;}
  const rescheduleAction=event.target.closest("[data-reschedule-action]");if(rescheduleAction){rescheduleReflectionAction(rescheduleAction.dataset.rescheduleAction);return;}
  if(event.target.closest("[data-save-intention]")){saveDayIntention();return;}
  if(event.target.closest("[data-apply-recommendations]")){applyBouquetRecommendations();return;}

  const waitingFollow=event.target.closest("[data-follow-up-today]");if(waitingFollow){followUpToday(waitingFollow.dataset.followUpToday);return;}
  const waitingResolved=event.target.closest("[data-waiting-resolved]");if(waitingResolved){resolveWaiting(waitingResolved.dataset.waitingResolved);return;}

  if(event.target.closest("[data-new-future-note]")){openFutureNoteModal();return;}
  const editFuture=event.target.closest("[data-edit-future-note]");if(editFuture){openFutureNoteModal(editFuture.dataset.editFutureNote);return;}
  const futureTask=event.target.closest("[data-future-note-task]");if(futureTask){futureNoteToTask(futureTask.dataset.futureNoteTask);return;}
  const archiveFuture=event.target.closest("[data-archive-future-note]");if(archiveFuture){archiveFutureNote(archiveFuture.dataset.archiveFutureNote);return;}

  if(event.target.closest("[data-new-thread]")){openThreadModal();return;}
  const selectThread=event.target.closest("[data-select-thread]");if(selectThread){state.activeThreadId=selectThread.dataset.selectThread;render();return;}
  const editThread=event.target.closest("[data-edit-thread]");if(editThread){openThreadModal(editThread.dataset.editThread);return;}
  const linkThread=event.target.closest("[data-link-thread-item]");if(linkThread){openThreadLinkModal(linkThread.dataset.linkThreadItem);return;}
  const removeThread=event.target.closest("[data-remove-thread-link]");if(removeThread){removeThreadLink(removeThread.dataset.threadOwner,removeThread.dataset.removeThreadLink);return;}
  const openThreadItem=event.target.closest("[data-open-thread-item]");if(openThreadItem){openThreadLinkedItem(openThreadItem.dataset.threadType,openThreadItem.dataset.threadId,openThreadItem.dataset.threadTable);return;}

  const returnAction=event.target.closest("[data-return-action]");if(returnAction){returnRitualAction(returnAction.dataset.taskId,returnAction.dataset.returnAction);return;}
  if(event.target.closest("[data-finish-return]")){finishReturnRitual();return;}

  const editNote=event.target.closest("[data-edit-note]");if(editNote){openNoteModal(editNote.dataset.editNote);return;}
  const noteCheck=event.target.closest("[data-toggle-note-check]");if(noteCheck){toggleNoteCheck(noteCheck.dataset.toggleNoteCheck,noteCheck.dataset.noteCheckId);return;}
  const noteTask=event.target.closest("[data-note-to-task]");if(noteTask){noteToTask(noteTask.dataset.noteToTask);return;}
  const noteActions=event.target.closest("[data-note-actions-to-tasks]");if(noteActions){noteActionsToTasks(noteActions.dataset.noteActionsToTasks);return;}
  const resetNote=event.target.closest("[data-reset-note]");if(resetNote){resetNoteChecklist(resetNote.dataset.resetNote);return;}
  const insert=event.target.closest("[data-note-insert]");if(insert){insertIntoTextarea("noteContent",insert.dataset.noteInsert);return;}

  const editReminder=event.target.closest("[data-edit-reminder]");if(editReminder){openReminderModal(editReminder.dataset.editReminder);return;}
  const completeRem=event.target.closest("[data-complete-reminder]");if(completeRem){completeReminder(completeRem.dataset.completeReminder);return;}
  const snooze=event.target.closest("[data-snooze-reminder]");if(snooze){snoozeReminder(snooze.dataset.snoozeReminder,snooze.dataset.snooze);return;}

  const selectTable=event.target.closest("[data-select-table]");if(selectTable){state.activeTableId=selectTable.dataset.selectTable;const next=state.tables.find(t=>t.id===state.activeTableId);resetTableBulkState(next,false);render();return;}
  const editTable=event.target.closest("[data-edit-table]");if(editTable){openTableModal(editTable.dataset.editTable);return;}
  const addRow=event.target.closest("[data-add-row]");if(addRow){openTableRowModal(addRow.dataset.addRow);return;}
  const toggleQuickRow=event.target.closest("[data-toggle-quick-row]");if(toggleQuickRow){document.getElementById(`quickRow_${toggleQuickRow.dataset.toggleQuickRow}`)?.classList.toggle("hidden");return;}
  const deleteTableButton=event.target.closest("[data-delete-table]");if(deleteTableButton){deleteTable(deleteTableButton.dataset.deleteTable);return;}
  const saveInlineRow=event.target.closest("[data-save-inline-row]");if(saveInlineRow){saveInlineTableRow(saveInlineRow.dataset.saveInlineRow);return;}
  const toggleBulkTable=event.target.closest("[data-toggle-bulk-table]");if(toggleBulkTable){toggleTableBulkMode(toggleBulkTable.dataset.toggleBulkTable);return;}
  const bulkEdit=event.target.closest("[data-bulk-edit]");if(bulkEdit){openBulkTableEdit(bulkEdit.dataset.bulkEdit);return;}
  const bulkCopy=event.target.closest("[data-bulk-copy]");if(bulkCopy){copyBulkTableCells(bulkCopy.dataset.bulkCopy);return;}
  const bulkPaste=event.target.closest("[data-bulk-paste]");if(bulkPaste){openBulkPasteModal(bulkPaste.dataset.bulkPaste);return;}
  const bulkRowTap=event.target.closest("[data-bulk-row]");if(bulkRowTap&&!event.target.closest("input,select,textarea,button,a,label")){const tableId=bulkRowTap.dataset.bulkRow,rowId=bulkRowTap.dataset.rowId,table=state.tables.find(t=>t.id===tableId);if(table){ensureTableBulkState(table);const checkbox=bulkRowTap.querySelector(`[data-bulk-row-toggle="${rowId}"]`);const next=!tableBulkState.selectedRows.has(rowId);if(next)tableBulkState.selectedRows.add(rowId);else tableBulkState.selectedRows.delete(rowId);if(checkbox)checkbox.checked=next;refreshBulkControls(tableId);}return;}
  const removeTableCol=event.target.closest("[data-remove-table-col]");if(removeTableCol){removeTableColumnBuilder(removeTableCol.dataset.removeTableCol);return;}
  const shiftTableCol=event.target.closest("[data-shift-table-col]");if(shiftTableCol){moveTableColumn(shiftTableCol.dataset.colId, shiftTableCol.dataset.shiftTableCol);return;}
  const editRow=event.target.closest("[data-edit-row]");if(editRow){openTableRowModal(editRow.dataset.tableId,editRow.dataset.editRow);return;}
  const rowTask=event.target.closest("[data-row-to-task]");if(rowTask){const t=state.tables.find(t=>t.id===rowTask.dataset.tableId),r=t?.rows.find(r=>r.id===rowTask.dataset.rowToTask);if(t&&r)createTaskFromTableRow(t,r);return;}
  const rowRem=event.target.closest("[data-row-remind]");if(rowRem){const t=state.tables.find(t=>t.id===rowRem.dataset.tableId),r=t?.rows.find(r=>r.id===rowRem.dataset.rowRemind);if(t&&r){createReminderFromTableRow(t,r);render();}return;}

  const selectList=event.target.closest("[data-select-list]");if(selectList){state.activeListId=selectList.dataset.selectList;render();return;}
  if(event.target.closest("[data-open-list]")){openListModal();return;}
  const editList=event.target.closest("[data-edit-list]");if(editList){openListModal(editList.dataset.editList);return;}
  const addListItem=event.target.closest("[data-add-list-item]");if(addListItem){openListItemModal(addListItem.dataset.addListItem);return;}
  const quickAddList=event.target.closest("[data-quick-add-list]");if(quickAddList){quickAddListItems(quickAddList.dataset.quickAddList);return;}
  const editListItem=event.target.closest("[data-edit-list-item]");if(editListItem){openListItemModal(editListItem.dataset.listId,editListItem.dataset.editListItem);return;}
  const toggleList=event.target.closest("[data-toggle-list-item]");if(toggleList){toggleListItem(toggleList.dataset.listId,toggleList.dataset.toggleListItem);return;}
  const listTemplate=event.target.closest("[data-list-template]");if(listTemplate){createListFromTemplate(listTemplate.dataset.listTemplate);return;}
  const clearChecked=event.target.closest("[data-clear-checked]");if(clearChecked){clearCheckedListItems(clearChecked.dataset.clearChecked);return;}
  const resetListButton=event.target.closest("[data-reset-list]");if(resetListButton){resetList(resetListButton.dataset.resetList);return;}

  const openAppearance=event.target.closest("[data-open-appearance]");if(openAppearance){closeNavDrawer();openAppearanceModal();return;}
  const themeChoice=event.target.closest("[data-theme-choice]");if(themeChoice){state.appearance.theme=themeChoice.dataset.themeChoice;saveState();applyAppearance();return;}
  const overlayChoice=event.target.closest("[data-overlay-strength]");if(overlayChoice){state.appearance.overlayStrength=overlayChoice.dataset.overlayStrength;saveState();applyAppearance();return;}
  const manageSpacesButton=event.target.closest("[data-manage-spaces]");if(manageSpacesButton){changePage("settings");setTimeout(()=>document.getElementById("spaceManagerSection")?.scrollIntoView({behavior:"smooth",block:"start"}),80);return;}
  const editSpaceButton=event.target.closest("[data-edit-space]");if(editSpaceButton){editSpace(editSpaceButton.dataset.editSpace);return;}
  const moveSpaceButton=event.target.closest("[data-move-space]");if(moveSpaceButton){moveSpace(moveSpaceButton.dataset.moveSpace,moveSpaceButton.dataset.direction);return;}
  const deleteSpaceButton=event.target.closest("[data-delete-space]");if(deleteSpaceButton){deleteSpace(deleteSpaceButton.dataset.deleteSpace);return;}

  const plant=event.target.closest("[data-plant-inbox]");if(plant){plantInboxItem(plant.dataset.plantInbox);return;}
  const delInbox=event.target.closest("[data-delete-inbox]");if(delInbox){const item=state.inbox.find(i=>i.id===delInbox.dataset.deleteInbox);if(item){moveToTrash("inbox",item);state.inbox=state.inbox.filter(i=>i.id!==delInbox.dataset.deleteInbox);}render();return;}
  if(event.target.closest("[data-plant-all-inbox]")){plantAllInbox();return;}

  const searchResult=event.target.closest("[data-search-type]");if(searchResult){openSearchResult(searchResult.dataset.searchType,searchResult.dataset.searchId,searchResult.dataset.searchPage);return;}

  const daily=event.target.closest("[data-daily-task-action]");if(daily){dailyTaskAction(daily.dataset.taskId,daily.dataset.dailyTaskAction);return;}
  const closeAction=event.target.closest("[data-close-action]");if(closeAction?.dataset.closeAction==="finish"){finishDailyClose();return;}
  if(event.target.closest("[data-add-tiny-win]")){addTinyWin();return;}
  const deleteWin=event.target.closest("[data-delete-tiny-win]");if(deleteWin){deleteTinyWin(deleteWin.dataset.deleteTinyWin);return;}

  const template=event.target.closest("[data-use-template]");if(template){useTemplate(template.dataset.useTemplate);saveState();return;}
  const reopenTaskButton=event.target.closest("[data-reopen-task]");if(reopenTaskButton){reopenTask(reopenTaskButton.dataset.reopenTask);return;}
  const reopenReminderButton=event.target.closest("[data-reopen-reminder]");if(reopenReminderButton){reopenReminder(reopenReminderButton.dataset.reopenReminder);return;}
  const restoreTrashButton=event.target.closest("[data-restore-trash]");if(restoreTrashButton){restoreTrashItem(restoreTrashButton.dataset.restoreTrash);return;}
  const deleteTrashButton=event.target.closest("[data-delete-trash]");if(deleteTrashButton){permanentlyDeleteTrashItem(deleteTrashButton.dataset.deleteTrash);return;}
  if(event.target.closest("[data-empty-trash]")){emptyTrash();return;}

  const delPin=event.target.closest("[data-delete-pin]");if(delPin){deletePin(delPin.dataset.deletePin);return;}
  const delSomeday=event.target.closest("[data-delete-someday]");if(delSomeday){deleteSomeday(delSomeday.dataset.deleteSomeday);return;}

  const empty=event.target.closest("[data-empty-action]");if(empty){const a=empty.dataset.emptyAction;if(a==="open-task")openTaskModal();else if(a==="open-note")openNoteModal();else if(a==="open-reminder")openReminderModal();else if(a==="open-table")openTableModal();else if(a==="open-list")openListModal();else if(a==="open-pin")openModal("pinModal");else if(a==="open-someday")openModal("somedayModal");else if(a==="open-project")openProjectModal();return;}

  const action=event.target.closest("[data-action]");if(action){closeModal("addMenu");const a=action.dataset.action;if(a==="quick-task")openQuickTaskModal();else if(a==="task")openTaskModal();else if(a==="event")openEventModal();else if(a==="birthday")openEventModal("",{birthday:true});else if(a==="note")openNoteModal();else if(a==="future")openFutureNoteModal();else if(a==="reminder")openReminderModal();else if(a==="table"){changePage("tables");setTimeout(()=>openTableModal(),60);}else if(a==="list")openListModal();else if(a==="quick")prepareQuickCapture();else if(a==="pin")openModal("pinModal");else if(a==="someday")openModal("somedayModal");return;}

  if(event.target.id==="brainDumpAddButton"){addBrainDump();return;}
  if(event.target.id==="addSpaceButton"){addCustomSpace();return;}
  if(event.target.id==="chooseWallpaperButton"){document.getElementById("wallpaperInput").click();return;}
  if(event.target.id==="removeWallpaperButton"){removeWallpaper();return;}
  if(event.target.id==="resetAppearanceButton"){if(confirm("Reset Hana's theme and remove the saved wallpaper?"))resetAppearance();return;}
  if(event.target.id==="saveSettingsButton"){saveSettings();return;}
  if(event.target.id==="exportDataButton"){exportData();return;}
  if(event.target.id==="importDataButton"){document.getElementById("importBackupInput").click();return;}
  if(event.target.id==="createSafetyBackupButton"){makeSafetyCopyNow();return;}
  if(event.target.id==="restoreSafetyBackupButton"){restoreSafetyCopyFromSettings();return;}
});

document.addEventListener("input",event=>{if(event.target.id==="taskProject")refreshTaskMilestoneOptions(event.target.value);if(event.target.id==="quickCaptureInput")updateCapturePrediction();if(event.target.id==="noteSearch")searchNotes(event.target.value);if(event.target.id==="globalSearchInput")renderGlobalSearchResults(event.target.value);if(event.target.id==="taskSearch"){state.taskSearch=event.target.value;saveState();const pos=event.target.selectionStart;renderTasks();const input=document.getElementById("taskSearch");if(input){input.focus();input.setSelectionRange(pos,pos);}}});

document.addEventListener("change",event=>{if(event.target.id==="taskProjectFilter"){state.taskProjectFilter=event.target.value;render();}if(event.target.id==="taskRecurrenceType")updateTaskConditionalFields();if(event.target.id==="noteType")updateNoteConditionalFields();if(event.target.id==="reminderRepeat")updateReminderConditionalFields();if(event.target.id==="tableTemplate")applyTableTemplate(event.target.value,true);if(event.target.id==="tableSortMode")updateTableSortFields();if(event.target.id==="wallpaperEnabled"){if(event.target.checked&&!hanaWallpaperData){event.target.checked=false;document.getElementById("wallpaperInput").click();}else{state.appearance.wallpaperEnabled=event.target.checked;saveState();applyAppearance();}}if(event.target.id==="birthdayPerson")syncBirthdayPresetFromPerson();if(event.target.id==="wallpaperPosition"){state.appearance.wallpaperPosition=event.target.value;saveState();applyAppearance();}if(event.target.matches("[data-bulk-row-toggle]")){const tableId=event.target.dataset.tableId,rowId=event.target.dataset.bulkRowToggle,table=state.tables.find(t=>t.id===tableId);if(table){ensureTableBulkState(table);if(event.target.checked)tableBulkState.selectedRows.add(rowId);else tableBulkState.selectedRows.delete(rowId);refreshBulkControls(tableId);}return;}if(event.target.matches("[data-bulk-col-toggle]")){const tableId=event.target.dataset.tableId,colId=event.target.dataset.bulkColToggle,table=state.tables.find(t=>t.id===tableId);if(table){ensureTableBulkState(table);if(event.target.checked)tableBulkState.selectedCols.add(colId);else tableBulkState.selectedCols.delete(colId);refreshBulkControls(tableId);}return;}if(event.target.matches("[data-bulk-select-all-rows]")){const table=state.tables.find(t=>t.id===event.target.dataset.bulkSelectAllRows);if(table){ensureTableBulkState(table);tableBulkState.selectedRows=new Set(event.target.checked?getSortedTableRows(table).map(row=>row.id):[]);document.querySelectorAll(`[data-bulk-row-toggle][data-table-id="${table.id}"]`).forEach(input=>input.checked=event.target.checked);refreshBulkControls(table.id);}return;}if(event.target.matches("[data-bulk-select-all-cols]")){const table=state.tables.find(t=>t.id===event.target.dataset.bulkSelectAllCols);if(table){ensureTableBulkState(table);tableBulkState.selectedCols=new Set(event.target.checked?table.columns.map(col=>col.id):[]);document.querySelectorAll(`[data-bulk-col-toggle][data-table-id="${table.id}"]`).forEach(input=>input.checked=event.target.checked);refreshBulkControls(table.id);}return;}if(event.target.matches("[data-table-check]")){const t=state.tables.find(t=>t.id===event.target.dataset.tableCheck),r=t?.rows.find(r=>r.id===event.target.dataset.rowId);if(r){r.values[event.target.dataset.colId]=event.target.checked;saveState();if(t?.sortMode==="auto"&&t.sortColumnId===event.target.dataset.colId)render();}}});

let tableGesture={row:null,tableId:"",rowId:"",startX:0,startY:0,timer:null,moved:false,longPressed:false};
let lastTableTap={tableId:"",rowId:"",time:0};
function openRowActionMenu(tableId,rowId){
  document.getElementById("rowGestureSheet")?.remove();
  const sheet=document.createElement("div");sheet.id="rowGestureSheet";sheet.className="row-gesture-sheet";sheet.innerHTML=`<div class="row-gesture-card"><div class="action-sheet-handle"></div><strong>Row actions</strong><button data-gesture-edit="${rowId}" data-table-id="${tableId}">✎ Edit row</button><button data-gesture-move="up" data-row-id="${rowId}" data-table-id="${tableId}">↑ Move row up</button><button data-gesture-move="down" data-row-id="${rowId}" data-table-id="${tableId}">↓ Move row down</button><button class="danger-action" data-gesture-delete="${rowId}" data-table-id="${tableId}">🗑 Delete row</button><button data-close-gesture>Cancel</button></div>`;document.body.appendChild(sheet);
}
document.addEventListener("contextmenu",event=>{if(event.target.closest("[data-gesture-row]"))event.preventDefault();});
document.addEventListener("selectstart",event=>{if(event.target.closest("[data-gesture-row]"))event.preventDefault();});
document.addEventListener("click",event=>{const e=event.target.closest("[data-gesture-edit]");if(e){document.getElementById("rowGestureSheet")?.remove();openTableRowModal(e.dataset.tableId,e.dataset.gestureEdit);return;}const m=event.target.closest("[data-gesture-move]");if(m){document.getElementById("rowGestureSheet")?.remove();moveTableRow(m.dataset.tableId,m.dataset.rowId,m.dataset.gestureMove);return;}const d=event.target.closest("[data-gesture-delete]");if(d){document.getElementById("rowGestureSheet")?.remove();deleteTableRow(d.dataset.tableId,d.dataset.gestureDelete);return;}if(event.target.closest("[data-close-gesture]"))document.getElementById("rowGestureSheet")?.remove();});
document.addEventListener("dblclick",event=>{const row=event.target.closest("[data-gesture-row]");if(!row)return;event.preventDefault();openTableRowModal(row.dataset.tableId,row.dataset.gestureRow);});
document.addEventListener("touchstart",event=>{const row=event.target.closest("[data-gesture-row]");if(!row)return;const t=event.touches[0];const tableId=row.dataset.tableId,rowId=row.dataset.gestureRow;tableGesture={row,tableId,rowId,startX:t.clientX,startY:t.clientY,timer:null,moved:false,longPressed:false};tableGesture.timer=setTimeout(()=>{if(!tableGesture.row||tableGesture.moved)return;tableGesture.longPressed=true;lastTableTap={tableId:"",rowId:"",time:0};openRowActionMenu(tableId,rowId);},650);},{passive:true});
document.addEventListener("touchmove",event=>{if(!tableGesture.row)return;const t=event.touches[0],dx=t.clientX-tableGesture.startX,dy=t.clientY-tableGesture.startY;if(Math.abs(dx)>10||Math.abs(dy)>10){tableGesture.moved=true;clearTimeout(tableGesture.timer);}},{passive:true});
document.addEventListener("touchend",event=>{if(!tableGesture.row)return;clearTimeout(tableGesture.timer);const t=event.changedTouches[0],dx=t.clientX-tableGesture.startX,dy=t.clientY-tableGesture.startY;const {tableId,rowId,moved,longPressed}=tableGesture;tableGesture={row:null,tableId:"",rowId:"",startX:0,startY:0,timer:null,moved:false,longPressed:false};if(longPressed){event.preventDefault();return;}if(Math.abs(dx)>=65&&Math.abs(dx)>=Math.abs(dy)*1.3){lastTableTap={tableId:"",rowId:"",time:0};if(dx>0)openTableRowModal(tableId,rowId);else deleteTableRow(tableId,rowId);return;}if(moved||Math.abs(dx)>12||Math.abs(dy)>12)return;const now=Date.now();if(lastTableTap.tableId===tableId&&lastTableTap.rowId===rowId&&now-lastTableTap.time<=340){lastTableTap={tableId:"",rowId:"",time:0};event.preventDefault();openTableRowModal(tableId,rowId);return;}lastTableTap={tableId,rowId,time:now};},{passive:false});

let taskGesture={card:null,taskId:"",startX:0,startY:0,lastX:0,lastY:0,timer:null,longPressed:false};
let taskGestureSuppressUntil=0;
let openTaskSwipeShell=null;
function closeTaskSwipeActions(exceptShell=null){
  document.querySelectorAll(".task-swipe-shell.swipe-edit-open,.task-swipe-shell.swipe-delete-open").forEach(shell=>{
    if(shell!==exceptShell) shell.classList.remove("swipe-edit-open","swipe-delete-open");
  });
  if(openTaskSwipeShell && openTaskSwipeShell!==exceptShell) openTaskSwipeShell=null;
}
function revealTaskSwipeAction(taskId, action){
  const shell=document.querySelector(`[data-task-swipe-shell="${taskId}"]`);if(!shell)return;
  closeTaskSwipeActions(shell);
  shell.classList.remove("swipe-edit-open","swipe-delete-open");
  shell.classList.add(action==="edit"?"swipe-edit-open":"swipe-delete-open");
  openTaskSwipeShell=shell;
}
document.addEventListener("click",event=>{
  if(!openTaskSwipeShell) return;
  if(event.target.closest("[data-swipe-task-edit],[data-swipe-task-delete]")) return;
  const tappedShell=event.target.closest(".task-swipe-shell");
  if(tappedShell===openTaskSwipeShell){
    closeTaskSwipeActions();
    event.preventDefault();
    event.stopPropagation();
  }
},true);

function openTaskGestureMenu(taskId){
  const task=state.tasks.find(item=>item.id===taskId);if(!task)return;
  closeTaskSwipeActions();
  taskGestureSuppressUntil=Date.now()+800;
  document.getElementById("taskGestureSheet")?.remove();
  const sheet=document.createElement("div");sheet.id="taskGestureSheet";sheet.className="row-gesture-sheet";sheet.innerHTML=`<div class="row-gesture-card"><div class="action-sheet-handle"></div><strong>${escapeHTML(task.title)}</strong><button data-task-gesture-edit="${task.id}">✎ Edit task</button><button data-task-gesture-breakdown="${task.id}">☷ Break down</button><button class="danger-action" data-task-gesture-delete="${task.id}">🗑 Delete task</button><button data-close-task-gesture>Cancel</button></div>`;document.body.appendChild(sheet);
}
document.addEventListener("click",event=>{
  const swipeEdit=event.target.closest("[data-swipe-task-edit]");if(swipeEdit){taskGestureSuppressUntil=Date.now()+500;closeTaskSwipeActions();openTaskModal(swipeEdit.dataset.swipeTaskEdit);return;}
  const swipeDelete=event.target.closest("[data-swipe-task-delete]");if(swipeDelete){const id=swipeDelete.dataset.swipeTaskDelete;taskGestureSuppressUntil=Date.now()+500;closeTaskSwipeActions();deleteTask(id,{confirm:false});return;}
  const edit=event.target.closest("[data-task-gesture-edit]");if(edit){document.getElementById("taskGestureSheet")?.remove();openTaskModal(edit.dataset.taskGestureEdit);return;}
  const breakdown=event.target.closest("[data-task-gesture-breakdown]");if(breakdown){document.getElementById("taskGestureSheet")?.remove();openBreakdownModal(breakdown.dataset.taskGestureBreakdown);return;}
  const del=event.target.closest("[data-task-gesture-delete]");if(del){document.getElementById("taskGestureSheet")?.remove();deleteTask(del.dataset.taskGestureDelete);return;}
  if(event.target.closest("[data-close-task-gesture]")){document.getElementById("taskGestureSheet")?.remove();return;}
  if(openTaskSwipeShell && !event.target.closest(".task-swipe-shell")) closeTaskSwipeActions();
});
document.addEventListener("touchstart",event=>{
  const card=event.target.closest("[data-gesture-task]");if(!card)return;
  if(event.target.closest("button,input,select,textarea,a"))return;
  const touch=event.touches[0],shell=card.closest(".task-swipe-shell");
  if(openTaskSwipeShell){
    closeTaskSwipeActions();
  }
  taskGesture={card,taskId:card.dataset.gestureTask,startX:touch.clientX,startY:touch.clientY,lastX:touch.clientX,lastY:touch.clientY,timer:null,longPressed:false};
  taskGesture.timer=setTimeout(()=>{taskGesture.longPressed=true;openTaskGestureMenu(taskGesture.taskId);},620);
},{passive:true});
document.addEventListener("touchmove",event=>{
  if(!taskGesture.card)return;
  const touch=event.touches[0],dx=touch.clientX-taskGesture.startX,dy=touch.clientY-taskGesture.startY;
  taskGesture.lastX=touch.clientX;taskGesture.lastY=touch.clientY;
  if(Math.abs(dx)>10||Math.abs(dy)>10)clearTimeout(taskGesture.timer);
  if(Math.abs(dx)>Math.abs(dy)*1.25 && Math.abs(dx)>12){
    const limited=Math.max(-92,Math.min(92,dx));
    taskGesture.card.style.transform=`translateX(${limited}px)`;
    taskGesture.card.style.transition="none";
  }
},{passive:true});
document.addEventListener("touchend",event=>{
  if(!taskGesture.card)return;
  clearTimeout(taskGesture.timer);
  const touch=event.changedTouches[0],dx=touch.clientX-taskGesture.startX,dy=touch.clientY-taskGesture.startY;
  const taskId=taskGesture.taskId,longPressed=taskGesture.longPressed,card=taskGesture.card;
  card.style.transform="";card.style.transition="";
  taskGesture={card:null,taskId:"",startX:0,startY:0,lastX:0,lastY:0,timer:null,longPressed:false};
  if(longPressed){taskGestureSuppressUntil=Date.now()+800;event.preventDefault();return;}
  if(Math.abs(dx)<55||Math.abs(dx)<Math.abs(dy)*1.35)return;
  taskGestureSuppressUntil=Date.now()+550;event.preventDefault();
  revealTaskSwipeAction(taskId,dx>0?"edit":"delete");
},{passive:false});

document.addEventListener("dragstart",event=>{const card=event.target.closest("[data-calendar-drag-task]");if(!card)return;state.calendarDragTaskId=card.dataset.calendarDragTask;event.dataTransfer?.setData("text/plain",state.calendarDragTaskId);if(event.dataTransfer)event.dataTransfer.effectAllowed="move";});
document.addEventListener("dragover",event=>{const slot=event.target.closest("[data-time-slot]");if(!slot)return;event.preventDefault();slot.classList.add("drag-over");});
document.addEventListener("dragleave",event=>{event.target.closest("[data-time-slot]")?.classList.remove("drag-over");});
document.addEventListener("drop",event=>{const slot=event.target.closest("[data-time-slot]");if(!slot)return;event.preventDefault();slot.classList.remove("drag-over");const id=event.dataTransfer?.getData("text/plain")||state.calendarDragTaskId;if(id)scheduleTaskAt(id,slot.dataset.date,slot.dataset.time);});

document.getElementById("mainAddButton").addEventListener("click",()=>openModal("addMenu"));
document.getElementById("saveQuickTaskButton")?.addEventListener("click",saveQuickTask);
document.getElementById("saveQuickAccessButton")?.addEventListener("click", saveQuickAccess);
document.getElementById("addTableColumnButton")?.addEventListener("click",()=>addTableColumnBuilder());
document.getElementById("tableTemplate")?.addEventListener("change",event=>applyTableTemplate(event.target.value, true));
document.getElementById("globalSearchButton").addEventListener("click",()=>{document.getElementById("globalSearchInput").value="";renderGlobalSearchResults("");openModal("searchModal");setTimeout(()=>document.getElementById("globalSearchInput").focus(),80);});
document.getElementById("menuButton").addEventListener("click",openNavDrawer);
document.addEventListener("keydown",event=>{if(event.key==="Escape")closeNavDrawer();if(event.key==="Enter"&&event.target.id==="quickTaskTitle"){event.preventDefault();saveQuickTask();}if(event.key==="Enter"&&event.target.id==="dayIntentionInput"){event.preventDefault();saveDayIntention();}if(event.key==="Enter"&&event.target.id==="tinyWinInput"){event.preventDefault();addTinyWin();}if(event.key==="Enter" && ["listItemTitle","listItemQuantity","listItemDetail"].includes(event.target.id)){event.preventDefault();saveListItem();}});
document.getElementById("birthdayHelperToggle")?.addEventListener("click",()=>toggleBirthdayHelper());
document.getElementById("applyBirthdayPreset")?.addEventListener("click",()=>applyBirthdayPreset(true));
document.getElementById("birthdayOtherName")?.addEventListener("input",()=>{const helper=document.getElementById("birthdayHelper");if(helper&&!helper.classList.contains("hidden"))applyBirthdayPreset(false);});
document.getElementById("saveEventButton").addEventListener("click",saveEvent);
document.getElementById("deleteEventButton").addEventListener("click",()=>{const id=document.getElementById("eventEditId").value;if(id)deleteEvent(id);});
document.getElementById("saveTaskScheduleButton").addEventListener("click",saveTaskSchedule);
document.getElementById("saveProjectButton").addEventListener("click",saveProject);
document.getElementById("deleteProjectButton").addEventListener("click",()=>{const id=document.getElementById("projectEditId").value;if(id)deleteProject(id);});
document.getElementById("saveMilestoneButton").addEventListener("click",saveMilestone);
document.getElementById("deleteMilestoneButton").addEventListener("click",()=>{const pid=document.getElementById("milestoneProjectId").value,id=document.getElementById("milestoneEditId").value;if(pid&&id)deleteMilestone(pid,id);});
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
document.getElementById("saveBulkTableEditButton")?.addEventListener("click",saveBulkTableEdits);
document.getElementById("applyBulkPasteButton")?.addEventListener("click",applyBulkPaste);
document.getElementById("copyBulkEditButton")?.addEventListener("click",copyBulkEditorGrid);
document.getElementById("saveListButton").addEventListener("click",saveList);
document.getElementById("deleteListFromModal").addEventListener("click",()=>{const id=document.getElementById("listEditId").value;if(id)deleteList(id);});
document.getElementById("saveListItemButton").addEventListener("click",saveListItem);
document.getElementById("deleteListItemFromModal").addEventListener("click",()=>{const listId=document.getElementById("listItemListId").value,itemId=document.getElementById("listItemEditId").value;if(listId&&itemId)deleteListItem(listId,itemId);});
document.getElementById("savePinButton").addEventListener("click",savePin);
document.getElementById("saveSomedayButton").addEventListener("click",saveSomeday);
document.getElementById("saveFutureNoteButton").addEventListener("click",saveFutureNote);
document.getElementById("deleteFutureNoteButton").addEventListener("click",()=>{const id=document.getElementById("futureNoteEditId").value;if(id)deleteFutureNote(id);});
document.getElementById("saveBreakdownButton").addEventListener("click",saveTaskBreakdown);
document.getElementById("saveThreadButton").addEventListener("click",saveThread);
document.getElementById("deleteThreadButton").addEventListener("click",()=>{const id=document.getElementById("threadEditId").value;if(id&&confirm("Delete this Memory Thread? Linked Hana items will stay intact."))deleteThread(id);});
document.getElementById("saveThreadLinkButton").addEventListener("click",saveThreadLink);
document.getElementById("importBackupInput").addEventListener("change",event=>importData(event.target.files?.[0]));
document.getElementById("wallpaperInput").addEventListener("change",event=>chooseWallpaper(event.target.files?.[0]));

document.querySelectorAll(".modal-overlay").forEach(overlay=>overlay.addEventListener("click",event=>{if(event.target===overlay)overlay.classList.add("hidden");}));

document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden"&&lastSavedStateJSON&&!safetyRecoveryPending)createSafetySnapshot("background",lastSavedStateJSON);});
window.addEventListener("pagehide",()=>{if(lastSavedStateJSON&&!safetyRecoveryPending)createSafetySnapshot("pagehide",lastSavedStateJSON);});

/* SERVICE WORKER */
if("serviceWorker" in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js").catch(error=>console.error("Service worker registration failed:",error)));}

setInterval(checkReminders,30*1000);checkReminders();
applyAppearance();
render();
(async()=>{
  try{if(navigator.storage?.persist)await navigator.storage.persist();}catch{}
  await maybeRecoverFromSafetySnapshot();
  await startAccountOnboarding();
})();

const launchParams=new URLSearchParams(window.location.search);
if(launchParams.get("action")==="capture"){setTimeout(prepareQuickCapture,100);window.history.replaceState({},"",window.location.pathname+window.location.hash);}
