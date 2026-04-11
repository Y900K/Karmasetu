export const ADMIN_USER = {
  name: "Manish Bhardwaj",
  email: "admin@karmasetu.com",
  role: "Admin",
  title: "HR Manager",
  department: "HR & Administration",
  avatar: "MB",
};

export const KPI_STATS = {
  totalTrainees: 124,
  trainingCompliance: 78,
  activeCourses: 9,
  validCertificates: 87,
  overdueTrainees: 18,
  avgCompletion: 92,
};

export const TRAINEES = [
  { id: "EMP-001", name: "Ravi Sharma", email: "ravi@karmasetu.com", department: "Safety & EHS", role: "Safety Officer", progress: 82, status: "Active", lastLogin: "Today, 9:14 AM", phone: "+91 98765 43210" },
  { id: "EMP-002", name: "Priya Verma", email: "priya@karmasetu.com", department: "Production", role: "Worker / Operator", progress: 65, status: "Active", lastLogin: "Yesterday", phone: "+91 87654 32109" },
  { id: "EMP-003", name: "Suresh Kumar", email: "suresh@karmasetu.com", department: "Electrical", role: "Worker / Operator", progress: 34, status: "Overdue", lastLogin: "5 days ago", phone: "+91 76543 21098" },
  { id: "EMP-004", name: "Anjali Singh", email: "anjali@karmasetu.com", department: "Quality Control", role: "Supervisor", progress: 91, status: "Active", lastLogin: "Today, 11:30 AM", phone: "+91 65432 10987" },
  { id: "EMP-005", name: "Mukesh Yadav", email: "mukesh@karmasetu.com", department: "Maintenance", role: "Worker / Operator", progress: 48, status: "Overdue", lastLogin: "8 days ago", phone: "+91 54321 09876" },
  { id: "EMP-006", name: "Kavita Patel", email: "kavita@karmasetu.com", department: "Chemical / Process", role: "Supervisor", progress: 78, status: "Active", lastLogin: "2 days ago", phone: "+91 43210 98765" },
  { id: "EMP-007", name: "Deepak Tiwari", email: "deepak@karmasetu.com", department: "Production", role: "Worker / Operator", progress: 12, status: "Inactive", lastLogin: "21 days ago", phone: "+91 32109 87654" },
  { id: "EMP-008", name: "Neha Gupta", email: "neha@karmasetu.com", department: "HR / Admin", role: "HR / Admin", progress: 95, status: "Active", lastLogin: "Today, 8:00 AM", phone: "+91 21098 76543" },
];

