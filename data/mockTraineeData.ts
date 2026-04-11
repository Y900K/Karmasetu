export const TRAINEE_USER = {
  name: "Trainee User",
  firstName: "Trainee",
  email: "trainee@karmasetu.com",
  role: "Trainee",
  department: "Production",
  avatar: "TU",
  phone: "+91 98765 00001",
  deptRank: 1,
  deptTotal: 8,
  studyHours: 6,
  streak: 3,
};

export const TRAINEE_COURSES = [
  {
    id: "course_chemical_2026", title: "Chemical Safety Handbook 2026", category: "Industrial Health & Safety", level: "Intermediate", blocks: 5, progress: 60, status: "In Progress", deadline: "2026-12-31", icon: "🧪", theme: "from-purple-600 to-violet-500",
    videoUrl: "https://www.youtube.com/watch?v=ooVXDYzrMA8", pdfUrl: "https://www.osha.gov/sites/default/files/2021-07/Workplace%20Safety%20%26amp%3B%20Heath%20%28Chemical%20and%20Machine%20Hazards%20Trainer%20Guide.pdf", completedBlocks: 3,
    quiz: [
      { q: "What is the primary purpose of an SDS?", options: ["Pricing", "Salaries", "Safety info", "Inventory"], correct: 2 },
    ],
    passingScore: 80,
  },
  {
    id: "course_forklift_2026", title: "Forklift Safety & Operations 2026", category: "Machine Operations", level: "Advanced", blocks: 4, progress: 0, status: "Not Started", deadline: "2026-05-30", icon: "🚜", theme: "from-amber-600 to-yellow-500",
    videoUrl: "https://www.youtube.com/watch?v=fPhynD2yuBE", pdfUrl: "https://ehs.oregonstate.edu/sites/ehs.oregonstate.edu/files/pdf/occsafety/or-osha_forklift_workbook.pdf", completedBlocks: 0,
    quiz: [
      { q: "Which concept explains forklift balance?", options: ["Stability Triangle", "Power Circle", "Gravity Square", "Weight Line"], correct: 0 },
      { q: "When should inspections be done?", options: ["Weekly", "Before shift", "Monthly", "When broken"], correct: 1 },
    ],
    passingScore: 85,
  },
  {
    id: "course_fire_2026", title: "Fire Safety & Emergency Response 2026", category: "Health & Safety", level: "Beginner", blocks: 3, progress: 100, status: "Completed", deadline: "2026-06-15", icon: "🔥", theme: "from-red-600 to-orange-500",
    videoUrl: "https://www.youtube.com/watch?v=UlKS_A7Xg1E", pdfUrl: "https://www.osha.gov/sites/default/files/2019-03/fireprotection.pdf", completedBlocks: 3,
    quiz: [
      { q: "PASS stands for?", options: ["Pull, Aim, Squeeze, Sweep", "Push, Align, Stop, Start", "Point, Alert, Stay, Safe", "None"], correct: 0 },
      { q: "Which extinguisher is for electrical fires?", options: ["Water", "CO2", "Foam", "Wet Chemical"], correct: 1 },
    ],
    passingScore: 90,
  },
];

export const TRAINEE_CERTIFICATE = {
  certNo: "KS-CERT-2026-0006", trainee: "Trainee User", course: "Workplace Induction & Safety Orientation",
  issueDate: "Jan 25, 2026", expiry: "Jan 25, 2027", score: 91, status: "Valid",
  issuedBy: "Manish Bhardwaj", issuedByTitle: "HR — KARMASETU",
};

export const UPCOMING_EVENTS = [
  { id: 1, title: "Production Drill", date: "2026-04-15", time: "10:00 AM – 11:30 AM", type: "DRILL", color: "orange", mandatory: true },
  { id: 2, title: "Safety Drill", date: "2026-05-20", time: "9:00 AM – 10:30 AM", type: "DRILL", color: "red", mandatory: true },
  { id: 3, title: "Chemical Handling Workshop", date: "2026-04-25", time: "2:00 PM – 4:00 PM", type: "WORKSHOP", color: "blue", mandatory: false },
];

export const ACHIEVEMENTS = [
  { id: 1, title: "First Course Completed", icon: "🎓", unlocked: true, hint: "" },
  { id: 2, title: "10 Quizzes Passed", icon: "📝", unlocked: true, hint: "" },
  { id: 3, title: "Safety Champion", icon: "🏆", unlocked: false, hint: "Complete 5 courses to unlock" },
  { id: 4, title: "100% Compliance Streak", icon: "⭐", unlocked: false, hint: "Complete all assigned courses before deadline" },
];

export const SAFETY_TIPS = [
  "Chemical handling में label और SDS verify किए बिना process start मत करो।",
  "Always wear PPE before entering the production floor — no exceptions.",
  "Fire extinguisher की location और type हर shift से पहले check करो।",
  "LOTO procedure को bypass करना strictly prohibited है।",
  "Report every near-miss incident — small hazards prevent big accidents.",
  "Electrical panel के पास काम करते वक्त insulated gloves जरूरी हैं।",
  "Housekeeping is safety — a clean workplace prevents most accidents.",
  "Emergency exit routes याद रखो and कभी block मत करो।",
  "Hydration breaks लो — थका हुआ worker = unsafe worker.",
  "Safety is everyone's responsibility — speak up when you see a hazard.",
];

export const LEADERBOARD_DATA = [
  { rank: 1, name: "Priya Mehta", avatar: "PM", dept: "Safety", pts: 83, courses: "7/8", certs: 1, badge: "Gold", badgeColor: "#f59e0b" },
  { rank: 2, name: "Sneha Patel", avatar: "SP", dept: "Quality", pts: 75, courses: "6/8", certs: 1, badge: "Silver", badgeColor: "#94a3b8" },
  { rank: 3, name: "Rahul Sharma", avatar: "RS", dept: "Production", pts: 68, courses: "5/8", certs: 1, badge: "Bronze", badgeColor: "#f97316" },
  { rank: 4, name: "Divya Nair", avatar: "DN", dept: "Maintenance", pts: 53, courses: "4/8", certs: 0, badge: "Rising Star", badgeColor: "#8b5cf6" },
  { rank: 5, name: "Trainee User", avatar: "TU", dept: "Production", pts: 42, courses: "3/8", certs: 1, badge: null, badgeColor: null, isCurrentUser: true },
  { rank: 6, name: "Arjun Mishra", avatar: "AM", dept: "Electrical", pts: 38, courses: "2/8", certs: 0, badge: null, badgeColor: null },
  { rank: 7, name: "Pooja Sharma", avatar: "PS", dept: "Chemical", pts: 29, courses: "2/8", certs: 0, badge: null, badgeColor: null },
  { rank: 8, name: "Vikram Yadav", avatar: "VY", dept: "Production", pts: 21, courses: "1/8", certs: 0, badge: null, badgeColor: null },
];

export const RECENT_ACTIVITY_TRAINEE = [
  { text: "Completed Module 3 of Chemical Tank Storage SOP", time: "2 hours ago", color: "cyan" },
  { text: "Passed quiz: Fire Safety & Emergency Response — Score: 83%", time: "Yesterday", color: "green" },
  { text: "Started new course: Electrical Safety & Hazard Prevention", time: "2 days ago", color: "blue" },
  { text: "Certificate earned: Workplace Induction & Safety Orientation", time: "Jan 25, 2026", color: "gold" },
];
