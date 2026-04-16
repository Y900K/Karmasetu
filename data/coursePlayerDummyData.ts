export interface Lesson {
  id: string;
  number: number;
  title: string;
  description: string;
  youtubeURL: string;
  duration: string;
  completed: boolean;
  locked: boolean;
}

export interface Document {
  id: string;
  title: string;
  driveURL: string;
  type: string;
}

export interface QuizQuestion {
  id: string;
  text: string;
  options: string[];
  correct: number;
  explanation?: string;
  flagged?: boolean;
}

export interface Quiz {
  id: string;
  unlocked: boolean;
  attempted: boolean;
  score: number | null;
  passed: boolean;
  questions: QuizQuestion[];
}

export interface Course {
  id: string;
  title: string;
  category: string;
  level: string;
  deadline?: string | null;
  thumbnail?: string;
  instructor?: string;
  instructorRole?: string;
  objectives?: string[];
  totalLessons: number;
  passingScore: number;
  quizTimeLimit: number; // minutes
  lessons: Lesson[];
  documents: Document[];
  quiz: Quiz;
  viewedDocIds?: string[];
  lastActiveModuleId?: string;
  lastActiveView?: 'video' | 'pdf' | 'quiz' | 'quiz-results';
  videoCurrentTime?: number;
}

export const COURSE_REGISTRY: Record<string, Course> = {
  'course_chemical_2026': {
    id: 'course_chemical_2026',
    title: 'Chemical Safety Handbook 2026',
    category: 'Industrial Health & Safety',
    level: 'Intermediate (Compliance Level)',
    deadline: '2026-12-31',
    thumbnail: 'https://images.unsplash.com/photo-1532187875605-1ef6ac23c594?auto=format&fit=crop&q=80',
    instructor: 'Dr. Arnab S.',
    instructorRole: 'Lead Safety Director',
    objectives: [
      'Master GHS labeling and SDS interpretation requirements',
      'Implement effective spill containment and emergency response',
      'Select and inspect appropriate PPE for chemical hazards',
      'Ensure environmental compliance in hazardous waste disposal'
    ],
    totalLessons: 5,
    passingScore: 80,
    quizTimeLimit: 15,
    lessons: [
      {
        id: 'chem_L1', number: 1, title: 'Introduction to Chemical Handling Protocols',
        description: 'Foundational safety measures and workplace layout for chemical processing units.',
        youtubeURL: 'https://www.youtube.com/watch?v=LXb3EKWsInQ', duration: '12:45', completed: false, locked: false,
      },
      {
        id: 'chem_L2', number: 2, title: 'Decoding SDS & Chemical Labeling',
        description: 'How to read and interpret Safety Data Sheets (SDS) and GHS labels correctly.',
        youtubeURL: 'https://www.youtube.com/watch?v=LXb3EKWsInQ', duration: '10:20', completed: false, locked: true,
      },
      {
        id: 'chem_L3', number: 3, title: 'Specialized PPE for Chemical Hazards',
        description: 'Selecting the correct respiratory, skin, and eye protection for hazardous substances.',
        youtubeURL: 'https://www.youtube.com/watch?v=LXb3EKWsInQ', duration: '06:15', completed: false, locked: true,
      },
      {
        id: 'chem_L4', number: 4, title: 'Spill Containment & Emergency Response',
        description: 'Critical steps for containing spills and basic first aid for chemical exposure.',
        youtubeURL: 'https://www.youtube.com/watch?v=LXb3EKWsInQ', duration: '12:00', completed: false, locked: true,
      },
      {
        id: 'chem_L5', number: 5, title: 'Waste Disposal & Environmental Compliance',
        description: 'Protocols for safe disposal of hazardous chemical waste and environmental protection.',
        youtubeURL: 'https://www.youtube.com/watch?v=LXb3EKWsInQ', duration: '07:30', completed: false, locked: true,
      },
    ],
    documents: [
      { id: 'doc_chem_main', title: 'OSHA Chemical Safety Trainer Guide (Official)', driveURL: 'https://www.osha.gov/sites/default/files/publications/osha3088.pdf', type: 'PDF' },
      { id: 'doc_chem_checklist', title: 'Chemical Compatibility Chart', driveURL: 'https://www.osha.gov/sites/default/files/publications/osha3088.pdf', type: 'PDF' },
    ],
    quiz: {
      id: 'quiz_chem_2026', unlocked: false, attempted: false, score: null, passed: false,
      questions: [
        { id: 'cq1', text: 'What is the primary purpose of an SDS?', options: ['Pricing', 'Salaries', 'Safety info', 'Inventory'], correct: 2, flagged: false },
        { id: 'cq2', text: 'Which pictogram represents corrosion?', options: ['Flame', 'Skull', 'Pouring liquid on hand', 'Exclamation'], correct: 2, flagged: false },
        { id: 'cq3', text: 'First step in a large spill?', options: ['Paper towels', 'Evacuate/Alert', 'Photo', 'Leave it'], correct: 1, flagged: false },
        { id: 'cq4', text: 'IDLH stands for?', options: ['Immediately Dangerous to Life/Health', 'Internal Damage', 'Liquid Handling', 'Design Hazard'], correct: 0, flagged: false },
      ],
    },
  },
  'course_forklift_2026': {
    id: 'course_forklift_2026',
    title: 'Forklift Safety & Operations 2026',
    category: 'Machine Operations',
    level: 'Advanced',
    deadline: '2026-05-30',
    thumbnail: 'https://images.unsplash.com/photo-1586528116311-ad86196230ba?auto=format&fit=crop&q=80',
    instructor: 'Captain Suresh',
    instructorRole: 'Logistics & Operations Head',
    objectives: [
      'Understand the stability triangle and load capacity limits',
      'Perform comprehensive pre-operation mechanical inspections',
      'Navigate high-traffic warehouse zones and intersections safely',
      'Master safe driving speeds and pedestrian awareness protocols'
    ],
    totalLessons: 4,
    passingScore: 85,
    quizTimeLimit: 10,
    lessons: [
      {
        id: 'fork_L1', number: 1, title: 'OSHA Forklift Operator Training',
        description: 'Comprehensive guide to forklift operation according to OSHA standards.',
        youtubeURL: 'https://www.youtube.com/watch?v=fPhynD2yuBE', duration: '15:20', completed: false, locked: false,
      },
      {
        id: 'fork_L2', number: 2, title: 'Pre-Operation Inspection Checklist',
        description: 'Daily safety checks, fluid levels, and mechanical inspection before starting the forklift.',
        youtubeURL: 'https://www.youtube.com/watch?v=YyCHxLpZ1Rk', duration: '07:30', completed: false, locked: true,
      },
      {
        id: 'fork_L3', number: 3, title: 'Stability Triangle & Load Capacity',
        description: 'Understanding the center of gravity and safe load limits to prevent tipping incidents.',
        youtubeURL: 'https://www.youtube.com/watch?v=fPhynD2yuBE', duration: '09:15', completed: false, locked: true,
      },
      {
        id: 'fork_L4', number: 4, title: 'Warehouse Traffic Rules & Pedestrian Safety',
        description: 'Safe driving speeds, horn usage, and navigating high-traffic warehouse zones.',
        youtubeURL: 'https://www.youtube.com/watch?v=fPhynD2yuBE', duration: '06:45', completed: false, locked: true,
      },
    ],
    documents: [
      { id: 'doc_fork_main', title: 'Forklift Safety Guide (Dropbox)', driveURL: 'https://www.dropbox.com/scl/fi/rk6w8z8u7jzfexz6l7jqy/Forklift-Safety-Manual.pdf?rlkey=v6l67k6z6k6z6k6z&dl=0', type: 'PDF' },
      { id: 'doc_fork_maint', title: 'Daily Maintenance Log Template', driveURL: 'https://ehs.oregonstate.edu/sites/ehs.oregonstate.edu/files/pdf/occsafety/or-osha_forklift_workbook.pdf', type: 'PDF' },
    ],
    quiz: {
      id: 'quiz_fork_2026', unlocked: false, attempted: false, score: null, passed: false,
      questions: [
        { id: 'fq1', text: 'Which concept explains forklift balance?', options: ['Stability Triangle', 'Power Circle', 'Gravity Square', 'Weight Line'], correct: 0, flagged: false },
        { id: 'fq2', text: 'When should inspections be done?', options: ['Weekly', 'Before shift', 'Monthly', 'When broken'], correct: 1, flagged: false },
        { id: 'fq3', text: 'What is the correct fork position while driving?', options: ['As high as possible', 'At eye level', '4-6 inches off the ground', 'Dragged on floor'], correct: 2, flagged: false },
        { id: 'fq4', text: 'How do you cross a speed bump?', options: ['Fast', 'Diagonally', 'Straight', 'Stopped'], correct: 1, flagged: false },
      ],
    },
  },
  'course_fire_2026': {
    id: 'course_fire_2026',
    title: 'Fire Safety & Emergency Response 2026',
    category: 'Health & Safety',
    level: 'Beginner',
    deadline: '2026-06-15',
    thumbnail: 'https://images.unsplash.com/photo-1544210001-b05204953465?auto=format&fit=crop&q=80',
    instructor: 'Chief Inspector Khanna',
    instructorRole: 'Fire Dept. Safety Consultant',
    objectives: [
      'Identify industrial fire hazards and implement prevention',
      'Master the PASS technique for various fire extinguishers',
      'Coordinate effective evacuation and emergency responses',
      'Classify industrial fires and select the correct suppression'
    ],
    totalLessons: 3,
    passingScore: 90,
    quizTimeLimit: 12,
    lessons: [
      {
        id: 'fire_L1', number: 1, title: 'Fire Triangle & Prevention Essentials',
        description: 'Understanding how fire starts and basic prevention at the workplace.',
        youtubeURL: 'https://www.youtube.com/watch?v=UlKS_A7Xg1E', duration: '11:45', completed: false, locked: false,
      },
      {
        id: 'fire_L2', number: 2, title: 'Types of Fire Extinguishers & Usage',
        description: 'Selecting and using the correct extinguisher for different fire types (A, B, C, D, K).',
        youtubeURL: 'https://www.youtube.com/watch?v=UlKS_A7Xg1E', duration: '05:30', completed: false, locked: true,
      },
      {
        id: 'fire_L3', number: 3, title: 'Evacuation Planning & Drills',
        description: 'Coordinated response and exit strategy during a fire emergency.',
        youtubeURL: 'https://www.youtube.com/watch?v=UlKS_A7Xg1E', duration: '08:20', completed: false, locked: true,
      },
    ],
    documents: [
      { id: 'doc_fire_main', title: 'OSHA Fire Protection Standards (Official)', driveURL: 'https://www.osha.gov/sites/default/files/2019-03/fireprotection.pdf', type: 'PDF' },
    ],
    quiz: {
      id: 'quiz_fire_2026', unlocked: false, attempted: false, score: null, passed: false,
      questions: [
        { id: 'fir_q1', text: 'PASS stands for what in fire extinguisher use?', options: ['Pull, Aim, Squeeze, Sweep', 'Push, Align, Stop, Start', 'Point, Alert, Stay, Safe', 'None'], correct: 0, flagged: false },
        { id: 'fir_q2', text: 'Which extinguisher is for electrical fires?', options: ['Water', 'CO2', 'Foam', 'Wet Chemical'], correct: 1, flagged: false },
      ],
    },
  }
};

export const dummyCourse = COURSE_REGISTRY['course_chemical_2026'];
