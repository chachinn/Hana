/* =====================================================
   HANA 🌸
   Main Application
   ===================================================== */

const STORAGE_KEY = "hana_app_v1";

const todayISO = () => {
  const d = new Date();

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const createId = () => {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2)
  );
};

/* =====================================================
   DEFAULT DATA
   ===================================================== */

const defaultState = {
  currentPage: "today",

  currentMode: "all",

  taskFilter: "all",

  tasks: [
    {
      id: createId(),
      title: "Review this week's priorities",
      space: "work",
      priority: "high",
      status: "todo",
      dueDate: todayISO(),
      dueTime: "",
      notes: "",
      completed: false,
      rolling: false,
      repeatDays: 0,
      createdAt: Date.now()
    },

    {
      id: createId(),
      title: "Water the plants",
      space: "personal",
      priority: "low",
      status: "todo",
      dueDate: todayISO(),
      dueTime: "19:00",
      notes: "",
      completed: false,
      rolling: true,
      repeatDays: 2,
      createdAt: Date.now()
    }
  ],

  notes: [
    {
      id: createId(),
      title: "Welcome to Hana 🌸",
      content:
        "Hana keeps your tasks, notes, reminders and little pieces of life together without showing you everything at once.",
      space: "personal",
      pinned: true,
      createdAt: Date.now()
    }
  ],

  reminders: [
    {
      id: createId(),
      title: "Water the plants",
      space: "personal",
      date: todayISO(),
      time: "19:00",
      repeat: "none",
      completed: false,
      notified: false,
      createdAt: Date.now()
    }
  ],

  pins: [
    {
      id: createId(),
      title: "Hana idea",
      content:
        "Small steps.\nBeautiful results. 🌸",
      space: "personal",
      createdAt: Date.now()
    }
  ],

  someday: [
    {
      id: createId(),
      title: "Learn something new",
      category: "learning",
      notes: "Save ideas here without turning them into obligations.",
      createdAt: Date.now()
    }
  ],

  tableRows: [
    {
      id: createId(),
      item: "Example bill",
      amount: 1000,
      dueDate: todayISO(),
      status: "upcoming",
      reminder: false,
      createdAt: Date.now()
    }
  ],

  dailyCloseHistory: []
};

/* =====================================================
   STATE
   ===================================================== */

let state = loadState();

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    return structuredClone(defaultState);
  }

  try {
    const parsed = JSON.parse(saved);

    return {
      ...structuredClone(defaultState),
      ...parsed
    };
  } catch (error) {
    console.error("Unable to load Hana data:", error);

    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(state)
  );
}

/* =====================================================
   HELPERS
   ===================================================== */

function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(dateString) {
  if (!dateString) {
    return "No date";
  }

  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString(
    undefined,
    {
      month: "short",
      day: "numeric"
    }
  );
}

function formatFullDate(dateString) {
  if (!dateString) {
    return "";
  }

  const date = new Date(`${dateString}T00:00:00`);

  return date.toLocaleDateString(
    undefined,
    {
      weekday: "short",
      month: "short",
      day: "numeric"
    }
  );
}

function formatLongToday() {
  return new Date().toLocaleDateString(
    undefined,
    {
      weekday: "long",
      month: "long",
      day: "numeric"
    }
  );
}

function formatTime(time) {
  if (!time) {
    return "";
  }

  const [hours, minutes] = time.split(":");

  const d = new Date();

  d.setHours(
    Number(hours),
    Number(minutes),
    0,
    0
  );

  return d.toLocaleTimeString(
    undefined,
    {
      hour: "numeric",
      minute: "2-digit"
    }
  );
}

function formatCurrency(value) {
  return new Intl.NumberFormat(
    undefined,
    {
      style: "currency",
      currency: "PHP",
      maximumFractionDigits: 2
    }
  ).format(Number(value || 0));
}

function greeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 18) {
    return "Good afternoon";
  }

  return "Good evening";
}

function modeLabel(space) {
  return space === "work"
    ? "💼 Work"
    : "🎀 Personal";
}

function modeBadge(space) {
  return space === "work"
    ? "badge-work"
    : "badge-personal";
}

function statusLabel(status) {
  const labels = {
    todo: "To Do",
    doing: "Doing",
    waiting: "Waiting",
    blocked: "Blocked",
    done: "Done"
  };

  return labels[status] || status;
}

function filterByMode(items) {
  if (state.currentMode === "all") {
    return items;
  }

  return items.filter(
    item => item.space === state.currentMode
  );
}

function isToday(date) {
  return date === todayISO();
}

function isPast(date) {
  if (!date) {
    return false;
  }

  return date < todayISO();
}

function showToast(message) {
  const toast = document.getElementById("toast");

  toast.textContent = message;
  toast.classList.remove("hidden");

  clearTimeout(window.hanaToastTimer);

  window.hanaToastTimer = setTimeout(
    () => {
      toast.classList.add("hidden");
    },
    2300
  );
}

/* =====================================================
   MODALS
   ===================================================== */

function openModal(id) {
  document
    .getElementById(id)
    ?.classList.remove("hidden");
}

function closeModal(id) {
  document
    .getElementById(id)
    ?.classList.add("hidden");
}

function closeAllModals() {
  document
    .querySelectorAll(".modal-overlay")
    .forEach(modal =>
      modal.classList.add("hidden")
    );
}

/* =====================================================
   PAGE ROUTER
   ===================================================== */

function render() {
  updateModeButtons();
  updateNavigation();

  switch (state.currentPage) {
    case "tasks":
      renderTasks();
      break;

    case "notes":
      renderNotes();
      break;

    case "tables":
      renderTables();
      break;

    case "reminders":
      renderReminders();
      break;

    case "bloom":
      renderBloom();
      break;

    case "pinboard":
      renderPinboard();
      break;

    case "someday":
      renderSomeday();
      break;

    case "daily-close":
      renderDailyClose();
      break;

    case "more":
      renderMore();
      break;

    case "today":
    default:
      renderToday();
      break;
  }

  saveState();
}

function changePage(page) {
  state.currentPage = page;

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

  render();
}

function updateNavigation() {
  document
    .querySelectorAll(".nav-button[data-page]")
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.page === state.currentPage
      );
    });
}

function updateModeButtons() {
  document
    .querySelectorAll(".mode-button")
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.mode === state.currentMode
      );
    });
}

/* =====================================================
   TODAY
   ===================================================== */

