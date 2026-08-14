/* =====================================================
   HANA 🌸 Smart Template Garden v1.1
   Expanded local-first Smart Sort profiles + paste guide
   ===================================================== */

(() => {
  const PROFILE_STATUS = ["planned", "in progress", "waiting", "done", "skipped"];

  const EXPANDED_SMART_PROFILES = {
    "trip-prep": {
      name:"Trip Prep", icon:"✈️", category:"Travel", creator:"tracker", sectioned:true,
      columns:[
        {name:"Area",type:"text"},{name:"Item / Task",type:"text"},{name:"Deadline",type:"date"},{name:"Status",type:"status"},{name:"Notes",type:"text"}
      ],
      patterns:[/\btrip\s+prep(?:aration)?\b/i,/\bpre[- ]?trip\s+(?:plan|checklist)\b/i,/\bbefore\s+you\s+go\b/i,/\btravel\s+prep\b/i]
    },
    "home-maintenance": {
      name:"Home Maintenance", icon:"🏡", category:"Home", creator:"tracker", sectioned:true,
      columns:[
        {name:"Area / Item",type:"text"},{name:"Maintenance",type:"text"},{name:"Last done",type:"date"},{name:"Next due",type:"date"},{name:"Frequency",type:"text"},{name:"Notes",type:"text"}
      ],
      patterns:[/\bhome\s+maintenance\b/i,/\bmaintenance\s+schedule\b/i,/\bfilter\s+replacement\b/i,/\bservice\s+due\b/i]
    },
    "budget-plan": {
      name:"Budget Plan", icon:"💸", category:"Money", creator:"tracker",
      columns:[
        {name:"Category",type:"text"},{name:"Planned",type:"money"},{name:"Actual",type:"money"},{name:"Due date",type:"date"},{name:"Status",type:"status"},{name:"Notes",type:"text"}
      ],
      patterns:[/\bbudget\s+plan\b/i,/\bmonthly\s+budget\b/i,/\bplanned\s+(?:vs\.?|and)\s+actual\b/i,/\bbudget\s+categories\b/i]
    },
    "bills-schedule": {
      name:"Bills Schedule", icon:"🧾", category:"Money", creator:"tracker",
      columns:[
        {name:"Bill",type:"text"},{name:"Amount",type:"money"},{name:"Due date",type:"date"},{name:"Frequency",type:"text"},{name:"Status",type:"status"},{name:"Notes",type:"text"}
      ],
      patterns:[/\bbills?\s+(?:schedule|planner|list)\b/i,/\bmonthly\s+bills?\b/i,/\bbill\s+due\s+dates?\b/i]
    },
    "cleaning-plan": {
      name:"Cleaning Plan", icon:"🧹", category:"Home", creator:"tracker", sectioned:true,
      columns:[
        {name:"Area",type:"text"},{name:"Task",type:"text"},{name:"Frequency",type:"text"},{name:"Last done",type:"date"},{name:"Next due",type:"date"},{name:"Notes",type:"text"}
      ],
      patterns:[/\bcleaning\s+(?:plan|schedule|routine)\b/i,/\bhouse\s+cleaning\b/i,/\bweekly\s+clean(?:ing)?\b/i]
    },
    "household-routine": {
      name:"Household Routine", icon:"🧺", category:"Home", creator:"tracker", sectioned:true,
      columns:[
        {name:"Area",type:"text"},{name:"Task",type:"text"},{name:"Frequency",type:"text"},{name:"Preferred day / time",type:"text"},{name:"Notes",type:"text"}
      ],
      patterns:[/\bhousehold\s+routine\b/i,/\bhome\s+routine\b/i,/\bchores?\s+(?:schedule|routine)\b/i]
    },
    "event-planner": {
      name:"Event Planner", icon:"🎉", category:"Events", creator:"tracker", sectioned:true,
      columns:[
        {name:"Area",type:"text"},{name:"Task",type:"text"},{name:"Due date",type:"date"},{name:"Owner",type:"text"},{name:"Status",type:"status"},{name:"Notes",type:"text"}
      ],
      patterns:[/\bevent\s+(?:plan|planner|checklist)\b/i,/\bparty\s+(?:plan|planner|checklist)\b/i]
    },
    "birthday-planner": {
      name:"Birthday Planner", icon:"🎂", category:"Events", creator:"tracker", sectioned:true,
      columns:[
        {name:"Category",type:"text"},{name:"Item / Task",type:"text"},{name:"Due date",type:"date"},{name:"Budget",type:"money"},{name:"Status",type:"status"},{name:"Notes",type:"text"}
      ],
      patterns:[/\bbirthday\s+(?:plan|planner|party|checklist)\b/i]
    },
    "wedding-planner": {
      name:"Wedding Planner", icon:"💍", category:"Events", creator:"tracker", sectioned:true,
      columns:[
        {name:"Category",type:"text"},{name:"Item / Task",type:"text"},{name:"Vendor / Person",type:"text"},{name:"Due date",type:"date"},{name:"Budget",type:"money"},{name:"Status",type:"status"},{name:"Notes",type:"text"}
      ],
      patterns:[/\bwedding\s+(?:plan|planner|checklist|prep)\b/i]
    },
    "gift-planner": {
      name:"Gift Planner", icon:"🎁", category:"Personal", creator:"tracker",
      columns:[
        {name:"Recipient",type:"text"},{name:"Occasion",type:"text"},{name:"Gift idea",type:"text"},{name:"Budget",type:"money"},{name:"Status",type:"status"},{name:"Notes",type:"text"}
      ],
      patterns:[/\bgift\s+(?:plan|planner|list)\b/i,/\bchristmas\s+gifts?\b/i]
    },
    "moving-plan": {
      name:"Moving Plan", icon:"📦", category:"Home", creator:"tracker", sectioned:true,
      columns:[
        {name:"Room / Area",type:"text"},{name:"Item / Task",type:"text"},{name:"Action",type:"text"},{name:"Deadline",type:"date"},{name:"Status",type:"status"},{name:"Notes",type:"text"}
      ],
      patterns:[/\bmoving\s+(?:plan|planner|checklist)\b/i,/\bmove\s+house\b/i,/\brelocation\s+(?:plan|checklist)\b/i]
    },
    "self-care": {
      name:"Self-Care Planner", icon:"💆", category:"Health & beauty", creator:"tracker", sectioned:true,
      columns:[
        {name:"Care area",type:"text"},{name:"Activity / Product",type:"text"},{name:"Frequency",type:"text"},{name:"Preferred day / time",type:"text"},{name:"Notes",type:"text"}
      ],
      patterns:[/\bself[- ]?care\s+(?:plan|planner|routine)\b/i,/\bbody\s+care\s+routine\b/i]
    },
    "haircare": {
      name:"Haircare Schedule", icon:"💇", category:"Health & beauty", creator:"tracker", sectioned:true,
      columns:[
        {name:"Day",type:"text"},{name:"Step",type:"text"},{name:"Product",type:"text"},{name:"Frequency",type:"text"},{name:"Notes",type:"text"}
      ],
      patterns:[/\bhair\s*care\s+(?:plan|schedule|routine)\b/i,/\bhaircare\s+(?:plan|schedule|routine)\b/i,/\bwash\s+day\s+routine\b/i,/\bscalp\s+care\b/i]
    },
    "health-log": {
      name:"Health Log", icon:"🩺", category:"Health & beauty", creator:"tracker",
      columns:[
        {name:"Date",type:"date"},{name:"Symptom / Metric",type:"text"},{name:"Value / Severity",type:"text"},{name:"Medication / Action",type:"text"},{name:"Notes",type:"text"}
      ],
      patterns:[/\bhealth\s+log\b/i,/\bsymptom\s+log\b/i,/\bsymptom\s+tracker\b/i]
    },
    "medical-prep": {
      name:"Medical / Lab Prep", icon:"🧪", category:"Health & beauty", creator:"tracker", sectioned:true,
      columns:[
        {name:"Requirement / Question",type:"text"},{name:"Type",type:"text"},{name:"Deadline / Appointment",type:"date"},{name:"Status",type:"status"},{name:"Notes",type:"text"}
      ],
      patterns:[/\bmedical\s+appointment\s+prep\b/i,/\bdoctor\s+appointment\s+prep\b/i,/\blab\s+(?:test\s+)?prep\b/i,/\bfasting\s+requirements?\b/i,/\bquestions?\s+for\s+(?:the\s+)?doctor\b/i]
    },
    "pet-care": {
      name:"Pet Care Plan", icon:"🐾", category:"Home", creator:"tracker", sectioned:true,
      columns:[
        {name:"Pet",type:"text"},{name:"Care item",type:"text"},{name:"Frequency",type:"text"},{name:"Next due",type:"date"},{name:"Notes",type:"text"}
      ],
      patterns:[/\bpet\s+care\s+(?:plan|schedule|routine)\b/i,/\bvet\s+schedule\b/i,/\bpet\s+vaccin(?:e|ation)\b/i]
    },
    "plant-care": {
      name:"Plant Care Plan", icon:"🌿", category:"Home", creator:"tracker", sectioned:true,
      columns:[
        {name:"Plant",type:"text"},{name:"Care item",type:"text"},{name:"Frequency",type:"text"},{name:"Next due",type:"date"},{name:"Notes",type:"text"}
      ],
      patterns:[/\bplant\s+care\s+(?:plan|schedule|routine)\b/i,/\bwatering\s+schedule\b/i,/\brepot(?:ting)?\s+schedule\b/i]
    },
    "game-backlog": {
      name:"Game Backlog", icon:"🎮", category:"Hobbies", creator:"tracker",
      columns:[
        {name:"Game",type:"text"},{name:"Platform",type:"text"},{name:"Status",type:"status"},{name:"Priority",type:"text"},{name:"Notes",type:"text"}
      ],
      patterns:[/\bgame\s+backlog\b/i,/\bgames?\s+to\s+play\b/i]
    },
    "wishlist": {
      name:"Wishlist", icon:"⭐", category:"Personal", creator:"tracker",
      columns:[
        {name:"Item",type:"text"},{name:"Store / Link",type:"text"},{name:"Price",type:"money"},{name:"Priority",type:"text"},{name:"Status",type:"status"},{name:"Notes",type:"text"}
      ],
      patterns:[/\bwish\s*list\b/i,/\bthings?\s+i\s+want\b/i]
    },
    "requirements-checklist": {
      name:"Requirements Checklist", icon:"📄", category:"Planning", creator:"tracker", sectioned:true,
      columns:[
        {name:"Requirement",type:"text"},{name:"Category",type:"text"},{name:"Deadline",type:"date"},{name:"Status",type:"status"},{name:"Notes",type:"text"}
      ],
      patterns:[/\brequirements?\s+checklist\b/i,/\bvisa\s+requirements?\b/i,/\bapplication\s+requirements?\b/i,/\bdocuments?\s+required\b/i]
    },
    "wardrobe-planner": {
      name:"Wardrobe / Outfit Planner", icon:"👗", category:"Personal", creator:"tracker", sectioned:true,
      columns:[
        {name:"Item / Outfit",type:"text"},{name:"Category",type:"text"},{name:"Occasion",type:"text"},{name:"Status",type:"status"},{name:"Notes",type:"text"}
      ],
      patterns:[/\bwardrobe\s+(?:plan|planner|list)\b/i,/\boutfit\s+(?:plan|planner|ideas?)\b/i]
    },
    "brainstorm-project": {
      name:"Brainstorm → Project", icon:"💡", category:"Planning", creator:"brainstorm",
      columns:[
        {name:"Type",type:"text"},{name:"Idea / Item",type:"text"},{name:"Notes",type:"text"}
      ],
      patterns:[/\bproject\s+brainstorm\b/i,/^\s*brainstorm\s*[:\-–—]/im,/\bbrainstorm\s+for\b/i]
    },
    "decision-planner": {
      name:"Decision Planner", icon:"🧠", category:"Planning", creator:"tracker", sectioned:true,
      columns:[
        {name:"Option",type:"text"},{name:"Pros",type:"text"},{name:"Cons",type:"text"},{name:"Cost / Effort",type:"text"},{name:"Risk",type:"text"},{name:"Notes / Decision",type:"text"}
      ],
      patterns:[/\bdecision\s+planner\b/i,/\bpros\s+(?:and|&)\s+cons\b/i,/\boptions?\s*:\s*.+\bpros?\b/is]
    },
    "weekly-schedule": {
      name:"Weekly Schedule", icon:"📆", category:"Planning", creator:"tracker",
      columns:[
        {name:"Day",type:"text"},{name:"Time",type:"text"},{name:"Activity",type:"text"},{name:"Location",type:"text"},{name:"Notes",type:"text"}
      ],
      patterns:[/\bweekly\s+schedule\b/i,/\bweek\s+schedule\b/i]
    },
    "daily-schedule": {
      name:"Daily Schedule", icon:"🕒", category:"Planning", creator:"tracker",
      columns:[
        {name:"Time",type:"text"},{name:"Activity",type:"text"},{name:"Location",type:"text"},{name:"Notes",type:"text"}
      ],
      patterns:[/\bdaily\s+schedule\b/i,/\btoday'?s?\s+schedule\b/i,/^\s*schedule\s*:\s*$/im]
    },
    "life-reset": {
      name:"Life Reset", icon:"🌸", category:"Planning", creator:"life-reset",
      columns:[
        {name:"Type",type:"text"},{name:"Item",type:"text"},{name:"When",type:"text"},{name:"Notes",type:"text"}
      ],
      patterns:[/\blife\s+reset\b/i,/\bbrain\s+reset\b/i,/\beverything\s+on\s+my\s+mind\b/i]
    },
    "checklist-generator": {
      name:"Smart Checklist", icon:"☑️", category:"Planning", creator:"list", auto:false,
      patterns:[]
    }
  };

  const SMART_TEMPLATE_CATALOG = [
    {kind:"skincare",icon:"🧴",title:"Weekly Skincare",category:"Health & beauty",description:"AM/PM routines, weekdays, alternates and product exceptions.",example:"Morning Routine\nDaily\nCleanser → [product]\nToner:\nTuesday & Saturday → [product]\nAll other days → [product]\n\nNight Routine\nMonday / Wednesday / Friday\nCleanser → [product]"},
    {kind:"packing",icon:"🧳",title:"Packing List",category:"Travel",description:"Travel items, categories, trip timing and separate reference notes.",example:"Packing List: [trip name]\nPassport\nTops\nShoes\nSkincare (separate note)\nCharger\nPower bank"},
    {kind:"trip-prep",icon:"✈️",title:"Trip Prep",category:"Travel",description:"Documents, bookings, pre-trip tasks and deadlines.",example:"Trip Prep\nDocuments:\nPassport\nTravel insurance\nBookings:\nHotel confirmation\nAirport transfer\nBefore you go:\nDownload offline maps"},
    {kind:"travel-itinerary",icon:"🗺️",title:"Travel Itinerary",category:"Travel",description:"Days, times, places, transport, bookings and notes.",example:"Travel Itinerary\nDay 1\n09:00 | Arrive | Airport\n11:00 | Hotel check-in | [hotel]\n14:00 | Visit | [place]"},
    {kind:"grocery",icon:"🛒",title:"Grocery List",category:"Food & home",description:"Groceries and quantities from a pasted shopping list.",example:"Grocery List\nMilk | 1\nEggs | 12\nRice | 2 kg\nTomatoes | 6"},
    {kind:"meal-plan",icon:"🍱",title:"Meal Planner",category:"Food & home",description:"Days plus breakfast, lunch, dinner and snacks.",example:"Meal Plan\nMonday - Breakfast: [meal]\nMonday - Lunch: [meal]\nMonday - Dinner: [meal]\nTuesday - Breakfast: [meal]"},
    {kind:"recipe",icon:"🍳",title:"Recipe Card",category:"Food & home",description:"Ingredients, timings, servings, method and notes.",example:"[Recipe name]\nServings: 4\nPrep time: 15 min\nIngredients\n- [ingredient]\n- [ingredient]\nMethod\n1. [step]\n2. [step]"},
    {kind:"medication",icon:"💊",title:"Medication / Supplements",category:"Health & beauty",description:"Item, dose, time, days and instructions.",example:"Medication Schedule\n[medicine] | 10 mg | 8:00 AM | Daily | After food\n[vitamin] | 1 capsule | Night | Mon/Wed/Fri"},
    {kind:"workout",icon:"🏋️",title:"Workout Plan",category:"Health & beauty",description:"Exercises, sets, reps, load, rest and notes.",example:"Workout Plan\nSquats 3 x 10\nRows 3 x 12\nPlank 3 x 30 sec\nWalking - 30 min"},
    {kind:"haircare",icon:"💇",title:"Haircare Schedule",category:"Health & beauty",description:"Wash days, treatments, styling and product steps.",example:"Haircare Schedule\nMonday:\nShampoo | [product]\nConditioner | [product]\nWednesday:\nHair mask | [product]\nHeat protectant | [product]"},
    {kind:"self-care",icon:"💆",title:"Self-Care Planner",category:"Health & beauty",description:"Body care, nails, treatments, appointments and frequencies.",example:"Self-Care Plan\nBody care:\nExfoliate - weekly\nNails:\nTrim - every 2 weeks\nAppointments:\nHaircut - every 8 weeks"},
    {kind:"health-log",icon:"🩺",title:"Health Log",category:"Health & beauty",description:"Symptoms, measurements, severity, actions and notes.",example:"Health Log\n2026-08-15 | Headache | 3/10 | Rest | Started after lunch\n2026-08-16 | Temperature | 37.2 | None | Better"},
    {kind:"medical-prep",icon:"🧪",title:"Medical / Lab Prep",category:"Health & beauty",description:"Tests, fasting, requirements and questions for an appointment.",example:"Medical Appointment Prep\nBefore appointment:\nBring previous results\nQuestions:\nAsk about [topic]\nLab prep:\nFasting - 8 hours"},
    {kind:"habit-tracker",icon:"🌱",title:"Habit Tracker",category:"Personal",description:"Habits, frequency, targets and progress notes.",example:"Habit Tracker\nDrink water | Daily | 8 glasses\nStretch | Weekdays | 10 min\nRead | Daily | 20 min"},
    {kind:"routine",icon:"🌅",title:"Morning / Night Routine",category:"Personal",description:"Ordered routine steps with natural headings.",example:"Morning Routine\nMake bed\nDrink water\nGet ready\n\nNight Routine\nPrepare clothes\nCharge phone\nRead"},
    {kind:"household-routine",icon:"🧺",title:"Household Routine",category:"Food & home",description:"Laundry, cleaning, trash and recurring home chores.",example:"Household Routine\nLaundry:\nWash clothes - Saturday\nSheets - every 2 weeks\nKitchen:\nClean fridge - monthly"},
    {kind:"cleaning-plan",icon:"🧹",title:"Cleaning Plan",category:"Food & home",description:"Rooms, cleaning tasks and frequencies.",example:"Cleaning Plan\nBedroom:\nChange sheets - weekly\nVacuum - weekly\nBathroom:\nDeep clean - Saturday"},
    {kind:"home-maintenance",icon:"🏡",title:"Home Maintenance",category:"Food & home",description:"Filters, appliances, servicing and next-due dates.",example:"Home Maintenance\nAir conditioner:\nClean filter | monthly\nService unit | every 6 months\nWater filter:\nReplace cartridge | every 3 months"},
    {kind:"pet-care",icon:"🐾",title:"Pet Care Plan",category:"Food & home",description:"Feeding, grooming, medicine, vaccines and vet visits.",example:"Pet Care Plan\n[pet name]\nVaccination | yearly | 2027-01-10\nGrooming | monthly\nFlea treatment | monthly"},
    {kind:"plant-care",icon:"🌿",title:"Plant Care Plan",category:"Food & home",description:"Watering, fertilizer, repotting, pruning and light needs.",example:"Plant Care\n[plant]\nWater | weekly\nFertilizer | monthly\nRepot | every 12 months"},
    {kind:"budget-plan",icon:"💸",title:"Budget Plan",category:"Money",description:"Planned vs actual spending by category.",example:"Budget Plan\nFood | 5000 | 0\nTransport | 2500 | 0\nShopping | 3000 | 0"},
    {kind:"expenses",icon:"💳",title:"Expense Tracker",category:"Money",description:"Actual purchases, amounts, dates and remarks.",example:"Expenses\nLunch | ₱250 | 2026-08-15\nTaxi | ₱180 | 2026-08-15\nTickets | ₱1200 | 2026-08-16"},
    {kind:"bills-schedule",icon:"🧾",title:"Bills Schedule",category:"Money",description:"Bills, amounts, due dates, recurrence and status.",example:"Bills Schedule\nElectricity | ₱[amount] | 2026-08-25 | Monthly\nInternet | ₱[amount] | 2026-08-28 | Monthly"},
    {kind:"subscriptions",icon:"🔁",title:"Subscription Tracker",category:"Money",description:"Services, costs, renewals and billing frequency.",example:"Subscription Tracker\n[service] | ₱[amount] | 2026-08-20 | Monthly | Active\n[service] | ₱[amount] | 2026-09-01 | Yearly | Active"},
    {kind:"study-plan",icon:"📚",title:"Study Plan",category:"School & work",description:"Subjects, topics, dates, duration and status.",example:"Study Plan\nJapanese | Chapter 8 | 2026-08-17 | 60 min\nMath | Practice set 3 | 2026-08-18 | 45 min"},
    {kind:"project",icon:"🌷",title:"Project Plan",category:"School & work",description:"A project goal plus actionable tasks.",example:"Project: [project name]\nObjective\n[what done means]\nTasks\n- Research\n- Draft\n- Review\n- Finalize"},
    {kind:"brainstorm-project",icon:"💡",title:"Brainstorm → Project",category:"School & work",description:"Ideas, questions, decisions and actions from a brainstorm.",example:"Project Brainstorm: [topic]\nIdeas:\n- [idea]\nQuestions:\n- [question]\nDecisions:\n- [decision]\nActions:\n- [next action]"},
    {kind:"meeting-agenda",icon:"📋",title:"Meeting Agenda",category:"School & work",description:"Purpose, attendees, agenda topics and preparation.",example:"Meeting Agenda\nObjective: [purpose]\nAttendees: [people]\nTopics:\n- [topic]\n- [topic]\nPrep:\n- [item]"},
    {kind:"meeting-minutes",icon:"📝",title:"Meeting Minutes",category:"School & work",description:"Discussion, decisions, actions, owners and next meeting.",example:"Meeting Minutes\nDate: 2026-08-15\nAttendees: [people]\nDiscussion\n[notes]\nDecisions\n[decision]\nAction Items\n[action] | [owner] | 2026-08-20"},
    {kind:"content-calendar",icon:"🗓️",title:"Content Calendar",category:"School & work",description:"Ideas, platforms, publish dates and status.",example:"Content Calendar\n[post idea] | Instagram | 2026-08-20 | Draft\n[video idea] | TikTok | 2026-08-22 | Planned"},
    {kind:"applications",icon:"📨",title:"Job / School Applications",category:"School & work",description:"Applications, dates, stages and next steps.",example:"Application Tracker\n[company] | [role] | 2026-08-15 | Applied | Follow up\n[school] | [program] | 2026-08-18 | Preparing | Submit documents"},
    {kind:"requirements-checklist",icon:"📄",title:"Requirements Checklist",category:"School & work",description:"Visa, school, government or application requirements.",example:"Requirements Checklist\nIdentity:\nPassport\nBirth certificate\nFinancial:\nBank certificate\nDeadline: 2026-09-01"},
    {kind:"inventory",icon:"🏠",title:"Inventory",category:"Food & home",description:"Items, categories, quantities, locations and notes.",example:"Home Inventory\nBath towels | Linen | 4 | Closet\nExtension cord | Electronics | 2 | Utility box"},
    {kind:"deliveries",icon:"📦",title:"Order / Delivery Tracker",category:"Personal",description:"Orders, stores, ETA, status and tracking notes.",example:"Order Tracker\n[order] | [store] | 2026-08-15 | 2026-08-20 | Shipped | [tracking]"},
    {kind:"wishlist",icon:"⭐",title:"Wishlist",category:"Personal",description:"Things you want, prices, stores and priority.",example:"Wishlist\n[item] | [store/link] | ₱[price] | High\n[item] | [store/link] | ₱[price] | Someday"},
    {kind:"gift-planner",icon:"🎁",title:"Gift Planner",category:"Personal",description:"Recipients, occasions, ideas, budgets and purchase status.",example:"Gift Planner\n[person] | Birthday | [gift idea] | ₱[budget] | Idea\n[person] | Christmas | [gift idea] | ₱[budget] | Bought"},
    {kind:"reading-list",icon:"📖",title:"Reading List",category:"Hobbies",description:"Books, authors, status, rating and notes.",example:"Reading List\n[book title] | [author] | To read\n[book title] | [author] | Reading"},
    {kind:"watch-list",icon:"🎬",title:"Watch List",category:"Hobbies",description:"Movies, series or anime with status and rating.",example:"Watch List\n[title] | Anime | Watching\n[title] | Movie | To watch"},
    {kind:"game-backlog",icon:"🎮",title:"Game Backlog",category:"Hobbies",description:"Games, platforms, status and priority.",example:"Game Backlog\n[game] | Switch | Playing | High\n[game] | PC | Backlog | Medium"},
    {kind:"wardrobe-planner",icon:"👗",title:"Wardrobe / Outfit Planner",category:"Personal",description:"Clothes, outfit ideas, occasions and status.",example:"Outfit Planner\nTravel:\n[look 1] | Casual\n[look 2] | Dinner\nWork:\n[look 3] | Meeting"},
    {kind:"event-planner",icon:"🎉",title:"Event Planner",category:"Events",description:"Tasks, owners, deadlines and planning areas.",example:"Event Planner: [event]\nVenue:\nBook venue\nGuests:\nFinalize guest list\nFood:\nConfirm menu"},
    {kind:"birthday-planner",icon:"🎂",title:"Birthday Planner",category:"Events",description:"Guests, cake, food, decor, gifts and budget.",example:"Birthday Planner\nGuests:\nFinalize list\nFood:\nOrder cake\nDecor:\nBuy decorations\nBudget:\n₱[amount]"},
    {kind:"wedding-planner",icon:"💍",title:"Wedding Planner",category:"Events",description:"Vendors, payments, guests, fittings, documents and timeline.",example:"Wedding Planner\nVenue:\nBook ceremony venue\nSuppliers:\nPhotographer | [name]\nDocuments:\nMarriage license\nFittings:\nDress fitting | 2026-09-10"},
    {kind:"moving-plan",icon:"📦",title:"Moving Plan",category:"Home",description:"Rooms, packing, donate/sell/keep and moving deadlines.",example:"Moving Plan\nBedroom:\nClothes | Pack\nBooks | Donate\nUtilities:\nTransfer internet\nAddress changes:\nUpdate bank address"},
    {kind:"decision-planner",icon:"🧠",title:"Decision Planner",category:"Planning",description:"Options, pros, cons, costs, risks and final decision notes.",example:"Decision Planner: [decision]\nOption A:\nPros: [pros]\nCons: [cons]\nCost: [cost]\nOption B:\nPros: [pros]\nCons: [cons]"},
    {kind:"decision-log",icon:"⚖️",title:"Decision Log",category:"Planning",description:"Decisions, rationale, owners and follow-up.",example:"Decision Log\n[decision] | [rationale] | [owner] | 2026-08-15 | [follow-up]"},
    {kind:"weekly-schedule",icon:"📆",title:"Weekly Schedule",category:"Planning",description:"Monday–Sunday activities with times and locations.",example:"Weekly Schedule\nMonday | 08:00 | Work | Office\nTuesday | 19:00 | Class | Online\nSaturday | 10:00 | Errands | Mall"},
    {kind:"daily-schedule",icon:"🕒",title:"Daily Schedule",category:"Planning",description:"A simple time-based day plan.",example:"Daily Schedule\n07:00 | Wake up\n08:30 | Work\n12:00 | Lunch\n18:00 | Dinner\n20:00 | Study"},
    {kind:"life-reset",icon:"🌸",title:"Life Reset",category:"Planning",description:"A giant brain dump classified into a reviewable life-reset tracker.",example:"Life Reset\nBook dentist appointment\nBuy shampoo\nFinish report by Friday\nIdea: weekend trip\nRemember mom's birthday"},
    {kind:"checklist-generator",icon:"☑️",title:"Smart Checklist Generator",category:"Planning",description:"Turn any sectioned list into a categorized reusable checklist.",example:"[Checklist name]\nBefore:\n[item]\n[item]\nDuring:\n[item]\nAfter:\n[item]"},
    {kind:"bookmarks",icon:"🔖",title:"Bookmark Library",category:"Hobbies",description:"Links with titles, categories and notes.",example:"Bookmarks\n[useful guide] https://example.com\n[reference] https://example.org\n[tool] https://example.net"}
  ];

  Object.keys(EXPANDED_SMART_PROFILES).forEach(kind => SMART_STRUCTURED_CAPTURE_TYPES.add(kind));

  function profileFor(kind){ return EXPANDED_SMART_PROFILES[kind] || null; }
  function catalogFor(kind){ return SMART_TEMPLATE_CATALOG.find(item => item.kind === kind) || null; }

  function detectExpandedProfile(text){
    const raw=String(text||"").trim();
    if(!raw)return "";
    const ordered=["wedding-planner","birthday-planner","haircare","medical-prep","trip-prep","moving-plan","home-maintenance","cleaning-plan","household-routine","self-care","health-log","pet-care","plant-care","budget-plan","bills-schedule","gift-planner","requirements-checklist","wardrobe-planner","game-backlog","wishlist","brainstorm-project","decision-planner","weekly-schedule","daily-schedule","life-reset","event-planner"];
    for(const kind of ordered){
      const profile=profileFor(kind);if(!profile||profile.auto===false)continue;
      if((profile.patterns||[]).some(pattern=>pattern.test(raw)))return kind;
    }
    return "";
  }

  const baseKind = smartStructuredCaptureKind;
  smartStructuredCaptureKind = function(text, forcedType="auto"){
    if(profileFor(forcedType))return forcedType;
    const expanded=detectExpandedProfile(text);
    if(expanded)return expanded;
    return baseKind(text,forcedType);
  };

  const baseLabel = smartStructuredCaptureLabel;
  smartStructuredCaptureLabel = function(kind){
    const profile=profileFor(kind);if(profile)return `${profile.icon} ${profile.name} · smart template detected`;
    return baseLabel(kind);
  };

  function cleanProfileLines(text,profile){
    const lines=String(text||"").replace(/\r/g,"").split("\n").map(line=>smartCleanBullet(line).replace(/^#{1,6}\s*/,"").trim()).filter(Boolean).filter(line=>!/^[-–—━─⸻\s]+$/.test(line));
    if(!lines.length)return[];
    const first=lines[0];
    const headingPattern=new RegExp(`^(?:${profile.name.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}|${profile.name.replace(/\s+Planner$/i,"").replace(/[.*+?^${}()|[\]\\]/g,"\\$&")})\\s*(?::|[-–—])?`,"i");
    if(headingPattern.test(first)||((profile.patterns||[]).some(pattern=>pattern.test(first))&&first.length<90))lines.shift();
    return lines;
  }

  function smartProfileTitle(text,profile){
    const first=String(text||"").split(/\r?\n/).map(line=>smartCleanBullet(line).replace(/^#{1,6}\s*/,"").trim()).find(Boolean)||"";
    const tail=first.match(/[:–—-]\s*(.+)$/)?.[1]?.trim()||"";
    if(tail&&tail.length<=70&&!/^\d/.test(tail))return `${tail} · ${profile.name}`;
    return profile.name;
  }

  function profileRowParts(line){
    const text=String(line||"").trim();if(!text)return[];
    if(text.includes("\t"))return text.split("\t").map(value=>value.trim());
    if(text.includes("|"))return text.split("|").map(value=>value.trim());
    if((text.match(/,/g)||[]).length>=2)return text.split(",").map(value=>value.trim());
    if(/\s+[–—-]\s+/.test(text))return text.split(/\s+[–—-]\s+/).map(value=>value.trim());
    const colon=text.match(/^([^:]{1,35}):\s*(.+)$/);if(colon)return[colon[1].trim(),colon[2].trim()];
    return[text];
  }

  function isSectionHeading(line){
    const text=String(line||"").trim();
    return text.length<=42&&(/:$/.test(text)||/^(documents?|bookings?|before you go|clothes?|food|venue|guests?|suppliers?|vendors?|decor|budget|bedroom|bathroom|kitchen|living room|utilities|address changes?|ideas?|questions?|decisions?|actions?|pros?|cons?|option [a-z0-9]+)$/i.test(text));
  }

  function createProfileTracker(text,space,kind,options={}){
    const profile=profileFor(kind);if(!profile)return`invalid-${kind}`;
    const lines=cleanProfileLines(text,profile);if(!lines.length)return`invalid-${kind}`;
    const columns=profile.columns.map(column=>({id:createId(),name:column.name,type:column.type}));
    const rows=[];let section="";
    for(const source of lines){
      if(isSectionHeading(source)){section=source.replace(/:$/,"").trim();continue;}
      const parts=profileRowParts(source);if(!parts.length)continue;
      let values=parts.slice(0,columns.length);
      if(profile.sectioned&&section){
        if(values.length===1)values=[section,values[0]];
        else if(values[0]!==section&&columns[0])values=[section,...values].slice(0,columns.length);
      }
      rows.push({id:createId(),values:Object.fromEntries(columns.map((column,index)=>[column.id,String(values[index]??"").trim()])),createdAt:Date.now(),updatedAt:Date.now()});
      if(rows.length>=180)break;
    }
    if(!rows.length)return`invalid-${kind}`;
    const table=normalizeTable({id:createId(),name:smartProfileTitle(text,profile),space,project:"",columns,statusOptions:PROFILE_STATUS.slice(),sortMode:"manual",sortColumnId:columns[0]?.id||"",sortDirection:"asc",rowView:"compact",rows,createdAt:Date.now(),updatedAt:Date.now()});
    state.tables.push(table);state.activeTableId=table.id;saveState();
    if(!options.quiet)showToast(`${profile.name} created · ${rows.length} row${rows.length===1?"":"s"} ${profile.icon}`);
    if(options.open)changePage("tables");
    return kind;
  }

  function createProfileList(text,space,kind,options={}){
    const profile=profileFor(kind);if(!profile)return`invalid-${kind}`;
    const lines=cleanProfileLines(text,profile);if(!lines.length)return`invalid-${kind}`;
    const items=[];let section="";
    for(const source of lines){
      if(isSectionHeading(source)){section=source.replace(/:$/,"").trim();continue;}
      const title=String(source||"").trim();if(!title)continue;
      items.push({id:createId(),title,quantity:"",detail:section,completed:false,createdAt:Date.now(),updatedAt:Date.now()});
      if(items.length>=240)break;
    }
    if(!items.length)return`invalid-${kind}`;
    const list=normalizeList({id:createId(),name:smartProfileTitle(text,profile),icon:profile.icon,space,templateType:"",quantityLabel:"",detailLabel:items.some(item=>item.detail)?"Category":"",columnMode:false,items,createdAt:Date.now(),updatedAt:Date.now()});
    state.lists.push(list);state.activeListId=list.id;saveState();
    if(!options.quiet)showToast(`${profile.name} created · ${items.length} item${items.length===1?"":"s"} ${profile.icon}`);
    if(options.open)changePage("lists");
    return kind;
  }

  function createBrainstormTracker(text,space,kind,options={}){
    const profile=profileFor(kind),lines=cleanProfileLines(text,profile);if(!lines.length)return`invalid-${kind}`;
    const columns=profile.columns.map(column=>({id:createId(),name:column.name,type:column.type}));
    let section="Idea";const rows=[];
    for(const source of lines){
      if(isSectionHeading(source)){section=source.replace(/:$/,"").trim();continue;}
      const explicit=source.match(/^(idea|question|decision|action|risk|note)\s*:\s*(.+)$/i);
      const type=explicit?explicit[1]:section,item=explicit?explicit[2]:source;
      rows.push({id:createId(),values:{[columns[0].id]:type,[columns[1].id]:item,[columns[2].id]:""},createdAt:Date.now(),updatedAt:Date.now()});
      if(rows.length>=180)break;
    }
    const table=normalizeTable({id:createId(),name:smartProfileTitle(text,profile),space,columns,statusOptions:PROFILE_STATUS.slice(),sortMode:"manual",rows,createdAt:Date.now(),updatedAt:Date.now()});
    state.tables.push(table);state.activeTableId=table.id;saveState();if(!options.quiet)showToast(`Brainstorm organized · ${rows.length} idea${rows.length===1?"":"s"} 💡`);if(options.open)changePage("tables");return kind;
  }

  function createLifeReset(text,space,kind,options={}){
    const profile=profileFor(kind),lines=cleanProfileLines(text,profile).slice(0,80);if(!lines.length)return`invalid-${kind}`;
    const columns=profile.columns.map(column=>({id:createId(),name:column.name,type:column.type}));
    const rows=lines.map(line=>{
      const prediction=predictCapture(line),meta=parseCaptureMeta(line,space);
      return{id:createId(),values:{[columns[0].id]:prediction.label,[columns[1].id]:meta.title||line,[columns[2].id]:[meta.date,meta.time].filter(Boolean).join(" "),[columns[3].id]:""},createdAt:Date.now(),updatedAt:Date.now()};
    });
    const table=normalizeTable({id:createId(),name:"Life Reset",space,columns,statusOptions:PROFILE_STATUS.slice(),sortMode:"manual",rows,createdAt:Date.now(),updatedAt:Date.now()});
    state.tables.push(table);state.activeTableId=table.id;saveState();if(!options.quiet)showToast(`Life Reset organized · ${rows.length} item${rows.length===1?"":"s"} 🌸`);if(options.open)changePage("tables");return kind;
  }

  const baseCreate = createSmartStructuredCapture;
  createSmartStructuredCapture = function(text,space,kind,options={}){
    const profile=profileFor(kind);
    if(!profile)return baseCreate(text,space,kind,options);
    if(profile.creator==="list")return createProfileList(text,space,kind,options);
    if(profile.creator==="brainstorm")return createBrainstormTracker(text,space,kind,options);
    if(profile.creator==="life-reset")return createLifeReset(text,space,kind,options);
    return createProfileTracker(text,space,kind,options);
  };

  function smartTemplateCategoryOptions(selected="All"){
    const categories=["All",...new Set(SMART_TEMPLATE_CATALOG.map(item=>item.category))];
    return categories.map(category=>`<option value="${escapeHTML(category)}" ${category===selected?"selected":""}>${escapeHTML(category)}</option>`).join("");
  }

  function smartTemplateCard(item){
    const search=[item.title,item.category,item.description,item.kind].join(" ").toLowerCase();
    return `<article class="smart-paste-card" data-smart-paste-card data-smart-paste-category="${escapeHTML(item.category)}" data-smart-paste-search="${escapeHTML(search)}"><div class="smart-paste-card-head"><span>${item.icon}</span><div><h3>${escapeHTML(item.title)}</h3><small>${escapeHTML(item.category)}</small></div></div><p>${escapeHTML(item.description)}</p><details><summary>What can I paste?</summary><pre>${escapeHTML(item.example)}</pre></details><button class="secondary-button full-width" type="button" data-use-smart-template-kind="${escapeHTML(item.kind)}">Use this smart template</button></article>`;
  }

  function ensureSmartTemplateTutorialModal(){
    if(document.getElementById("smartTemplateTutorialModal"))return;
    document.body.insertAdjacentHTML("beforeend",`<div id="smartTemplateTutorialModal" class="modal-overlay hidden"><div class="modal-card modal-large smart-paste-guide-card"><div class="modal-header"><div><p class="eyebrow">✨ SMART PASTE GUIDE</p><h2>What can I paste into Hana?</h2><p>Write naturally. Headings and separators help, but you do not need to memorize a special format.</p></div><button class="modal-close" type="button" data-close-modal="smartTemplateTutorialModal" aria-label="Close Smart Paste Guide">×</button></div><div class="smart-paste-basics"><div><b>1</b><span><strong>Paste what you already have</strong><small>Notes, copied lists, schedules and tables are fine.</small></span></div><div><b>2</b><span><strong>Hana detects the shape</strong><small>It chooses a specialized structure when confidence is strong.</small></span></div><div><b>3</b><span><strong>You review before it becomes yours</strong><small>Examples below are only examples; Hana never saves them automatically.</small></span></div></div><div class="smart-paste-toolbar"><label class="smart-paste-search"><span>🔎</span><input id="smartPasteSearch" type="search" placeholder="Search — wedding, medicine, schedule..." /></label><select id="smartPasteCategory" aria-label="Filter Smart Templates">${smartTemplateCategoryOptions()}</select></div><div class="smart-paste-count"><strong id="smartPasteVisibleCount">${SMART_TEMPLATE_CATALOG.length}</strong> smart formats</div><div id="smartPasteGrid" class="smart-paste-grid">${SMART_TEMPLATE_CATALOG.map(smartTemplateCard).join("")}</div><div id="smartPasteEmpty" class="empty-state hidden"><div class="empty-icon">🔎</div><h3>No smart template found</h3><p>Try another word or switch the category.</p></div><button class="secondary-button full-width" type="button" data-close-modal="smartTemplateTutorialModal">Close guide</button></div></div>`);
  }

  function filterSmartPasteGuide(){
    const query=String(document.getElementById("smartPasteSearch")?.value||"").trim().toLowerCase(),category=document.getElementById("smartPasteCategory")?.value||"All";let visible=0;
    document.querySelectorAll("[data-smart-paste-card]").forEach(card=>{const show=(!query||String(card.dataset.smartPasteSearch||"").includes(query))&&(category==="All"||card.dataset.smartPasteCategory===category);card.classList.toggle("hidden",!show);if(show)visible++;});
    const count=document.getElementById("smartPasteVisibleCount");if(count)count.textContent=String(visible);
    document.getElementById("smartPasteEmpty")?.classList.toggle("hidden",visible!==0);
  }

  function openSmartTemplateTutorial(){
    ensureSmartTemplateTutorialModal();filterSmartPasteGuide();openModal("smartTemplateTutorialModal");
    if(state.settings&&!state.settings.smartTemplateGuideSeen){state.settings.smartTemplateGuideSeen=true;saveState({snapshot:false});}
  }
  window.openSmartTemplateTutorial=openSmartTemplateTutorial;
  window.HANA_SMART_TEMPLATE_CATALOG=SMART_TEMPLATE_CATALOG;
  window.HANA_EXPANDED_SMART_PROFILES=EXPANDED_SMART_PROFILES;

  function injectSmartTemplateGuideButton(){
    const card=document.querySelector("#smartTemplateModal .smart-template-card");if(!card||card.querySelector("[data-open-smart-template-tutorial]"))return;
    const grid=card.querySelector(".smart-template-choice-grid");if(!grid)return;
    grid.insertAdjacentHTML("beforebegin",`<button type="button" class="smart-template-guide-launch" data-open-smart-template-tutorial><span>🌸</span><div><strong>New here? See what Hana can understand</strong><small>Browse ${SMART_TEMPLATE_CATALOG.length} smart formats with paste examples</small></div><b>›</b></button>`);
  }

  const baseOpenSmartTemplate=openSmartTemplate;
  openSmartTemplate=function(){injectSmartTemplateGuideButton();baseOpenSmartTemplate();};

  function injectTemplateLibraryGuide(){
    const page=document.getElementById("pageContent");if(!page||page.querySelector(".smart-template-library-hero"))return;
    const note=page.querySelector(".template-customization-note");if(!note)return;
    note.insertAdjacentHTML("afterend",`<button type="button" class="smart-template-library-hero" data-open-smart-template-tutorial><span>✨</span><div><strong>Smart Paste Guide</strong><small>Not sure what to paste? Explore ${SMART_TEMPLATE_CATALOG.length} smart formats with examples, then send one straight to Brain Dump.</small></div><b>›</b></button>`);
  }
  const baseRenderTemplates=renderTemplates;
  renderTemplates=function(){baseRenderTemplates();injectTemplateLibraryGuide();};

  function injectBrainDumpGuide(){
    const page=document.getElementById("pageContent");if(!page||page.querySelector(".brain-dump-smart-guide-link"))return;
    const compose=page.querySelector(".inbox-compose");if(!compose)return;
    compose.insertAdjacentHTML("afterbegin",`<button type="button" class="brain-dump-smart-guide-link" data-open-smart-template-tutorial><span>🌸</span><div><strong>What can I paste?</strong><small>See examples for travel, routines, health, home, money, work, events and more.</small></div><b>›</b></button>`);
  }
  const baseRenderInbox=renderInbox;
  renderInbox=function(){baseRenderInbox();injectBrainDumpGuide();};

  function activateSmartTemplateInBrainDump(kind){
    const item=catalogFor(kind);if(!item)return;
    closeModal("smartTemplateTutorialModal");closeModal("smartTemplateModal");changePage("inbox");
    setTimeout(()=>{
      injectBrainDumpGuide();
      const select=document.getElementById("brainDumpDestination"),area=document.getElementById("brainDumpText"),preview=document.getElementById("brainDumpSmartPreview");
      if(select&&!select.querySelector(`option[value="${CSS.escape(kind)}"]`)){const option=document.createElement("option");option.value=kind;option.textContent=`${item.icon} ${item.title}`;select.appendChild(option);}
      if(select)select.value=kind;
      if(area){area.value="";area.placeholder=item.example;area.dataset.smartTemplateKind=kind;area.focus();}
      if(preview)preview.insertAdjacentHTML("beforebegin",`<div class="smart-template-active-chip" data-smart-template-active-chip><span>${item.icon}</span><div><strong>${escapeHTML(item.title)}</strong><small>Paste your own content below. The example is only a placeholder.</small></div><button type="button" data-clear-smart-template-kind aria-label="Return to automatic Smart Sort">×</button></div>`);
      updateBrainDumpSmartPreview();
      showToast(`${item.title} ready · paste your own content ✨`);
    },80);
  }

  const baseBrainPreview=updateBrainDumpSmartPreview;
  updateBrainDumpSmartPreview=function(){
    const select=document.getElementById("brainDumpDestination"),item=catalogFor(select?.value||"");
    if(item){const box=document.getElementById("brainDumpSmartPreview"),input=document.getElementById("brainDumpText");if(!box||!input)return;const hasText=Boolean(input.value.trim());box.innerHTML=`<span>${item.icon}</span><div><strong>${escapeHTML(item.title)}</strong><small>${hasText?"Hana will use this Smart Template when you organize.":"Paste your own content. The gray example is not saved."}</small></div>`;return;}
    return baseBrainPreview();
  };

  function clearSmartTemplateKind(){
    const select=document.getElementById("brainDumpDestination"),area=document.getElementById("brainDumpText");if(select)select.value="auto";if(area){area.removeAttribute("data-smart-template-kind");area.placeholder="Paste thoughts, a recipe, itinerary, workout, meeting notes, spreadsheet rows...";}document.querySelector("[data-smart-template-active-chip]")?.remove();updateBrainDumpSmartPreview();showToast("Back to automatic Smart Sort ✨");
  }

  document.addEventListener("click",event=>{
    if(event.target.closest("[data-open-smart-template-tutorial]")){openSmartTemplateTutorial();return;}
    const use=event.target.closest("[data-use-smart-template-kind]");if(use){activateSmartTemplateInBrainDump(use.dataset.useSmartTemplateKind);return;}
    if(event.target.closest("[data-clear-smart-template-kind]")){clearSmartTemplateKind();return;}
  });
  document.addEventListener("input",event=>{if(event.target?.id==="smartPasteSearch")filterSmartPasteGuide();});
  document.addEventListener("change",event=>{
    if(event.target?.id==="smartPasteCategory")filterSmartPasteGuide();
    if(event.target?.id==="brainDumpDestination"&&!catalogFor(event.target.value)){document.querySelector("[data-smart-template-active-chip]")?.remove();}
  });

  queueMicrotask(()=>{
    injectSmartTemplateGuideButton();
    if(state.currentPage==="templates")renderTemplates();
    else if(state.currentPage==="inbox")renderInbox();
  });
})();