export const COURSES = [
  { 
    id: "course_chemical_2026", title: "Chemical Safety Handbook 2026", category: "Industrial Health & Safety", level: "Intermediate", modules: 5, enrolled: 84, completionRate: 72, deadline: "2026-12-31", status: "Active", theme: "from-purple-600 to-violet-500", icon: "🧪", 
    instructorName: "Dr. Arnab S.",
    instructorRole: "Lead Safety Director",
    objectives: [
      "Master GHS labeling and SDS interpretation requirements",
      "Implement effective spill containment and emergency response",
      "Select and inspect appropriate PPE for chemical hazards",
      "Ensure environmental compliance in hazardous waste disposal"
    ],
    description: "Comprehensive industrial chemical handling, GHS protocols, and safety compliance.", passingScore: 80, departments: ["Chemical / Process", "Safety & EHS"],
    videoUrl: "https://www.youtube.com/watch?v=ooVXDYzrMA8", pdfUrl: "https://www.osha.gov/sites/default/files/2021-07/Workplace%20Safety%20%26amp%3B%20Heath%20%28Chemical%20and%20Machine%20Hazards%20Trainer%20Guide.pdf",
    quiz: {
      questions: [
        { text: "What is the primary purpose of an SDS?", options: ["Pricing", "Salaries", "Safety info", "Inventory"], correct: 2 },
      ]
    }
  },
  { 
    id: "course_forklift_2026", title: "Forklift Safety & Operations 2026", category: "Machine Operations", level: "Advanced", modules: 4, enrolled: 12, completionRate: 45, deadline: "2026-05-30", status: "Active", theme: "from-amber-600 to-yellow-500", icon: "🚜", 
    instructorName: "Captain Suresh",
    instructorRole: "Logistics & Operations Head",
    objectives: [
      "Understand the stability triangle and load capacity limits",
      "Perform comprehensive pre-operation mechanical inspections",
      "Navigate high-traffic warehouse zones and intersections safely",
      "Master safe driving speeds and pedestrian awareness protocols"
    ],
    description: "Comprehensive forklift operator safety and mechanical inspection training.", passingScore: 85, departments: ["Maintenance", "Production"],
    videoUrl: "https://www.youtube.com/watch?v=fPhynD2yuBE", pdfUrl: "https://ehs.oregonstate.edu/sites/ehs.oregonstate.edu/files/pdf/occsafety/or-osha_forklift_workbook.pdf",
    quiz: {
      questions: [
        { text: "Which concept explains forklift balance?", options: ["Stability Triangle", "Power Circle", "Gravity Square", "Weight Line"], correct: 0 },
        { text: "When should inspections be done?", options: ["Weekly", "Before shift", "Monthly", "When broken"], correct: 1 },
      ]
    }
  },
  { 
    id: "course_fire_2026", title: "Fire Safety & Emergency Response 2026", category: "Health & Safety", level: "Beginner", modules: 3, enrolled: 95, completionRate: 88, deadline: "2026-06-15", status: "Active", theme: "from-red-600 to-orange-500", icon: "🔥", 
    instructorName: "Chief Inspector Khanna",
    instructorRole: "Fire Dept. Safety Consultant",
    objectives: [
      "Identify industrial fire hazards and implement prevention",
      "Master the PASS technique for various fire extinguishers",
      "Coordinate effective evacuation and emergency responses",
      "Classify industrial fires and select the correct suppression"
    ],
    description: "Essential workplace fire prevention, extinguisher usage, and evacuation protocols.", passingScore: 90, departments: ["All Departments"],
    videoUrl: "https://www.youtube.com/watch?v=UlKS_A7Xg1E", pdfUrl: "https://www.osha.gov/sites/default/files/2019-03/fireprotection.pdf",
    quiz: {
      questions: [
        { text: "PASS stands for?", options: ["Pull, Aim, Squeeze, Sweep", "Push, Align, Stop, Start", "Point, Alert, Stay, Safe", "None"], correct: 0 },
        { text: "Which extinguisher is for electrical fires?", options: ["Water", "CO2", "Foam", "Wait Chemical"], correct: 1 },
      ]
    }
  },
];

export const CERTIFICATES = [
  { certNo: "CERT-2026-001", trainee: "Ravi Sharma", course: "Chemical Safety Handbook 2026", issueDate: "Jan 10, 2026", expiry: "Jan 10, 2027", score: 88, status: "Valid" },
  { certNo: "CERT-2026-002", trainee: "Priya Verma", course: "Chemical Safety Handbook 2026", issueDate: "Feb 3, 2026", expiry: "Feb 3, 2027", score: 74, status: "Valid" },
  { certNo: "CERT-2026-003", trainee: "Anjali Singh", course: "Fire Safety & Emergency Response 2026", issueDate: "Mar 1, 2026", expiry: "Mar 1, 2027", score: 96, status: "Valid" },
];

export const DEPARTMENTS = [
  { name: "Safety & EHS", compliance: 94, status: "Compliant" },
  { name: "Production", compliance: 81, status: "Compliant" },
  { name: "Quality Control", compliance: 89, status: "Compliant" },
  { name: "Maintenance", compliance: 67, status: "At Risk" },
  { name: "Electrical", compliance: 73, status: "At Risk" },
  { name: "Chemical / Process", compliance: 58, status: "Non-Compliant" },
];

export const MONTHLY_COMPLETIONS = [
  { month: "Oct", completions: 32, certificates: 18 },
  { month: "Nov", completions: 41, certificates: 25 },
  { month: "Dec", completions: 38, certificates: 22 },
  { month: "Jan", completions: 52, certificates: 35 },
  { month: "Feb", completions: 44, certificates: 28 },
  { month: "Mar", completions: 47, certificates: 31 },
];

export const DEPT_PERFORMANCE = [
  { rank: 1, dept: "Safety & EHS", avgScore: 91, completions: 68, compliance: 94 },
  { rank: 2, dept: "Quality Control", avgScore: 87, completions: 54, compliance: 89 },
  { rank: 3, dept: "Production", avgScore: 82, completions: 72, compliance: 81 },
  { rank: 4, dept: "Electrical", avgScore: 76, completions: 31, compliance: 73 },
  { rank: 5, dept: "Maintenance", avgScore: 71, completions: 48, compliance: 67 },
  { rank: 6, dept: "Chemical / Process", avgScore: 64, completions: 28, compliance: 58 },
];