function renderToday() {
  const container =
    document.getElementById("pageContent");

  const tasks =
    filterByMode(state.tasks);

  const activeTasks =
    tasks.filter(task => !task.completed);

  const todayTasks =
    activeTasks.filter(task =>
      isToday(task.dueDate)
    );

  const completedToday =
    tasks.filter(task =>
      task.completed &&
      task.completedDate === todayISO()
    );

  const todayReminders =
    filterByMode(state.reminders)
      .filter(
        reminder =>
          !reminder.completed &&
          reminder.date === todayISO()
      );

  const totalBloomItems =
    todayTasks.length +
    completedToday.length;

  const completionPercent =
    totalBloomItems === 0
      ? 0
      : Math.round(
          completedToday.length /
          totalBloomItems *
          100
        );

  container.innerHTML = `
    <section class="hero-card">

      <p class="eyebrow">
        ${escapeHTML(formatLongToday())}
      </p>

      <h1>
        ${greeting()} 🌸
      </h1>

      <p>
        Here's what deserves your attention today.
      </p>

      <div class="bloom-count">
        🌸
        ${completedToday.length} of
        ${totalBloomItems || 0}
        blooms complete
      </div>

      <div class="progress-track">
        <div
          class="progress-fill"
          style="width:${completionPercent}%"
        ></div>
      </div>

      <div class="stat-grid">

        <div class="stat-card">
          <span class="stat-number">
            ${todayTasks.length}
          </span>
          <span class="stat-label">
            To Do
          </span>
        </div>

        <div class="stat-card">
          <span class="stat-number">
            ${todayReminders.length}
          </span>
          <span class="stat-label">
            Reminders
          </span>
        </div>

        <div class="stat-card">
          <span class="stat-number">
            ${completedToday.length}
          </span>
          <span class="stat-label">
            Blooms
          </span>
        </div>

      </div>

    </section>

    <section class="section">

      <div class="section-header">
        <h2>Today's bouquet</h2>

        <button data-goto="tasks">
          See all
        </button>
      </div>

      ${
        todayTasks.length
          ? `
            <div class="task-list">
              ${todayTasks
                .slice(0, 6)
                .map(taskCard)
                .join("")}
            </div>
          `
          : emptyState(
              "🌷",
              "A little room to breathe",
              "No unfinished tasks are due today.",
              "Add a task",
              "open-task"
            )
      }

    </section>

    <section class="section">

      <div class="section-header">
        <h2>Gentle reminders</h2>

        <button data-goto="reminders">
          View reminders
        </button>
      </div>

      ${
        todayReminders.length
          ? todayReminders
              .slice(0, 3)
              .map(reminderCard)
              .join("")
          : `
            <div class="card soft-card">
              <strong>Nothing else is calling for you 🌸</strong>

              <p
                style="
                  margin:6px 0 0;
                  font-size:12px;
                  color:var(--text-soft);
                "
              >
                Hana will keep reminders here when you need them.
              </p>
            </div>
          `
      }

    </section>

    <section class="section">

      <div class="section-header">
        <h2>Quick garden</h2>
      </div>

      <div class="more-grid">

        <button
          class="more-card"
          data-goto="bloom"
        >
          <span class="more-icon">🌸</span>
          <strong>Bloom View</strong>
          <small>
            See today's progress as petals.
          </small>
        </button>

        <button
          class="more-card"
          data-open="quickCaptureModal"
        >
          <span class="more-icon">✨</span>
          <strong>Quick Capture</strong>
          <small>
            Drop a thought and organize it later.
          </small>
        </button>

      </div>

    </section>
  `;
}

/* =====================================================
   TASKS
   ===================================================== */

function taskCard(task) {
  const priorityClass =
    `priority-${task.priority}`;

  return `
    <div
      class="task-item
      ${task.completed ? "completed" : ""}"
    >

      <button
        class="
          task-checkbox
          ${task.completed ? "checked" : ""}
        "
        data-toggle-task="${task.id}"
      >
        ${task.completed ? "✓" : ""}
      </button>

      <div>

        <div class="task-title">
          ${escapeHTML(task.title)}
        </div>

        <div class="task-meta">

          <span class="badge ${modeBadge(task.space)}">
            ${modeLabel(task.space)}
          </span>

          <span>
            <span
              class="priority-dot ${priorityClass}"
            ></span>
            ${escapeHTML(task.priority)}
          </span>

          ${
            task.dueDate
              ? `
                <span>
                  📅 ${formatDate(task.dueDate)}
                </span>
              `
              : ""
          }

          ${
            task.dueTime
              ? `
                <span>
                  ${formatTime(task.dueTime)}
                </span>
              `
              : ""
          }

          <span
            class="badge badge-${task.status}"
          >
            ${statusLabel(task.status)}
          </span>

          ${
            task.rolling
              ? `
                <span>
                  🔁 every ${task.repeatDays} days
                </span>
              `
              : ""
          }

        </div>

      </div>

      <div class="task-actions">

        <button
          class="mini-icon-button"
          data-cycle-task="${task.id}"
          title="Change status"
        >
          ↻
        </button>

        <button
          class="mini-icon-button"
          data-delete-task="${task.id}"
          title="Delete"
        >
          ×
        </button>

      </div>

    </div>
  `;
}

function renderTasks() {
  const container =
    document.getElementById("pageContent");

  let tasks =
    filterByMode(state.tasks);

  if (state.taskFilter === "today") {
    tasks = tasks.filter(
      task =>
        !task.completed &&
        task.dueDate === todayISO()
    );
  }

  if (state.taskFilter === "upcoming") {
    tasks = tasks.filter(
      task =>
        !task.completed &&
        task.dueDate &&
        task.dueDate > todayISO()
    );
  }

  if (state.taskFilter === "waiting") {
    tasks = tasks.filter(
      task =>
        !task.completed &&
        task.status === "waiting"
    );
  }

  if (state.taskFilter === "completed") {
    tasks = tasks.filter(
      task => task.completed
    );
  }

  if (state.taskFilter === "all") {
    tasks = tasks.filter(
      task => !task.completed
    );
  }

  tasks.sort((a, b) => {
    if (!a.dueDate && !b.dueDate) {
      return b.createdAt - a.createdAt;
    }

    if (!a.dueDate) {
      return 1;
    }

    if (!b.dueDate) {
      return -1;
    }

    return a.dueDate.localeCompare(b.dueDate);
  });

  const filters = [
    ["all", "All"],
    ["today", "Today"],
    ["upcoming", "Upcoming"],
    ["waiting", "Waiting"],
    ["completed", "Completed"]
  ];

  container.innerHTML = `
    <div class="page-heading">
      <p class="eyebrow">
        GROW WHAT MATTERS
      </p>

      <h1>Tasks</h1>

      <p>
        Keep work and personal life organized
        without letting either take over.
      </p>
    </div>

    <div class="filter-row">

      ${filters
        .map(
          ([value, label]) => `
            <button
              class="
                filter-chip
                ${
                  state.taskFilter === value
                    ? "active"
                    : ""
                }
              "
              data-task-filter="${value}"
            >
              ${label}
            </button>
          `
        )
        .join("")}

    </div>

    ${
      tasks.length
        ? `
          <div class="task-list">
            ${tasks.map(taskCard).join("")}
          </div>
        `
        : emptyState(
            "🌱",
            "Nothing here yet",
            "Your garden is clear.",
            "Add a task",
            "open-task"
          )
    }
  `;
}

