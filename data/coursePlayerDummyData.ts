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

export const COURSE_REGISTRY: Record<string, Course> = {};

export const dummyCourse = null as any;