export const COURSE_ANALYSIS = [
  { course: "Chemical Safety Handbook 2026", enrolled: 84, completed: 62, avgScore: 84, passRate: 88 },
  { course: "Forklift Safety & Operations 2026", enrolled: 12, completed: 5, avgScore: 81, passRate: 92 },
  { course: "Fire Safety & Emergency Response 2026", enrolled: 95, completed: 84, avgScore: 89, passRate: 93 },
];

export const RECENT_ACTIVITY = [
  { type: "completion", color: "green", icon: "👤", text: "Ravi Sharma completed Chemical Safety 2026", score: "88%", time: "2 hours ago" },
  { type: "certificate", color: "blue", icon: "🏅", text: "Certificate issued to Priya Verma", score: null, time: "5 hours ago" },
  { type: "overdue", color: "yellow", icon: "⚠️", text: "Suresh Kumar's Safety training overdue", score: null, time: "Yesterday" },
  { type: "enrollment", color: "green", icon: "👤", text: "Anjali Singh enrolled in Fire Safety 2026", score: null, time: "Yesterday" },
  { type: "admin", color: "blue", icon: "🔧", text: "Admin verified Chemical Safety compliance", score: null, time: "2 days ago" },
];

export const ALERTS = [
  { id: 1, level: "HIGH", color: "red", icon: "🔴", title: "18 trainees have overdue compliance training", desc: "Deadline was March 10, 2026. Immediate action required.", action: "View Trainees" },
  { id: 2, level: "MEDIUM", color: "yellow", icon: "🟡", title: "6 certificates expiring within 30 days", desc: "Fire Safety certificates need renewal before April 10.", action: "Review Certificates" },
  { id: 3, level: "INFO", color: "blue", icon: "🔵", title: "New course added: OSHA Compliance 2026", desc: "Assign this course to Safety Officers and Supervisors.", action: "Assign Now" },
];

export const ANNOUNCEMENTS = [
  { id: 1, title: "Fire Drill Scheduled — March 20, 2026", body: "All departments must participate in the mandatory fire evacuation drill at Plant A. Attendance is compulsory and will be recorded.", sentTo: ["All Departments"], sentBy: "Manish Bhardwaj", date: "March 12, 2026", priority: "HIGH" },
  { id: 2, title: "New Course Added: Chemical Safety 2026", body: "A new comprehensive course on Chemical Safety has been added. Safety Officers and Supervisors must complete it by April 30.", sentTo: ["Safety & EHS", "Production"], sentBy: "Manish Bhardwaj", date: "March 10, 2026", priority: "INFO" },
  { id: 3, title: "Certificate Renewal Reminder", body: "12 trainees have certificates expiring within 30 days. Please ensure they re-complete the relevant courses before expiry.", sentTo: ["All Departments"], sentBy: "Manish Bhardwaj", date: "March 8, 2026", priority: "REMINDER" },
];

export const OVERDUE_TRAINEES = [
  { name: "Suresh Kumar", dept: "Electrical", course: "Electrical Safety Basics", daysOverdue: 8 },
  { name: "Mukesh Yadav", dept: "Maintenance", course: "Machine Operations Level 1", daysOverdue: 5 },
  { name: "Deepak Tiwari", dept: "Production", course: "Fire Safety Protocol", daysOverdue: 21 },
];

export const ROLE_OPTIONS = ["Worker / Operator", "Supervisor / Team Lead", "Manager / Department Head", "Safety Officer", "HR / Admin"];
export const DEPT_OPTIONS = ["All Departments", "Safety & EHS", "Production", "Maintenance", "Quality Control", "Electrical", "Chemical / Process", "HR / Admin"];
export const PRIORITY_OPTIONS = ["INFO", "REMINDER", "HIGH", "URGENT"];
export const COURSE_COLOR_THEMES = [
  { label: "Fire Red", value: "from-red-600 to-orange-500" },
  { label: "Ocean Blue", value: "from-blue-600 to-indigo-500" },
  { label: "Forest Green", value: "from-green-600 to-teal-500" },
  { label: "Royal Purple", value: "from-purple-600 to-violet-500" },
  { label: "Electric Cyan", value: "from-cyan-600 to-sky-500" },
  { label: "Golden Amber", value: "from-yellow-500 to-amber-400" },
];