function toggleTask(id) {
  const task =
    state.tasks.find(task => task.id === id);

  if (!task) {
    return;
  }

  task.completed = !task.completed;

  if (task.completed) {
    task.status = "done";
    task.completedDate = todayISO();

    if (
      task.rolling &&
      Number(task.repeatDays) > 0
    ) {
      const nextDate = new Date();

      nextDate.setDate(
        nextDate.getDate() +
        Number(task.repeatDays)
      );

      const nextTask = {
        ...task,
        id: createId(),
        completed: false,
        status: "todo",
        completedDate: null,
        createdAt: Date.now(),
        dueDate: localDateISO(nextDate)
      };

      state.tasks.push(nextTask);

      showToast(
        `Next bloom scheduled in ${task.repeatDays} days 🌱`
      );
    }
  } else {
    task.status = "todo";
    task.completedDate = null;
  }

  render();
}

function localDateISO(date) {
  const year = date.getFullYear();

  const month =
    String(date.getMonth() + 1)
      .padStart(2, "0");

  const day =
    String(date.getDate())
      .padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function cycleTaskStatus(id) {
  const task =
    state.tasks.find(task => task.id === id);

  if (!task || task.completed) {
    return;
  }

  const order = [
    "todo",
    "doing",
    "waiting",
    "blocked"
  ];

  const current =
    order.indexOf(task.status);

  task.status =
    order[(current + 1) % order.length];

  showToast(
    `Status: ${statusLabel(task.status)}`
  );

  render();
}

function deleteTask(id) {
  if (!confirm("Delete this task?")) {
    return;
  }

  state.tasks =
    state.tasks.filter(task => task.id !== id);

  render();
}

/* =====================================================
   NOTES
   ===================================================== */

function renderNotes() {
  const container =
    document.getElementById("pageContent");

  const notes =
    filterByMode(state.notes)
      .sort(
        (a, b) =>
          Number(b.pinned) -
            Number(a.pinned) ||
          b.createdAt -
            a.createdAt
      );

  container.innerHTML = `
    <div class="page-heading">

      <p class="eyebrow">
        THOUGHTS, KEPT GENTLY
      </p>

      <h1>Notes</h1>

      <p>
        Ideas, meeting notes, lists and little
        things you don't want to lose.
      </p>

    </div>

    <div class="search-box">
      <input
        id="noteSearch"
        type="search"
        placeholder="Search notes..."
      />
    </div>

    <div id="notesResults">

      ${
        notes.length
          ? `
            <div class="note-grid">
              ${notes.map(noteCard).join("")}
            </div>
          `
          : emptyState(
              "📝",
              "Your pages are waiting",
              "Capture anything worth remembering.",
              "Add note",
              "open-note"
            )
      }

    </div>
  `;
}

function noteCard(note) {
  return `
    <article
      class="
        note-card
        ${note.pinned ? "pinned" : ""}
      "
    >

      <h3>
        ${note.pinned ? "📌 " : ""}
        ${escapeHTML(note.title)}
      </h3>

      <div class="note-preview">
        ${escapeHTML(note.content)}
      </div>

      <div class="note-footer">

        <span>
          ${modeLabel(note.space)}
        </span>

        <button
          class="text-button"
          data-delete-note="${note.id}"
        >
          Delete
        </button>

      </div>

    </article>
  `;
}

function searchNotes(query) {
  const normalized =
    query.trim().toLowerCase();

  let notes =
    filterByMode(state.notes);

  if (normalized) {
    notes = notes.filter(
      note =>
        note.title
          .toLowerCase()
          .includes(normalized) ||
        note.content
          .toLowerCase()
          .includes(normalized)
    );
  }

  const results =
    document.getElementById("notesResults");

  if (!results) {
    return;
  }

  results.innerHTML =
    notes.length
      ? `
        <div class="note-grid">
          ${notes.map(noteCard).join("")}
        </div>
      `
      : emptyState(
          "🔎",
          "No matching notes",
          "Try another search.",
          "",
          ""
        );
}

function deleteNote(id) {
  if (!confirm("Delete this note?")) {
    return;
  }

  state.notes =
    state.notes.filter(note => note.id !== id);

  render();
}

/* =====================================================
   TABLES
   ===================================================== */

function renderTables() {
  const container =
    document.getElementById("pageContent");

  const total =
    state.tableRows.reduce(
      (sum, row) =>
        sum + Number(row.amount || 0),
      0
    );

  container.innerHTML = `
    <div class="page-heading">

      <p class="eyebrow">
        LIGHTWEIGHT DATABASES
      </p>

      <h1>Smart Tables</h1>

      <p>
        Track bills, projects, shopping,
        subscriptions and anything that works
        better in rows.
      </p>

    </div>

    <div class="card soft-card">

      <strong>
        Rows can remind you 🌸
      </strong>

      <p
        style="
          margin:6px 0 0;
          color:var(--text-soft);
          font-size:12px;
          line-height:1.5;
        "
      >
        Turn any table row into an active reminder
        instead of leaving important information
        buried in a spreadsheet.
      </p>

    </div>

    ${
      state.tableRows.length
        ? `
          <div class="table-wrapper">

            <table class="smart-table">

              <thead>
                <tr>
                  <th>Item</th>
                  <th>Amount</th>
                  <th>Due</th>
                  <th>Status</th>
                  <th>Reminder</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                ${state.tableRows
                  .map(
                    row => `
                      <tr>

                        <td>
                          ${escapeHTML(row.item)}
                        </td>

                        <td>
                          ${formatCurrency(row.amount)}
                        </td>

                        <td>
                          ${formatDate(row.dueDate)}
                        </td>

                        <td>
                          <span
                            class="
                              badge
                              badge-${row.status}
                            "
                          >
                            ${escapeHTML(row.status)}
                          </span>
                        </td>

                        <td>
                          ${row.reminder ? "🔔" : "—"}
                        </td>

                        <td>
                          <button
                            class="table-delete"
                            data-delete-row="${row.id}"
                          >
                            Delete
                          </button>
                        </td>

                      </tr>
                    `
                  )
                  .join("")}
              </tbody>

              <tfoot>
                <tr>
                  <td>
                    <strong>Total</strong>
                  </td>

                  <td>
                    <strong>
                      ${formatCurrency(total)}
                    </strong>
                  </td>

                  <td colspan="4"></td>
                </tr>
              </tfoot>

            </table>

          </div>
        `
        : emptyState(
            "📋",
            "No rows yet",
            "Start a small table without building a whole spreadsheet.",
            "Add row",
            "open-table"
          )
    }

    <div
      style="
        margin-top:14px;
      "
    >
      <button
        class="primary-button full-width"
        data-open="tableRowModal"
      >
        + Add row
      </button>
    </div>
  `;
}

/* =====================================================
   REMINDERS
   ===================================================== */

function renderReminders() {
  const container =
    document.getElementById("pageContent");

  const reminders =
    filterByMode(state.reminders)
      .filter(item => !item.completed)
      .sort(
        (a, b) =>
          `${a.date}${a.time}`
            .localeCompare(
              `${b.date}${b.time}`
            )
      );

  container.innerHTML = `
    <div class="page-heading">

      <p class="eyebrow">
        GENTLE NUDGES
      </p>

      <h1>Reminders</h1>

      <p>
        Hana should remind you when something
        matters, not make your phone feel like
        another boss.
      </p>

    </div>

    ${
      reminders.length
        ? reminders
            .map(reminderCard)
            .join("")
        : emptyState(
            "🔔",
            "Quiet for now",
            "There are no active reminders.",
            "Add reminder",
            "open-reminder"
          )
    }

    <section class="section">

      <div class="section-header">
        <h2>Meaningful snooze</h2>
      </div>

      <div class="card">

        <p
          style="
            margin:0 0 12px;
            color:var(--text-soft);
            font-size:12px;
          "
        >
          Instead of only “snooze 10 minutes,”
          Hana can use more human timing.
        </p>

        <div class="filter-row">

          <button class="filter-chip">
            🌙 Tonight
          </button>

          <button class="filter-chip">
            🌅 Tomorrow
          </button>

          <button class="filter-chip">
            💼 Next workday
          </button>

          <button class="filter-chip">
            📅 Pick a time
          </button>

        </div>

      </div>

    </section>
  `;
}

function reminderCard(reminder) {
  return `
    <div class="reminder-card">

      <div class="reminder-icon">
        🔔
      </div>

      <div>

        <div class="reminder-title">
          ${escapeHTML(reminder.title)}
        </div>

        <div class="reminder-date">

          ${
            formatFullDate(reminder.date)
          }

          ${
            reminder.time
              ? ` · ${formatTime(reminder.time)}`
              : ""
          }

          ${
            reminder.repeat !== "none"
              ? ` · repeats ${reminder.repeat}`
              : ""
          }

        </div>

      </div>

      <button
        class="mini-icon-button"
        data-complete-reminder="${reminder.id}"
      >
        ✓
      </button>

    </div>
  `;
}

/* =====================================================
   BLOOM VIEW
   ===================================================== */

function renderBloom() {
  const container =
    document.getElementById("pageContent");

  const tasks =
    filterByMode(state.tasks);

  const completed =
    tasks.filter(task => task.completed).length;

  const open =
    tasks.filter(task => !task.completed).length;

  const work =
    state.tasks.filter(
      task =>
        task.space === "work" &&
        !task.completed
    ).length;

  const personal =
    state.tasks.filter(
      task =>
        task.space === "personal" &&
        !task.completed
    ).length;

  const notes =
    filterByMode(state.notes).length;

  container.innerHTML = `
    <div class="page-heading">

      <p class="eyebrow">
        YOUR GARDEN
      </p>

      <h1>Bloom View</h1>

      <p>
        Your life isn't a productivity score.
        This is simply a softer way to see what's
        growing.
      </p>

    </div>

    <div class="card bloom-view">

      <div class="bloom-flower">

        <div class="petal petal-1">
          <span>💼 ${work}</span>
        </div>

        <div class="petal petal-2">
          <span>🎀 ${personal}</span>
        </div>

        <div class="petal petal-3">
          <span>📝 ${notes}</span>
        </div>

        <div class="petal petal-4">
          <span>🌱 ${open}</span>
        </div>

        <div class="petal petal-5">
          <span>✨ ${completed}</span>
        </div>

        <div class="bloom-center">
          <strong>
            ${completed}
          </strong>
          <span>
            BLOOMS
          </span>
        </div>

      </div>

      <h3>
        Small steps. Beautiful results. 🌸
      </h3>

      <p
        style="
          color:var(--text-soft);
          font-size:12px;
        "
      >
        Completing something adds another bloom
        to your garden.
      </p>

    </div>
  `;
}

/* =====================================================
   PINBOARD
   ===================================================== */

function renderPinboard() {
  const container =
    document.getElementById("pageContent");

  const pins =
    filterByMode(state.pins);

  container.innerHTML = `
    <div class="page-heading">

      <p class="eyebrow">
        KEEP IT HANDY
      </p>

      <h1>Pinboard</h1>

      <p>
        Things you need often don't always need
        to become tasks.
      </p>

    </div>

    ${
      pins.length
        ? `
          <div class="pin-grid">

            ${pins
              .map(
                pin => `
                  <article class="pin">

                    <h3>
                      ${escapeHTML(pin.title)}
                    </h3>

                    <p>
                      ${escapeHTML(pin.content)}
                    </p>

                    <button
                      class="text-button"
                      style="
                        position:absolute;
                        bottom:7px;
                        right:7px;
                      "
                      data-delete-pin="${pin.id}"
                    >
                      ×
                    </button>

                  </article>
                `
              )
              .join("")}

          </div>
        `
        : emptyState(
            "📌",
            "Nothing pinned",
            "Keep quick references here.",
            "Add pin",
            "open-pin"
          )
    }

    <div style="margin-top:14px;">
      <button
        class="primary-button full-width"
        data-open="pinModal"
      >
        + Add pin
      </button>
    </div>
  `;
}

/* =====================================================
   SOMEDAY
   ===================================================== */

function somedayIcon(category) {
  const icons = {
    ideas: "💡",
    places: "📍",
    project: "🌱",
    books: "📚",
    learning: "🎓",
    other: "🌸"
  };

  return icons[category] || "🌸";
}

function renderSomeday() {
  const container =
    document.getElementById("pageContent");

  container.innerHTML = `
    <div class="page-heading">

      <p class="eyebrow">
        NOT NOW DOESN'T MEAN NEVER
      </p>

      <h1>Someday</h1>

      <p>
        Store dreams and ideas without giving
        them deadlines they don't need.
      </p>

    </div>

    ${
      state.someday.length
        ? state.someday
            .map(
              item => `
                <article class="someday-card">

                  <div class="someday-symbol">
                    ${somedayIcon(item.category)}
                  </div>

                  <div style="flex:1;">

                    <h3>
                      ${escapeHTML(item.title)}
                    </h3>

                    <p>
                      ${escapeHTML(item.notes)}
                    </p>

                    <span class="badge badge-personal">
                      ${escapeHTML(item.category)}
                    </span>

                  </div>

                  <button
                    class="mini-icon-button"
                    data-delete-someday="${item.id}"
                  >
                    ×
                  </button>

                </article>
              `
            )
            .join("")
        : emptyState(
            "🌱",
            "Your someday garden is empty",
            "Ideas can wait here without becoming chores.",
            "Save an idea",
            "open-someday"
          )
    }

    <div style="margin-top:14px;">
      <button
        class="primary-button full-width"
        data-open="somedayModal"
      >
        + Save for someday
      </button>
    </div>
  `;
}

/* =====================================================
   DAILY CLOSE
   ===================================================== */

function renderDailyClose() {
  const container =
    document.getElementById("pageContent");

  const completedToday =
    state.tasks.filter(
      task =>
        task.completedDate === todayISO()
    ).length;

  const unfinished =
    state.tasks.filter(
      task =>
        !task.completed &&
        task.dueDate === todayISO()
    ).length;

  container.innerHTML = `
    <div class="page-heading">

      <p class="eyebrow">
        CLEAR THE GARDEN
      </p>

      <h1>Daily Close</h1>

      <p>
        Finish the day without carrying an ugly
        pile of overdue tasks into tomorrow.
      </p>

    </div>

    <section class="daily-close-hero">

      <div class="daily-close-icon">
        🌙
      </div>

      <h2>
        You did enough for one day.
      </h2>

      <p
        style="
          color:var(--text-soft);
          font-size:12px;
        "
      >
        ${formatLongToday()}
      </p>

      <div class="stat-grid">

        <div class="stat-card">
          <span class="stat-number">
            ${completedToday}
          </span>
          <span class="stat-label">
            Completed
          </span>
        </div>

        <div class="stat-card">
          <span class="stat-number">
            ${unfinished}
          </span>
          <span class="stat-label">
            Unfinished
          </span>
        </div>

        <div class="stat-card">
          <span class="stat-number">
            ${
              state.someday.length
            }
          </span>
          <span class="stat-label">
            Someday
          </span>
        </div>

      </div>

      <div class="close-actions">

        <button
          class="close-action"
          data-close-action="tomorrow"
        >
          <span>
            Move today's unfinished tasks
            to tomorrow
          </span>

          <span>→</span>
        </button>

        <button
          class="close-action"
          data-goto="someday"
        >
          <span>
            Review Someday
          </span>

          <span>→</span>
        </button>

        <button
          class="close-action"
          data-open="noteModal"
        >
          <span>
            Reflect in Notes
          </span>

          <span>→</span>
        </button>

      </div>

      <button
        class="primary-button full-width"
        style="margin-top:15px;"
        data-close-action="finish"
      >
        All set for today ✨
      </button>

    </section>
  `;
}

function moveTodayTasksToTomorrow() {
  const tomorrow =
    new Date();

  tomorrow.setDate(
    tomorrow.getDate() + 1
  );

  const tomorrowISO =
    localDateISO(tomorrow);

  state.tasks.forEach(task => {
    if (
      !task.completed &&
      task.dueDate === todayISO()
    ) {
      task.dueDate = tomorrowISO;
    }
  });

  showToast(
    "Unfinished blooms moved to tomorrow 🌱"
  );

  render();
}

function finishDailyClose() {
  state.dailyCloseHistory.push({
    date: todayISO(),
    completedAt: Date.now()
  });

  showToast(
    "The garden is closed for today 🌙"
  );
}

/* =====================================================
   MORE
   ===================================================== */

function renderMore() {
  const container =
    document.getElementById("pageContent");

  container.innerHTML = `
    <div class="page-heading">

      <p class="eyebrow">
        MORE OF HANA
      </p>

      <h1>Your garden</h1>

      <p>
        Extra spaces for the things that don't
        belong in a standard to-do list.
      </p>

    </div>

    <div class="more-grid">

      ${moreCard(
        "🔔",
        "Reminders",
        "Gentle nudges and recurring reminders.",
        "reminders"
      )}

      ${moreCard(
        "📋",
        "Smart Tables",
        "Mini databases whose rows can remind you.",
        "tables"
      )}

      ${moreCard(
        "🌸",
        "Bloom View",
        "See progress as petals instead of charts.",
        "bloom"
      )}

      ${moreCard(
        "📌",
        "Pinboard",
        "Keep useful little things close.",
        "pinboard"
      )}

      ${moreCard(
        "🌱",
        "Someday",
        "Save ideas without turning them into chores.",
        "someday"
      )}

      ${moreCard(
        "🌙",
        "Daily Close",
        "Wrap up your day gently.",
        "daily-close"
      )}

    </div>

    <section class="section">

      <div class="section-header">
        <h2>Hana data</h2>
      </div>

      <div class="card">

        <p
          style="
            margin:0 0 13px;
            color:var(--text-soft);
            font-size:12px;
            line-height:1.5;
          "
        >
          Hana currently saves everything locally
          on this device.
        </p>

        <button
          id="exportDataButton"
          class="secondary-button full-width"
        >
          Export Hana backup
        </button>

      </div>

    </section>
  `;
}

function moreCard(
  icon,
  title,
  description,
  page
) {
  return `
    <button
      class="more-card"
      data-goto="${page}"
    >

      <span class="more-icon">
        ${icon}
      </span>

      <strong>
        ${title}
      </strong>

      <small>
        ${description}
      </small>

    </button>
  `;
}

/* =====================================================
   EMPTY STATE
   ===================================================== */

function emptyState(
  icon,
  title,
  description,
  buttonLabel = "",
  action = ""
) {
  return `
    <div class="empty-state">

      <div class="empty-icon">
        ${icon}
      </div>

      <h3>
        ${title}
      </h3>

      <p>
        ${description}
      </p>

      ${
        buttonLabel
          ? `
            <button
              class="secondary-button"
              data-empty-action="${action}"
            >
              ${buttonLabel}
            </button>
          `
          : ""
      }

    </div>
  `;
}

/* =====================================================
   QUICK CAPTURE
   ===================================================== */

function predictCapture(text) {
  const value =
    text.trim().toLowerCase();

  if (!value) {
    return {
      type: "unknown",
      label: "🌱 Something new"
    };
  }

  const reminderWords = [
    "remind",
    "tomorrow",
    "today",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
    "am",
    "pm"
  ];

  if (
    reminderWords.some(
      word => value.includes(word)
    )
  ) {
    return {
      type: "task",
      label: "✅ Task + possible reminder"
    };
  }

  if (
    value.includes("|") ||
    value.includes("table:")
  ) {
    return {
      type: "table",
      label: "📋 Table or structured list"
    };
  }

  if (
    value.includes("\n-") ||
    value.includes("\n•")
  ) {
    return {
      type: "note",
      label: "📝 Note or list"
    };
  }

  const actionWords = [
    "buy ",
    "send ",
    "finish ",
    "submit ",
    "call ",
    "email ",
    "book ",
    "pay ",
    "check ",
    "clean ",
    "prepare ",
    "review "
  ];

  if (
    actionWords.some(
      word => value.startsWith(word)
    )
  ) {
    return {
      type: "task",
      label: "✅ Task"
    };
  }

  return {
    type: "note",
    label: "📝 Note"
  };
}

function updateCapturePrediction() {
  const input =
    document.getElementById(
      "quickCaptureInput"
    );

  const prediction =
    document.getElementById(
      "capturePrediction"
    );

  if (!input || !prediction) {
    return;
  }

  const result =
    predictCapture(input.value);

  prediction.textContent =
    result.label;
}

function saveQuickCapture() {
  const text =
    document
      .getElementById("quickCaptureInput")
      .value
      .trim();

  const space =
    document
      .getElementById("captureSpace")
      .value;

  if (!text) {
    showToast("Write something first 🌸");
    return;
  }

  const prediction =
    predictCapture(text);

  if (prediction.type === "task") {
    state.tasks.push({
      id: createId(),
      title: text.split("\n")[0],
      space,
      priority: "medium",
      status: "todo",
      dueDate: "",
      dueTime: "",
      notes: text,
      completed: false,
      rolling: false,
      repeatDays: 0,
      createdAt: Date.now()
    });

    showToast("Planted as a task 🌱");
  }

  else if (prediction.type === "table") {
    state.tableRows.push({
      id: createId(),
      item: text.split("\n")[0],
      amount: 0,
      dueDate: "",
      status: "upcoming",
      reminder: false,
      createdAt: Date.now()
    });

    showToast("Added to Smart Tables 📋");
  }

  else {
    state.notes.push({
      id: createId(),
      title:
        text.split("\n")[0]
          .slice(0, 50),
      content: text,
      space,
      pinned: false,
      createdAt: Date.now()
    });

    showToast("Saved as a note 📝");
  }

  document.getElementById(
    "quickCaptureInput"
  ).value = "";

  updateCapturePrediction();

  closeModal("quickCaptureModal");

  render();
}

/* =====================================================
   SAVE FORMS
   ===================================================== */

function saveTask() {
  const title =
    document
      .getElementById("taskTitle")
      .value
      .trim();

  if (!title) {
    showToast("Give the task a name 🌸");
    return;
  }

  const rolling =
    document
      .getElementById("taskRolling")
      .checked;

  state.tasks.push({
    id: createId(),

    title,

    space:
      document.getElementById(
        "taskSpace"
      ).value,

    priority:
      document.getElementById(
        "taskPriority"
      ).value,

    status:
      document.getElementById(
        "taskStatus"
      ).value,

    dueDate:
      document.getElementById(
        "taskDate"
      ).value,

    dueTime:
      document.getElementById(
        "taskTime"
      ).value,

    notes:
      document.getElementById(
        "taskNotes"
      ).value.trim(),

    completed: false,

    rolling,

    repeatDays:
      rolling
        ? Number(
            document.getElementById(
              "taskRepeatDays"
            ).value || 7
          )
        : 0,

    createdAt: Date.now()
  });

  clearTaskForm();

  closeModal("taskModal");

  showToast("A new bloom was planted 🌱");

  render();
}

function clearTaskForm() {
  [
    "taskTitle",
    "taskDate",
    "taskTime",
    "taskNotes"
  ].forEach(id => {
    document.getElementById(id).value = "";
  });

  document.getElementById(
    "taskPriority"
  ).value = "medium";

  document.getElementById(
    "taskStatus"
  ).value = "todo";

  document.getElementById(
    "taskRolling"
  ).checked = false;

  document.getElementById(
    "rollingOptions"
  ).classList.add("hidden");
}

function saveNote() {
  const title =
    document
      .getElementById("noteTitle")
      .value
      .trim();

  const content =
    document
      .getElementById("noteContent")
      .value
      .trim();

  if (!title && !content) {
    showToast("Write something first 🌸");
    return;
  }

  state.notes.push({
    id: createId(),
    title: title || "Untitled note",
    content,
    space:
      document.getElementById(
        "noteSpace"
      ).value,
    pinned:
      document.getElementById(
        "notePinned"
      ).checked,
    createdAt: Date.now()
  });

  document.getElementById(
    "noteTitle"
  ).value = "";

  document.getElementById(
    "noteContent"
  ).value = "";

  document.getElementById(
    "notePinned"
  ).checked = false;

  closeModal("noteModal");

  showToast("Note saved 🌸");

  render();
}

function saveReminder() {
  const title =
    document
      .getElementById(
        "reminderTitle"
      )
      .value
      .trim();

  if (!title) {
    showToast("What should Hana remind you about?");
    return;
  }

  const date =
    document.getElementById(
      "reminderDate"
    ).value;

  if (!date) {
    showToast("Choose a reminder date 🌸");
    return;
  }

  state.reminders.push({
    id: createId(),

    title,

    space:
      document.getElementById(
        "reminderSpace"
      ).value,

    date,

    time:
      document.getElementById(
        "reminderTime"
      ).value,

    repeat:
      document.getElementById(
        "reminderRepeat"
      ).value,

    completed: false,
    notified: false,
    createdAt: Date.now()
  });

  document.getElementById(
    "reminderTitle"
  ).value = "";

  document.getElementById(
    "reminderDate"
  ).value = "";

  document.getElementById(
    "reminderTime"
  ).value = "";

  closeModal("reminderModal");

  showToast("Reminder planted 🔔");

  render();
}

function savePin() {
  const title =
    document
      .getElementById("pinTitle")
      .value
      .trim();

  const content =
    document
      .getElementById("pinContent")
      .value
      .trim();

  if (!title) {
    showToast("Give your pin a title 🌸");
    return;
  }

  state.pins.push({
    id: createId(),
    title,
    content,
    space:
      document.getElementById(
        "pinSpace"
      ).value,
    createdAt: Date.now()
  });

  document.getElementById(
    "pinTitle"
  ).value = "";

  document.getElementById(
    "pinContent"
  ).value = "";

  closeModal("pinModal");

  showToast("Pinned 📌");

  render();
}

function saveSomeday() {
  const title =
    document
      .getElementById("somedayTitle")
      .value
      .trim();

  if (!title) {
    showToast("Save an idea first 🌱");
    return;
  }

  state.someday.push({
    id: createId(),

    title,

    category:
      document.getElementById(
        "somedayCategory"
      ).value,

    notes:
      document.getElementById(
        "somedayNotes"
      ).value.trim(),

    createdAt: Date.now()
  });

  document.getElementById(
    "somedayTitle"
  ).value = "";

  document.getElementById(
    "somedayNotes"
  ).value = "";

  closeModal("somedayModal");

  showToast("Saved for someday 🌱");

  render();
}

function saveTableRow() {
  const item =
    document
      .getElementById("tableItem")
      .value
      .trim();

  if (!item) {
    showToast("Give this row a name 🌸");
    return;
  }

  const dueDate =
    document.getElementById(
      "tableDate"
    ).value;

  const reminder =
    document.getElementById(
      "tableReminder"
    ).checked;

  const row = {
    id: createId(),

    item,

    amount:
      Number(
        document.getElementById(
          "tableAmount"
        ).value || 0
      ),

    dueDate,

    status:
      document.getElementById(
        "tableStatus"
      ).value,

    reminder,

    createdAt: Date.now()
  };

  state.tableRows.push(row);

  if (
    reminder &&
    dueDate
  ) {
    state.reminders.push({
      id: createId(),
      title: item,
      space: "personal",
      date: dueDate,
      time: "09:00",
      repeat: "none",
      completed: false,
      notified: false,
      linkedTableRow: row.id,
      createdAt: Date.now()
    });
  }

  document.getElementById(
    "tableItem"
  ).value = "";

  document.getElementById(
    "tableAmount"
  ).value = "";

  document.getElementById(
    "tableDate"
  ).value = "";

  document.getElementById(
    "tableReminder"
  ).checked = false;

  closeModal("tableRowModal");

  showToast("Row added 📋");

  render();
}

/* =====================================================
   REMINDER NOTIFICATIONS
   ===================================================== */

async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    showToast(
      "Notifications aren't supported by this browser."
    );

    return;
  }

  const result =
    await Notification.requestPermission();

  if (result === "granted") {
    showToast("Hana notifications enabled 🔔");
    checkReminders();
  }

  else {
    showToast(
      "Notification permission wasn't enabled."
    );
  }
}

function checkReminders() {
  if (
    !("Notification" in window) ||
    Notification.permission !== "granted"
  ) {
    return;
  }

  const now =
    new Date();

  state.reminders.forEach(
    reminder => {
      if (
        reminder.completed ||
        reminder.notified ||
        !reminder.date
      ) {
        return;
      }

      const target =
        new Date(
          `${reminder.date}T${
            reminder.time || "09:00"
          }:00`
        );

      if (
        target <= now
      ) {
        new Notification(
          `Hana 🌸`,
          {
            body: reminder.title,
            icon: "icons/icon-192.png"
          }
        );

        reminder.notified = true;

        saveState();
      }
    }
  );
}

/* =====================================================
   REPEATING REMINDERS
   ===================================================== */

function advanceReminder(reminder) {
  if (
    !reminder ||
    reminder.repeat === "none"
  ) {
    return;
  }

  const date =
    new Date(
      `${reminder.date}T12:00:00`
    );

  if (reminder.repeat === "daily") {
    date.setDate(date.getDate() + 1);
  }

  if (reminder.repeat === "weekly") {
    date.setDate(date.getDate() + 7);
  }

  if (reminder.repeat === "monthly") {
    date.setMonth(date.getMonth() + 1);
  }

  reminder.date =
    localDateISO(date);

  reminder.completed = false;
  reminder.notified = false;
}

function completeReminder(id) {
  const reminder =
    state.reminders.find(
      item => item.id === id
    );

  if (!reminder) {
    return;
  }

  if (reminder.repeat !== "none") {
    advanceReminder(reminder);

    showToast(
      `Next reminder scheduled ${reminder.repeat} 🌱`
    );
  }

  else {
    reminder.completed = true;

    showToast("Reminder cleared 🌸");
  }

  render();
}

/* =====================================================
   DELETE FUNCTIONS
   ===================================================== */

function deletePin(id) {
  if (!confirm("Delete this pin?")) {
    return;
  }

  state.pins =
    state.pins.filter(
      pin => pin.id !== id
    );

  render();
}

function deleteSomeday(id) {
  if (!confirm("Remove this someday item?")) {
    return;
  }

  state.someday =
    state.someday.filter(
      item => item.id !== id
    );

  render();
}

function deleteTableRow(id) {
  if (!confirm("Delete this row?")) {
    return;
  }

  state.tableRows =
    state.tableRows.filter(
      row => row.id !== id
    );

  render();
}

/* =====================================================
   EXPORT BACKUP
   ===================================================== */

function exportData() {
  const blob =
    new Blob(
      [
        JSON.stringify(
          state,
          null,
          2
        )
      ],
      {
        type: "application/json"
      }
    );

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;

  link.download =
    `hana-backup-${todayISO()}.json`;

  document.body.appendChild(link);

  link.click();
  link.remove();

  URL.revokeObjectURL(url);

  showToast("Hana backup exported 🌸");
}

/* =====================================================
   CLICK HANDLING
   ===================================================== */

document.addEventListener(
  "click",
  event => {

    const nav =
      event.target.closest(
        "[data-page]"
      );

    if (
      nav &&
      !nav.classList.contains(
        "nav-center-placeholder"
      )
    ) {
      changePage(
        nav.dataset.page
      );

      return;
    }

    const goto =
      event.target.closest(
        "[data-goto]"
      );

    if (goto) {
      changePage(
        goto.dataset.goto
      );

      return;
    }

    const mode =
      event.target.closest(
        "[data-mode]"
      );

    if (mode) {
      state.currentMode =
        mode.dataset.mode;

      render();

      return;
    }

    const open =
      event.target.closest(
        "[data-open]"
      );

    if (open) {
      openModal(
        open.dataset.open
      );

      return;
    }

    const close =
      event.target.closest(
        "[data-close-modal]"
      );

    if (close) {
      closeModal(
        close.dataset.closeModal
      );

      return;
    }

    const filter =
      event.target.closest(
        "[data-task-filter]"
      );

    if (filter) {
      state.taskFilter =
        filter.dataset.taskFilter;

      render();

      return;
    }

    const toggleTaskButton =
      event.target.closest(
        "[data-toggle-task]"
      );

    if (toggleTaskButton) {
      toggleTask(
        toggleTaskButton.dataset.toggleTask
      );

      return;
    }

    const cycleTaskButton =
      event.target.closest(
        "[data-cycle-task]"
      );

    if (cycleTaskButton) {
      cycleTaskStatus(
        cycleTaskButton.dataset.cycleTask
      );

      return;
    }

    const deleteTaskButton =
      event.target.closest(
        "[data-delete-task]"
      );

    if (deleteTaskButton) {
      deleteTask(
        deleteTaskButton.dataset.deleteTask
      );

      return;
    }

    const deleteNoteButton =
      event.target.closest(
        "[data-delete-note]"
      );

    if (deleteNoteButton) {
      deleteNote(
        deleteNoteButton.dataset.deleteNote
      );

      return;
    }

    const completeReminderButton =
      event.target.closest(
        "[data-complete-reminder]"
      );

    if (completeReminderButton) {
      completeReminder(
        completeReminderButton.dataset
          .completeReminder
      );

      return;
    }

    const deletePinButton =
      event.target.closest(
        "[data-delete-pin]"
      );

    if (deletePinButton) {
      deletePin(
        deletePinButton.dataset.deletePin
      );

      return;
    }

    const deleteSomedayButton =
      event.target.closest(
        "[data-delete-someday]"
      );

    if (deleteSomedayButton) {
      deleteSomeday(
        deleteSomedayButton.dataset
          .deleteSomeday
      );

      return;
    }

    const deleteRowButton =
      event.target.closest(
        "[data-delete-row]"
      );

    if (deleteRowButton) {
      deleteTableRow(
        deleteRowButton.dataset.deleteRow
      );

      return;
    }

    const closeAction =
      event.target.closest(
        "[data-close-action]"
      );

    if (closeAction) {
      if (
        closeAction.dataset.closeAction ===
        "tomorrow"
      ) {
        moveTodayTasksToTomorrow();
      }

      else if (
        closeAction.dataset.closeAction ===
        "finish"
      ) {
        finishDailyClose();
      }

      return;
    }

    const emptyAction =
      event.target.closest(
        "[data-empty-action]"
      );

    if (emptyAction) {
      const actions = {
        "open-task": "taskModal",
        "open-note": "noteModal",
        "open-reminder": "reminderModal",
        "open-pin": "pinModal",
        "open-someday": "somedayModal",
        "open-table": "tableRowModal"
      };

      const modal =
        actions[
          emptyAction.dataset.emptyAction
        ];

      if (modal) {
        openModal(modal);
      }

      return;
    }

    const actionButton =
      event.target.closest(
        "[data-action]"
      );

    if (actionButton) {
      closeModal("addMenu");

      const actions = {
        quick: "quickCaptureModal",
        task: "taskModal",
        note: "noteModal",
        reminder: "reminderModal",
        pin: "pinModal",
        someday: "somedayModal",
        table: "tableRowModal"
      };

      openModal(
        actions[
          actionButton.dataset.action
        ]
      );

      return;
    }

    if (
      event.target.id ===
      "exportDataButton"
    ) {
      exportData();
    }
  }
);

/* =====================================================
   INPUT HANDLING
   ===================================================== */

document.addEventListener(
  "input",
  event => {

    if (
      event.target.id ===
      "quickCaptureInput"
    ) {
      updateCapturePrediction();
    }

    if (
      event.target.id ===
      "noteSearch"
    ) {
      searchNotes(
        event.target.value
      );
    }
  }
);

/* =====================================================
   MAIN BUTTONS
   ===================================================== */

document
  .getElementById("mainAddButton")
  .addEventListener(
    "click",
    () => openModal("addMenu")
  );

document
  .getElementById(
    "quickCaptureHeader"
  )
  .addEventListener(
    "click",
    () =>
      openModal(
        "quickCaptureModal"
      )
  );

document
  .getElementById(
    "notificationButton"
  )
  .addEventListener(
    "click",
    requestNotificationPermission
  );

document
  .getElementById(
    "saveQuickCapture"
  )
  .addEventListener(
    "click",
    saveQuickCapture
  );

document
  .getElementById(
    "saveTaskButton"
  )
  .addEventListener(
    "click",
    saveTask
  );

document
  .getElementById(
    "saveNoteButton"
  )
  .addEventListener(
    "click",
    saveNote
  );

document
  .getElementById(
    "saveReminderButton"
  )
  .addEventListener(
    "click",
    saveReminder
  );

document
  .getElementById(
    "savePinButton"
  )
  .addEventListener(
    "click",
    savePin
  );

document
  .getElementById(
    "saveSomedayButton"
  )
  .addEventListener(
    "click",
    saveSomeday
  );

document
  .getElementById(
    "saveTableRowButton"
  )
  .addEventListener(
    "click",
    saveTableRow
  );

/* =====================================================
   ROLLING TASK UI
   ===================================================== */

document
  .getElementById("taskRolling")
  .addEventListener(
    "change",
    event => {
      document
        .getElementById(
          "rollingOptions"
        )
        .classList.toggle(
          "hidden",
          !event.target.checked
        );
    }
  );

/* =====================================================
   CLOSE MODAL WHEN BACKDROP IS PRESSED
   ===================================================== */

document
  .querySelectorAll(
    ".modal-overlay"
  )
  .forEach(overlay => {

    overlay.addEventListener(
      "click",
      event => {
        if (
          event.target === overlay
        ) {
          overlay.classList.add(
            "hidden"
          );
        }
      }
    );

  });

/* =====================================================
   SERVICE WORKER
   ===================================================== */

if ("serviceWorker" in navigator) {
  window.addEventListener(
    "load",
    () => {

      navigator.serviceWorker
        .register(
          "./service-worker.js"
        )
        .then(() => {
          console.log(
            "Hana service worker registered."
          );
        })
        .catch(error => {
          console.error(
            "Service worker registration failed:",
            error
          );
        });

    }
  );
}

/* =====================================================
   REMINDER CHECK LOOP
   ===================================================== */

setInterval(
  checkReminders,
  30 * 1000
);

checkReminders();

/* =====================================================
   INITIAL RENDER
   ===================================================== */

render();