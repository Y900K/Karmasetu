'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import PageHeader from '@/components/admin/shared/PageHeader';
import StatusBadge from '@/components/admin/shared/StatusBadge';
import ProgressBar from '@/components/admin/shared/ProgressBar';
import Modal from '@/components/admin/shared/Modal';
import { useToast } from '@/components/admin/shared/Toast';
import { DEPT_OPTIONS, COURSE_COLOR_THEMES } from '@/data/mockAdminData';
import { useAPI } from '@/lib/hooks/useAPI';
import { useLanguage } from '@/context/LanguageContext';
import { getEmbeddableYoutubeUrl, getEmbeddableDriveUrl } from '@/lib/utils/mediaParser';
import type { CourseThumbnailMeta } from '@/lib/courseUtils';
import TableSkeleton from '@/components/admin/shared/TableSkeleton';
import { LayoutGrid, List, Plus, Trash, Download, Users, X, Pencil, Calendar, Upload, ClipboardList, Sparkles, Settings, RefreshCw, LucideIcon, Clock, Eye, AlertTriangle } from 'lucide-react';
import { calculateCourseEstimate } from '@/lib/utils/courseMath';
import CourseOverview from '@/components/trainee/CoursePlayer/CourseOverview';

type QuizQuestion = { text: string; options: string[]; correct: number; explanation?: string };
const Section = ({ title, children, icon: Icon }: { title: string; children: React.ReactNode, icon?: LucideIcon }) => (
  <div className="bg-[#0f172a]/50 border border-[#1e293b] rounded-2xl p-4 space-y-3">
    <div className="flex items-center gap-2 mb-1 border-b border-[#1e293b] pb-2">
      {Icon && <Icon className="h-4 w-4 text-cyan-400" />}
      <h4 className="text-xs font-bold text-white uppercase tracking-wider">{title}</h4>
    </div>
    {children}
  </div>
);

type CourseRow = {
  id: string;
  title: string;
  category: string;
  level: string;
  modules: number;
  enrolled: number;
  completionRate: number;
  deadline?: string | null;
  status: string;
  theme: string;
  icon: string;
  description: string;
  instructorName?: string;
  instructorRole?: string;
  objectives?: string[];
  passingScore: number;
  departments: string[];
  videoUrl?: string;
  pdfUrl?: string;
  videoUrls?: string[];
  pdfUrls?: string[];
  videoTitles?: string[];
  videoDurations?: string[];
  quizTimeLimit?: number;
  quiz?: { questions?: QuizQuestion[] };
  thumbnail?: string;
  thumbnailMeta?: CourseThumbnailMeta;
  isDefaultForNewTrainees?: boolean;
};

type GeneratedQuizQuestion = {
  q?: string;
  question?: string;
  text?: string;
  options: string[];
  answer?: string;
  correct?: number;
  explanation?: string;
  reason?: string;
};

type GenerateQuizResponse = {
  ok?: boolean;
  message?: string;
  questions?: GeneratedQuizQuestion[];
  quiz?: GeneratedQuizQuestion[];
};

function toQuizQuestions(payload: GenerateQuizResponse): QuizQuestion[] {
  const source = Array.isArray(payload.questions)
    ? payload.questions
    : Array.isArray(payload.quiz)
    ? payload.quiz
    : [];

  return source
    .filter((item) => Array.isArray(item.options) && item.options.length >= 2)
    .map((item) => {
      const text = typeof item.text === 'string' && item.text.trim().length > 0
        ? item.text
        : typeof item.question === 'string' && item.question.trim().length > 0
        ? item.question
        : typeof item.q === 'string'
        ? item.q
        : 'Untitled question';

      const options = item.options.slice(0, 4);
      const candidateIndexFromAnswer =
        typeof item.answer === 'string' && item.answer.trim().length > 0
          ? options.indexOf(item.answer)
          : -1;

      const candidateIndexFromCorrect =
        typeof item.correct === 'number' && item.correct >= 0 && item.correct < options.length
          ? item.correct
          : -1;

      const correct = candidateIndexFromAnswer >= 0
        ? candidateIndexFromAnswer
        : candidateIndexFromCorrect >= 0
        ? candidateIndexFromCorrect
        : 0;

      const explanation = typeof item.explanation === 'string' ? item.explanation : typeof item.reason === 'string' ? item.reason : undefined;

      return {
        text,
        options,
        correct,
        explanation,
      };
    });
}

function formatDeadlineLabel(deadline: string | null | undefined, includeYear = false) {
  if (!deadline) {
    return 'No deadline';
  }

  const parsed = new Date(deadline);
  if (Number.isNaN(parsed.getTime())) {
    return 'No deadline';
  }

  return parsed.toLocaleDateString(
    'en-IN',
    includeYear
      ? { month: 'short', day: 'numeric', year: 'numeric' }
      : { month: 'short', day: 'numeric' }
  );
}

export default function CoursesPage() {
  const { showToast } = useToast();
  const { t } = useLanguage();

  // ── SWR-cached data fetching ──────────────────────────────────
  const { data: coursesData, error: coursesError, isLoading, mutate: mutateCourses } = useAPI<{ ok: boolean; courses: CourseRow[] }>(
    '/api/admin/courses',
    {
      // Keep modal editing stable; avoid focus-triggered revalidation while interacting with form controls.
      revalidateOnFocus: false,
    }
  );
  const courses = coursesData?.ok && Array.isArray(coursesData.courses) ? coursesData.courses : [];

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showModal, setShowModal] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; courseId: string | null; isBulk: boolean }>({
    isOpen: false,
    courseId: null,
    isBulk: false,
  });
  const [editingCourse, setEditingCourse] = useState<CourseRow | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  const toggleSelect = (id: string) => setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const toggleSelectAll = () => setSelected((prev) => prev.length === courses.length ? [] : courses.map((c) => c.id));

  const handleBulkDelete = async () => {
    setDeleteConfirmation({ isOpen: true, courseId: null, isBulk: true });
  };

  const confirmDeletion = async () => {
    try {
      setIsBulkDeleting(true);
      if (deleteConfirmation.isBulk) {
        const response = await fetch('/api/admin/courses/bulk-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courseIds: selected }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok) throw new Error(data.message || 'Bulk delete failed');
        showToast(`${data.count || selected.length} course(s) deleted`, 'error');
        setSelected([]);
      } else if (deleteConfirmation.courseId) {
        const response = await fetch(`/api/admin/courses/${encodeURIComponent(deleteConfirmation.courseId)}`, {
          method: 'DELETE',
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok) throw new Error(data.message || 'Delete failed');
        showToast('Course deleted', 'error');
      }
      
      await mutateCourses();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Deletion failed', 'error');
    } finally {
      setIsBulkDeleting(false);
      setDeleteConfirmation({ isOpen: false, courseId: null, isBulk: false });
    }
  };

  const handleBulkAssign = async () => {
    try {
      showToast(`Assigning ${selected.length} course(s)...`, 'info');
      const response = await fetch('/api/admin/courses/bulk-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseIds: selected }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        throw new Error(data.message || 'Failed to assign courses.');
      }
      showToast(`Successfully assigned ${selected.length} course(s) to all trainees!`, 'success');
      setSelected([]);
      await mutateCourses();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to assign courses.', 'error');
    }
  };

  const handleEdit = (course: CourseRow) => {
    setEditingCourse(course);
    setShowModal(true);
  };

  const handleCreate = () => {
    setEditingCourse(null);
    setShowModal(true);
  };

  const handleDelete = async (courseId: string) => {
    setDeleteConfirmation({ isOpen: true, courseId, isBulk: false });
  };

  return (
    <>
      <PageHeader
        title={t('admin.courses.title')}
        sub={`${courses.length} courses · ${courses.reduce((a, c) => a + c.enrolled, 0)} total enrollments`}
        action={
          <div className="flex items-center gap-2">
            <div className="flex border border-[#334155] rounded-lg overflow-hidden">
              <button 
                onClick={() => setViewMode('grid')} 
                className={`p-2 transition-colors cursor-pointer ${viewMode === 'grid' ? 'bg-cyan-500 text-slate-900 border-none' : 'text-slate-400 hover:text-white border-none bg-transparent'}`}
                aria-label="Grid view"
              ><LayoutGrid className="h-4 w-4" /></button>
              <button 
                onClick={() => setViewMode('list')} 
                className={`p-2 transition-colors cursor-pointer ${viewMode === 'list' ? 'bg-cyan-500 text-slate-900 border-none' : 'text-slate-400 hover:text-white border-none bg-transparent'}`}
                aria-label="List view"
              ><List className="h-4 w-4" /></button>
            </div>
            <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold text-sm rounded-xl cursor-pointer transition-colors border-none"><Plus className="h-4 w-4" /> {t('admin.courses.new_course')}</button>
          </div>
        }
      />

      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={deleteConfirmation.isOpen} 
        onClose={() => setDeleteConfirmation({ ...deleteConfirmation, isOpen: false })}
        title="CONFIRM DELETION"
        maxWidth="max-w-md"
      >
        <div className="text-center p-2">
          <div className="h-16 w-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mx-auto mb-6 border border-red-500/20">
            <Trash className="h-8 w-8 text-red-400/80" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Are you sure?</h3>
          <p className="text-slate-400 text-sm mb-8 leading-relaxed">
            {deleteConfirmation.isBulk 
              ? `You are about to delete ${selected.length} courses. ` 
              : "You are about to delete this training course. "}
            All trainee enrollment results for this content will be archived and marked as expired. 
            <span className="block mt-2 font-bold text-red-400/60 uppercase tracking-tighter text-[10px]">This action cannot be undone.</span>
          </p>
          <div className="flex gap-3">
            <button 
              onClick={() => setDeleteConfirmation({ ...deleteConfirmation, isOpen: false })}
              className="flex-1 px-4 py-3 rounded-xl bg-slate-800 text-slate-300 font-bold text-sm hover:bg-slate-700 transition-colors border-none cursor-pointer"
            >
              Cancel
            </button>
            <button 
              onClick={confirmDeletion}
              disabled={isBulkDeleting}
              className="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-400 transition-all flex items-center justify-center gap-2 border-none cursor-pointer active:scale-95 disabled:opacity-50 disabled:active:scale-100"
            >
              {isBulkDeleting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash className="h-4 w-4" />}
              {isBulkDeleting ? 'Deleting...' : 'Delete Now'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Bulk Actions */}
      {selected.length > 0 && (
        <div className="bg-[#1e293b] border border-[#334155] px-6 py-3 flex items-center gap-3 rounded-2xl mb-4 animate-[slideIn_0.2s_ease]">
          <span className="text-sm text-white font-medium">{selected.length} course(s) selected</span>
          <button onClick={handleBulkDelete} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 cursor-pointer"><Trash className="h-3.5 w-3.5" /> Bulk Delete</button>
          <button onClick={() => { window.location.href = '/api/admin/courses/export'; setSelected([]); }} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[#334155] text-slate-400 hover:bg-white/5 cursor-pointer"><Download className="h-3.5 w-3.5" /> Export</button>
          <button onClick={handleBulkAssign} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"><Users className="h-3.5 w-3.5" /> Assign to All</button>
          <button onClick={() => setSelected([])} className="ml-auto text-xs text-slate-500 hover:text-white cursor-pointer flex items-center gap-1"><X className="h-3.5 w-3.5" /> Clear</button>
        </div>
      )}

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(isLoading || (!coursesData && !coursesError)) && [...Array(6)].map((_, i) => (
            <div key={`skel-${i}`} className="bg-[#1e293b] border border-[#334155] rounded-2xl overflow-hidden animate-pulse">
              <div className="h-28 bg-slate-700/50" />
              <div className="p-4 space-y-3">
                <div className="h-4 w-3/4 rounded bg-slate-700" />
                <div className="flex gap-2"><div className="h-4 w-16 rounded-full bg-slate-700/60" /><div className="h-3 w-20 rounded bg-slate-700/40" /></div>
                <div className="h-1.5 w-full rounded bg-slate-700/50" />
                <div className="flex justify-between"><div className="h-3 w-20 rounded bg-slate-700/40" /><div className="h-3 w-24 rounded bg-slate-700/40" /></div>
              </div>
            </div>
          ))}
          {!isLoading && coursesData && courses.map((course) => (
            <div key={course.id} className={`bg-[#1e293b] border rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:border-cyan-500/40 hover:shadow-[0_0_0_1px_#06b6d4] ${selected.includes(course.id) ? 'border-cyan-500 ring-1 ring-cyan-500/30' : 'border-[#334155]'}`}>
              {/* Thumbnail */}
              <div className={`h-28 bg-gradient-to-br ${course.theme} flex items-center justify-center relative`}>
                <input type="checkbox" title={`Select ${course.title}`} aria-label={`Select ${course.title}`} checked={selected.includes(course.id)} onChange={() => toggleSelect(course.id)} className="absolute top-3 left-3 h-4 w-4 accent-cyan-500 cursor-pointer" onClick={(e) => e.stopPropagation()} />
                <span className="text-5xl">{course.icon}</span>
                <div className="absolute top-3 right-3"><StatusBadge status={course.status} /></div>
                <span className="absolute bottom-3 left-3 text-[10px] bg-black/30 text-white px-2 py-0.5 rounded-full">{course.category}</span>
              </div>
              {/* Body */}
              <div className="p-4">
                <h3 className="text-sm font-semibold text-white leading-snug mb-1">{course.title}</h3>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${course.level === 'Beginner' ? 'bg-emerald-500/15 text-emerald-400' : course.level === 'Intermediate' ? 'bg-amber-500/15 text-amber-400' : 'bg-red-500/15 text-red-400'}`}>{course.level}</span>
                  <span className="text-[10px] text-slate-500">· {course.modules} modules</span>
                  {!course.quiz?.questions?.length && (
                    <span className="flex items-center gap-1 text-[9px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                      <AlertTriangle className="h-2.5 w-2.5" /> NO QUIZ
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                  <span>Completion</span><span>{course.completionRate}%</span>
                </div>
                <ProgressBar value={course.completionRate} height="h-1" />
                <div className="flex items-center justify-between mt-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5"><Users className="h-3 w-3" /> {course.enrolled} enrolled</span>
                  <span className="flex items-center gap-1.5"><Calendar className="h-3 w-3" /> {formatDeadlineLabel(course.deadline)}</span>
                </div>
              </div>
              {/* Footer */}
                <div className="border-t border-[#1e293b] px-4 py-3 flex justify-end gap-1 relative z-10">
                  <button onClick={() => handleEdit(course)} title="Edit course" aria-label="Edit course" className="h-7 w-7 rounded-lg flex items-center justify-center text-cyan-400 hover:bg-cyan-500/10 text-xs cursor-pointer border-none bg-transparent active:scale-95 transition-transform"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => handleDelete(course.id)} title="Delete course" aria-label="Delete course" className="h-7 w-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-500/10 text-xs cursor-pointer border-none bg-transparent active:scale-95 transition-transform"><Trash className="h-3.5 w-3.5" /></button>
                </div>
            </div>
          ))}
          {!isLoading && courses.length === 0 && <div className="text-sm text-slate-500">No courses found.</div>}
          {!isLoading && coursesError && <div className="text-sm text-red-400">Failed to load courses from API.</div>}
        </div>
      ) : (isLoading || (!coursesData && !coursesError)) ? (
        <div className="bg-[#1e293b] border border-[#334155] rounded-2xl overflow-hidden animate-pulse">
          <table className="w-full min-w-[700px]">
             <thead>
                <tr className="border-b border-white/5 bg-slate-900/50">
                  <th className="px-6 py-4 text-left w-12"><div className="h-4 w-4 bg-slate-700 rounded mx-auto" /></th>
                  {['Course','Category','Level','Modules','Enrolled','Status','Actions'].map(h => (
                    <th key={h} className="px-3 py-4 text-left"><div className="h-2 w-16 bg-slate-700 rounded" /></th>
                  ))}
                </tr>
              </thead>
            <tbody>
              <TableSkeleton rows={8} cols={7} />
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-[#1e293b] border border-[#334155] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
              <tr className="border-b border-white/5">
                  <th className="px-4 py-3 text-left"><input type="checkbox" title="Select all courses" aria-label="Select all courses" checked={selected.length === courses.length && courses.length > 0} onChange={toggleSelectAll} className="h-4 w-4 accent-cyan-500 cursor-pointer" /></th>
                  {['Course','Category','Level','Enrolled','Completion','Deadline','Status','Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {courses.map((c) => (
                  <tr key={c.id} className={`border-b border-white/5 hover:bg-white/[0.02] ${selected.includes(c.id) ? 'bg-cyan-500/5' : ''}`}>
                    <td className="px-4 py-3"><input type="checkbox" title={`Select ${c.title}`} aria-label={`Select ${c.title}`} checked={selected.includes(c.id)} onChange={() => toggleSelect(c.id)} className="h-4 w-4 accent-cyan-500 cursor-pointer" /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{c.icon}</span>
                        <div className="flex flex-col">
                          <span className="text-sm text-white font-medium">{c.title}</span>
                          {!c.quiz?.questions?.length && (
                            <span className="flex items-center gap-1 text-[8px] font-bold text-amber-500 uppercase tracking-tighter">
                              <AlertTriangle className="h-2 w-2" /> Missing Assessment
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{c.category}</td>
                    <td className="px-4 py-3"><span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${c.level === 'Beginner' ? 'bg-emerald-500/15 text-emerald-400' : c.level === 'Intermediate' ? 'bg-amber-500/15 text-amber-400' : 'bg-red-500/15 text-red-400'}`}>{c.level}</span></td>
                    <td className="px-4 py-3 text-xs text-slate-400">{c.enrolled}</td>
                    <td className="px-4 py-3"><div className="flex items-center gap-2 w-20"><ProgressBar value={c.completionRate} height="h-1" /><span className="text-xs text-slate-400">{c.completionRate}%</span></div></td>
                    <td className="px-4 py-3 text-xs text-slate-400">{formatDeadlineLabel(c.deadline, true)}</td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                     <td className="px-4 py-3"><div className="flex gap-1"><button onClick={() => handleEdit(c)} title="Edit course" aria-label="Edit course" className="h-7 w-7 rounded-lg flex items-center justify-center text-cyan-400 hover:bg-cyan-500/10 text-xs cursor-pointer"><Pencil className="h-3.5 w-3.5" /></button><button onClick={() => handleDelete(c.id)} title="Delete course" aria-label="Delete course" className="h-7 w-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-500/10 text-xs cursor-pointer"><Trash className="h-3.5 w-3.5" /></button></div></td>
                  </tr>
                ))}
                {!isLoading && courses.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-500 text-sm">No courses found.</td>
                  </tr>
                )}
                {!isLoading && coursesError && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-red-400 text-sm">Failed to load courses from API.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CourseModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        course={editingCourse}
        onSaved={async () => {
          await mutateCourses();
        }}
      />
    </>
  );
}

function CourseModal({ isOpen, onClose, course, onSaved }: { isOpen: boolean; onClose: () => void; course: CourseRow | null; onSaved: () => Promise<void> }) {
  const { showToast } = useToast();
  const { language } = useLanguage();
  const isEdit = !!course;
  const ALL_DEPARTMENTS = 'All Departments';
  const departmentOptions = React.useMemo(
    () => DEPT_OPTIONS.filter((dept) => dept !== ALL_DEPARTMENTS),
    []
  );

  const normalizeDepartmentSelection = React.useCallback((values: string[]) => {
    const unique = Array.from(new Set(values.filter(Boolean)));
    const selectedDepartments = unique.filter((dept) => dept !== ALL_DEPARTMENTS);
    const allSelected = departmentOptions.every((dept) => selectedDepartments.includes(dept));

    return allSelected ? [ALL_DEPARTMENTS, ...departmentOptions] : selectedDepartments;
  }, [departmentOptions]);

  const normalizeDepartmentsForPayload = React.useCallback((values: string[]) => {
    return Array.from(new Set(normalizeDepartmentSelection(values).filter((dept) => dept !== ALL_DEPARTMENTS)));
  }, [normalizeDepartmentSelection]);

  const toggleDepartment = React.useCallback((dept: string) => {
    setDepts((prev) => {
      if (dept === ALL_DEPARTMENTS) {
        const isFullySelected = departmentOptions.every((option) => prev.includes(option));
        return isFullySelected ? [] : [ALL_DEPARTMENTS, ...departmentOptions];
      }

      const next = prev.includes(dept)
        ? prev.filter((item) => item !== dept)
        : [...prev, dept];

      return normalizeDepartmentSelection(next);
    });
  }, [departmentOptions, normalizeDepartmentSelection]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [quizLanguageMode, setQuizLanguageMode] = useState<'english' | 'hinglish'>(
    language === 'HINGLISH' ? 'hinglish' : 'english'
  );
  const [isUploading, setIsUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  const [selectedTheme, setSelectedTheme] = useState(course?.theme || COURSE_COLOR_THEMES[0].value);
  const [questions, setQuestions] = useState<QuizQuestion[]>(
    course?.quiz?.questions || []
  );
  const [depts, setDepts] = useState<string[]>(normalizeDepartmentSelection(course?.departments || []));
  const [isDefaultForNewTrainees, setIsDefaultForNewTrainees] = useState(course?.isDefaultForNewTrainees || false);
    const [title, setTitle] = useState(course?.title || '');
  const [description, setDescription] = useState(course?.description || '');
  const [category, setCategory] = useState(course?.category || 'Health & Safety');
  const [level, setLevel] = useState(course?.level || 'Beginner');
  const [deadline, setDeadline] = useState(course?.deadline || '');
  const [hasDeadline, setHasDeadline] = useState<boolean>(!!course?.deadline);
  const [passingScore, setPassingScore] = useState(course?.passingScore || 70);
  const [quizTimeLimit, setQuizTimeLimit] = useState(course?.quizTimeLimit || 15);
  const [instructorName, setInstructorName] = useState(course?.instructorName || '');
  const [instructorRole, setInstructorRole] = useState(course?.instructorRole || '');
  const [objectives, setObjectives] = useState<string[]>(course?.objectives?.length ? course.objectives : ['']);
  const [thumbnail, setThumbnail] = useState(course?.thumbnail || '');
  const [thumbnailMeta, setThumbnailMeta] = useState<CourseThumbnailMeta | undefined>(course?.thumbnailMeta);
  const [isGeneratingThumb, setIsGeneratingThumb] = useState(false);
  
  const [videoUrls, setVideoUrls] = useState<string[]>(
    course?.videoUrls?.length ? course.videoUrls : (course?.videoUrl ? [course.videoUrl] : [''])
  );
  const [videoTitles, setVideoTitles] = useState<string[]>(
    course?.videoTitles?.length
      ? course.videoTitles
      : course?.videoUrls?.length
      ? course.videoUrls.map((_, index) => `Lesson ${index + 1}`)
      : course?.videoUrl
      ? ['Lesson 1']
      : ['']
  );
  const [videoDurations, setVideoDurations] = useState<string[]>(
    course?.videoDurations?.length
      ? course.videoDurations
      : course?.videoUrls?.length
      ? course.videoUrls.map((_, index) => course.videoDurations?.[index] || '10:00')
      : course?.videoUrl
      ? ['10:00']
      : ['']
  );
  const [pdfUrls, setPdfUrls] = useState<string[]>(
    course?.pdfUrls?.length ? course.pdfUrls : (course?.pdfUrl ? [course.pdfUrl] : [''])
  );
  const modalSeed = React.useMemo(() => ({
    theme: course?.theme || COURSE_COLOR_THEMES[0].value,
    questions: course?.quiz?.questions || [],
    isDefaultForNewTrainees: course?.isDefaultForNewTrainees || false,
    departments: normalizeDepartmentSelection(course?.departments || []),
    title: course?.title || '',
    description: course?.description || '',
    category: course?.category || 'Health & Safety',
    level: course?.level || 'Beginner',
    deadline: course?.deadline || '',
    hasDeadline: !!course?.deadline,
    passingScore: course?.passingScore || 70,
    quizTimeLimit: course?.quizTimeLimit || 15,
    instructorName: course?.instructorName || '',
    instructorRole: course?.instructorRole || '',
    objectives: course?.objectives?.length ? course.objectives : [''],
    thumbnail: course?.thumbnail || '',
    thumbnailMeta: course?.thumbnailMeta,
    videoUrls: course?.videoUrls?.length ? course.videoUrls : (course?.videoUrl ? [course.videoUrl] : ['']),
    videoTitles:
      course?.videoTitles?.length
        ? course.videoTitles
        : course?.videoUrls?.length
        ? course.videoUrls.map((_, index) => `Lesson ${index + 1}`)
        : course?.videoUrl
        ? ['Lesson 1']
        : [''],
    videoDurations:
      course?.videoDurations?.length
        ? course.videoDurations
        : course?.videoUrls?.length
        ? course.videoUrls.map((_, index) => course.videoDurations?.[index] || '10:00')
        : course?.videoUrl
        ? ['10:00']
        : [''],
    pdfUrls: course?.pdfUrls?.length ? course.pdfUrls : (course?.pdfUrl ? [course.pdfUrl] : ['']),
    quizLanguageMode: language === 'HINGLISH' ? 'hinglish' as const : 'english' as const,
  }), [language, course, normalizeDepartmentSelection]);

  // Re-sync state only when the modal is opened for a different course/new record.
  React.useEffect(() => {
    if (isOpen) {
      setShowPreview(false);
      setSelectedTheme(modalSeed.theme);
      setQuestions(modalSeed.questions);
      setDepts(modalSeed.departments);
      setIsDefaultForNewTrainees(modalSeed.isDefaultForNewTrainees);
      setTitle(modalSeed.title);
      setDescription(modalSeed.description);
      setCategory(modalSeed.category);
      setLevel(modalSeed.level);
      setDeadline(modalSeed.deadline);
      setHasDeadline(modalSeed.hasDeadline);
      setPassingScore(modalSeed.passingScore);
      setQuizTimeLimit(modalSeed.quizTimeLimit);
      setInstructorName(modalSeed.instructorName);
      setInstructorRole(modalSeed.instructorRole);
      setObjectives(modalSeed.objectives);
      setThumbnail(modalSeed.thumbnail);
      setThumbnailMeta(modalSeed.thumbnailMeta);
      setVideoUrls(modalSeed.videoUrls);
      setVideoTitles(modalSeed.videoTitles);
      setVideoDurations(modalSeed.videoDurations);
      setPdfUrls(modalSeed.pdfUrls);
      setQuizLanguageMode(modalSeed.quizLanguageMode);
    }
  }, [isOpen, modalSeed]);

  const addQuestion = () => {
    if (questions.length >= 10) return;
    setQuestions([...questions, { text: '', options: ['', '', '', ''], correct: 0, explanation: '' }]);
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      showToast('File too large (Max 1MB allowed).', 'error');
      return;
    }

    try {
      setIsUploading(true);
      showToast('Uploading PDF...', 'info');
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.message || 'Upload failed');
      
      setPdfUrls(prev => {
        const n = [...prev];
        n[idx] = data.url;
        return n;
      });
      showToast('PDF uploaded securely!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error uploading file', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const generateAIQuiz = async () => {
    if (!title) {
      showToast('Please enter a course title first to generate targeted questions.', 'error');
      return;
    }
    try {
      setIsGeneratingQuiz(true);
      showToast(`Buddy AI is generating a ${quizLanguageMode === 'hinglish' ? 'Hinglish' : 'English'} assessment...`, 'info');
      
      const payloadTopic = `${title}. ${description}`;
      const res = await fetch('/api/admin/courses/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: payloadTopic, count: 10, language: quizLanguageMode })
      });
      
      const data = (await res.json().catch(() => ({}))) as GenerateQuizResponse;
      console.log('[Admin Course AI] generate response:', data);
      if (!res.ok || !data.ok) throw new Error(data.message || 'Generation failed');
      const mappedQs = toQuizQuestions(data);
      if (mappedQs.length === 0) {
        throw new Error('AI returned no questions.');
      }
      
      setQuestions(mappedQs);
      showToast('AI Assessment Generated Successfully!', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'AI Quiz failure', 'error');
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const regenerateQuestion = async (qi: number) => {
    try {
      showToast(`Regenerating Question ${qi + 1}...`, 'info');
      const payloadTopic = `${title}. ${description}. Focus specifically on generating ONE new, unique, high-difficulty technical question to substitute an existing one.`;
      
      const res = await fetch('/api/admin/courses/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: payloadTopic, count: 1, language: quizLanguageMode })
      });
      
      const data = (await res.json().catch(() => ({}))) as GenerateQuizResponse;
      console.log('[Admin Course AI] regenerate response:', data);
      if (!res.ok || !data.ok) throw new Error(data.message || 'Regeneration failed');

      const nextQuestion = toQuizQuestions(data)[0];
      if (!nextQuestion) {
        throw new Error('AI did not return a replacement question.');
      }

      const newQs = [...questions];
      newQs[qi] = nextQuestion;
      
      setQuestions(newQs);
      showToast(`Question ${qi + 1} Regenerated Successfully!`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to regenerate question', 'error');
    }
  };

  const inputCls = 'w-full bg-[#020817] border border-[#1e293b] rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all';
  const labelCls = 'text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block';
  const normalizedPreviewVideoUrls = videoUrls.filter((url) => url.trim());
  const normalizedPreviewPdfUrls = pdfUrls.filter((url) => url.trim());
  const previewCourse = {
    id: 'preview',
    title: title || 'Course Title Preview',
    category,
    level,
    deadline: hasDeadline && deadline ? deadline : '',
    thumbnail,
    instructor: instructorName.trim() || undefined,
    instructorRole: instructorRole.trim() || undefined,
    objectives: objectives.filter((objective) => objective.trim()),
    totalLessons: normalizedPreviewVideoUrls.length,
    passingScore,
    quizTimeLimit,
    lessons: normalizedPreviewVideoUrls.map((url, index) => ({
      id: `l${index}`,
      number: index + 1,
      title: videoTitles[index]?.trim() || `Lesson ${index + 1}`,
      description,
      youtubeURL: url,
      duration: videoDurations[index]?.trim() || '10:00',
      completed: false,
      locked: false,
    })),
    documents: normalizedPreviewPdfUrls.map((url, index) => ({
      id: `d${index}`,
      title: `Document ${index + 1}`,
      driveURL: url,
      type: 'PDF',
    })),
    quiz: {
      id: 'q',
      unlocked: true,
      attempted: false,
      score: null,
      passed: false,
      questions: questions.map((question, index) => ({
        id: `q${index}`,
        text: question.text,
        options: question.options,
        correct: question.correct,
        flagged: false,
      })),
    },
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? "EDIT COURSE" : "CREATE NEW COURSE"} maxWidth="max-w-4xl" preserveScrollKey="admin-course-modal">
      <>
        {showPreview ? (
          <div className="relative w-full h-[700px] flex flex-col p-2 sm:p-4 bg-slate-900/40 rounded-3xl overflow-hidden border border-white/5">
            <button 
              type="button"
              onClick={() => setShowPreview(false)}
              className="absolute top-6 right-6 z-50 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-bold border border-white/10 backdrop-blur-md transition-all flex items-center gap-2 shadow-2xl"
            >
              <X className="h-4 w-4" /> Exit Preview Mode
            </button>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar rounded-2xl">
              <CourseOverview 
                course={previewCourse}
                onBegin={() => setShowPreview(false)} 
                estimatedDuration={calculateCourseEstimate({
                  videoDurations: videoDurations.filter(d => d.trim()),
                  documentsCount: pdfUrls.filter(u => u.trim()).length,
                  quizQuestionsCount: questions.length
                })}
                isPreview={true}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Course details */}
          <div className="space-y-4">
          <Section title="1. Course Profile" icon={Settings}>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Course Title</label>
                <input 
                  placeholder="e.g. Electrical Safety Level 1" 
                  className={inputCls} 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Instructor Name (Optional)</label>
                  <input 
                    placeholder="e.g. Dr. Arnab S." 
                    className={inputCls} 
                    value={instructorName} 
                    onChange={(e) => setInstructorName(e.target.value)} 
                  />
                </div>
                <div>
                  <label className={labelCls}>Instructor Role (Optional)</label>
                  <input 
                    placeholder="e.g. Lead Safety Director" 
                    className={inputCls} 
                    value={instructorRole} 
                    onChange={(e) => setInstructorRole(e.target.value)} 
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Industrial Thumbnail</label>
                <div className="flex gap-4 items-center mb-4">
                  <div className="h-20 w-32 rounded-xl bg-[#020817] border border-[#1e293b] overflow-hidden relative group shrink-0">
                    {thumbnail ? (
                      <Image unoptimized width={800} height={400} src={thumbnail} alt="Thumbnail preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-700 bg-slate-900/50">
                        <Sparkles className="h-6 w-6" />
                      </div>
                    )}
                    <button 
                      type="button"
                      onClick={async (e) => {
                        e.preventDefault();
                        const trimmedTitle = title.trim();
                        if (!trimmedTitle) { 
                          showToast('Please enter course title first!', 'error'); 
                          return; 
                        }
                        setIsGeneratingThumb(true);
                        try {
                          const res = await fetch('/api/admin/courses/generate-thumbnail', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ title: trimmedTitle }),
                          });
                          const data = await res.json();
                          if (data.ok) { 
                            setThumbnail(data.url); 
                            setThumbnailMeta(data.thumbnailMeta);
                            showToast('Industrial Thumbnail Generated!', 'success'); 
                          }
                        } catch { 
                          showToast('AI Thumbnail failed.', 'error'); 
                        } finally { 
                          setIsGeneratingThumb(false); 
                        }
                      }}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all cursor-pointer"
                    >
                      <Sparkles className={`h-5 w-5 text-cyan-400 mb-1 ${isGeneratingThumb ? 'animate-spin' : ''}`} />
                      <span className="text-[8px] font-bold text-white uppercase">Regenerate</span>
                    </button>
                  </div>
                  <div className="flex-1">
                    <input 
                      placeholder="Paste Image URL or use AI Generate" 
                      className={`${inputCls} !text-[11px] !py-2`} 
                      value={thumbnail} 
                      onChange={(e) => {
                        setThumbnail(e.target.value);
                        setThumbnailMeta(undefined);
                      }} 
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Generated thumbnails are stored immediately. Pasted URLs will be imported into managed storage when you save.</p>
                  </div>
                </div>
              </div>
              <div>
                <label className={labelCls}>Learning Objectives (Optional)</label>
                <div className="space-y-2">
                  {objectives.map((obj, idx) => (
                    <div key={idx} className="flex gap-2">
                       <input 
                        placeholder={`Objective ${idx + 1}`} 
                        title={`Objective ${idx + 1}`}
                        aria-label={`Objective ${idx + 1}`}
                        className={`${inputCls} !py-1.5 !text-xs`} 
                        value={obj} 
                        onChange={(e) => {
                          const newObjs = [...objectives];
                          newObjs[idx] = e.target.value;
                          setObjectives(newObjs);
                        }} 
                      />
                      {objectives.length > 1 && (
                        <button title="Remove Objective" aria-label="Remove Objective" onClick={() => setObjectives(objectives.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-400">
                          <Trash className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => setObjectives([...objectives, ''])} className="text-[10px] text-cyan-400 font-bold uppercase hover:underline">+ Add Objective</button>
                </div>
              </div>
              <div>
                <label className={labelCls}>Description</label>
                <textarea 
                  placeholder="Brief course description for trainees..." 
                  rows={3} 
                  className={inputCls} 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Category</label>
                  <select 
                    className={`${inputCls} cursor-pointer`} 
                    title="Course category"
                    aria-label="Course category"
                    value={category} 
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option>Health & Safety</option>
                    <option>Industrial Health & Safety</option>
                    <option>Machine Operations</option>
                    <option>Quality & Compliance</option>
                    <option>Chemical & Process</option>
                    <option>Electrical Safety</option>
                    <option>Leadership & SOPs</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Difficulty Level</label>
                  <select 
                    className={`${inputCls} cursor-pointer`} 
                    title="Course level"
                    aria-label="Course level"
                    value={level} 
                    onChange={(e) => setLevel(e.target.value)}
                  >
                    <option>Beginner</option>
                    <option>Intermediate</option>
                    <option>Advanced</option>
                  </select>
                </div>
              </div>
            </div>
          </Section>

          <Section title="2. Logistics & Compliance" icon={Calendar}>
            <div className="space-y-4">
              <div className="rounded-xl border border-[#1e293b] bg-[#020817] p-3 overflow-hidden">
                <div className="grid gap-2.5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                  <div className="min-w-0">
                    <div className="text-[13px] text-slate-100 font-semibold tracking-tight">Mandatory Deadline</div>
                    <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">
                      Enable only for fixed completion dates. Disable to keep this course open-ended.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setHasDeadline(!hasDeadline)}
                    className={`inline-flex w-full max-w-full items-center justify-between gap-3 rounded-lg border px-2.5 py-1.5 text-left transition-all md:w-auto md:min-w-[154px] md:max-w-[186px] ${
                      hasDeadline
                        ? 'border-cyan-500/40 bg-cyan-500/10 text-white'
                        : 'border-[#334155] bg-[#0b1220] text-slate-300'
                    }`}
                    title="Toggle mandatory deadline"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em]">
                      {hasDeadline ? 'Enabled' : 'Disabled'}
                    </span>
                    <span
                      className={`relative h-4.5 w-9 rounded-full transition-all duration-300 ${
                        hasDeadline ? 'bg-cyan-500 shadow-[0_0_12px_-2px_rgba(6,182,212,0.4)]' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-300 ${
                          hasDeadline ? 'translate-x-[17px] left-0' : 'left-0.5'
                        }`}
                      />
                    </span>
                  </button>
                </div>
                {hasDeadline && (
                  <div className="mt-2.5 animate-in slide-in-from-left-2 duration-300">
                    <label className={labelCls}>Deadline Date</label>
                    <input 
                      type="date" 
                      title="Course deadline"
                      aria-label="Course deadline"
                      className={inputCls} 
                      value={deadline} 
                      onChange={(e) => setDeadline(e.target.value)} 
                    />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Pass Score (%)</label>
                  <input 
                    type="number" 
                    title="Minimum passing score"
                    aria-label="Minimum passing score"
                    value={passingScore} 
                    onChange={(e) => setPassingScore(parseInt(e.target.value))} 
                    min={50} 
                    max={100} 
                    className={inputCls} 
                  />
                </div>
                <div>
                  <label className={labelCls}>Time Limit (Min)</label>
                  <input 
                    type="number" 
                    title="Quiz time limit"
                    aria-label="Quiz time limit"
                    value={quizTimeLimit} 
                    onChange={(e) => setQuizTimeLimit(parseInt(e.target.value))} 
                    min={1} 
                    max={120} 
                    className={inputCls} 
                  />
                </div>
              </div>
              <div>
                <div>
<label className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-4 cursor-pointer">
<input type="checkbox" checked={isDefaultForNewTrainees} onChange={(e) => setIsDefaultForNewTrainees(e.target.checked)} className="accent-cyan-500 w-4 h-4" />
Assign Globally (Auto-enroll all current and future Trainees)
</label>
</div>
<label className={labelCls}>Assign to Departments</label>
                <div className="bg-[#020817] border border-[#1e293b] rounded-xl p-3 max-h-32 overflow-y-auto grid grid-cols-2 gap-2">
                  {DEPT_OPTIONS.map((d) => (
                    <label key={d} className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer hover:text-white transition-colors">
                      <input type="checkbox" checked={depts.includes(d)} onChange={() => toggleDepartment(d)} className="accent-cyan-500" />{d}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </Section>
        </div>

        {/* Right: Media & Assessment */}
        <div className="space-y-4">
          <Section title="3. Training Media" icon={Upload}>
            <div className="mb-4 bg-cyan-500/5 border border-cyan-500/10 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-cyan-400">
                <Clock className="h-4 w-4" />
                <span className="text-[11px] font-bold uppercase tracking-wider">Estimated Duration</span>
              </div>
              <span className="text-sm font-bold text-white">
                {calculateCourseEstimate({
                  videoDurations: videoDurations.filter(d => d.trim()),
                  documentsCount: pdfUrls.filter(u => u.trim()).length,
                  quizQuestionsCount: questions.length
                })}
              </span>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>
                  Video Lessons (YouTube)
                  <button type="button" onClick={() => {
                    setVideoUrls([...videoUrls, '']);
                    setVideoTitles([...videoTitles, `Lesson ${videoUrls.length + 1}`]);
                    setVideoDurations([...videoDurations, '10:00']);
                  }} className="float-right text-cyan-400 hover:text-cyan-300 font-bold">+ ADD</button>
                </label>
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {videoUrls.map((url, idx) => (
                    <div key={`vid-${idx}`} className="p-3 bg-[#020817] border border-[#1e293b] rounded-xl space-y-2">
                      <div className="flex items-center gap-2">
                        <input 
                          placeholder="Paste YouTube link here" 
                          title="YouTube Link"
                          aria-label="YouTube Link"
                          className={`${inputCls} flex-1 !py-2.5 !text-sm font-medium`} 
                          value={url} 
                          onChange={(e) => { const n = [...videoUrls]; n[idx] = e.target.value; setVideoUrls(n); }} 
                        />
                        {videoUrls.length > 1 && (
                          <button type="button" title="Remove lesson" aria-label="Remove lesson" onClick={() => {
                            setVideoUrls(videoUrls.filter((_, i) => i !== idx));
                            setVideoTitles(videoTitles.filter((_, i) => i !== idx));
                            setVideoDurations(videoDurations.filter((_, i) => i !== idx));
                          }} className="text-red-500 hover:text-red-400"><Trash className="h-3.5 w-3.5" /></button>
                        )}
                      </div>
                      <div className="grid grid-cols-[minmax(0,1fr)_90px] gap-2">
                        <input 
                          placeholder="Lesson title" 
                          title="Lesson Title"
                          aria-label="Lesson Title"
                          className={`${inputCls} !py-2 !text-xs`} 
                          value={videoTitles[idx] || ''} 
                          onChange={(e) => { const n = [...videoTitles]; n[idx] = e.target.value; setVideoTitles(n); }} 
                        />
                        <input 
                          placeholder="MM:SS" 
                          title="Duration"
                          className={`${inputCls} !py-2 !text-xs text-center`} 
                          value={videoDurations[idx] || ''} 
                          onChange={(e) => { const n = [...videoDurations]; n[idx] = e.target.value; setVideoDurations(n); }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                  <label className={labelCls}>
                    Training Resources & Embeds
                    <button
                      type="button"
                      onClick={() => setPdfUrls([...pdfUrls, ''])}
                      className="float-right text-cyan-400 hover:text-cyan-300 font-bold"
                    >
                      + ADD
                    </button>
                  </label>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {pdfUrls.map((url, idx) => {
                      const mode = (url && url.startsWith('/uploads')) ? 'upload' : 
                                   (url && (url.includes('.pdf') || url.includes('osha.gov') || url.includes('oregonstate.edu'))) ? 'others' : 'link';

                      return (
                      <div key={`pdf-${idx}`} className="flex flex-col gap-2 relative bg-[#0f172a]/50 border border-[#1e293b] p-3 rounded-xl group/res shadow-sm">
                        <div className="flex gap-2 relative">
                          <select 
                            title="Resource Media Type"
                            className="bg-[#020817] border border-[#334155] rounded-xl px-2 py-1.5 text-[10px] uppercase font-bold text-cyan-400 outline-none w-[160px] shrink-0 cursor-pointer shadow-inner"
                            value={mode}
                            onChange={(e) => {
                              if (e.target.value === 'upload') {
                                document.getElementById(`pdf-upload-${idx}`)?.click();
                              } else if (e.target.value === 'others') {
                                // Provide an initial value to guide the user, or let it be blank.
                                const n = [...pdfUrls]; n[idx] = 'https://'; setPdfUrls(n);
                              } else {
                                const n = [...pdfUrls]; n[idx] = ''; setPdfUrls(n);
                              }
                            }}
                          >
                            <option value="link">🌐 PASTE WEB LINK</option>
                            <option value="upload">📤 UPLOAD PDF (&lt;1MB)</option>
                            <option value="others">🔗 OTHERS / URL PDF</option>
                          </select>
                          
                          <input
                            placeholder={mode === 'upload' ? 'File uploaded securely' : mode === 'others' ? 'Paste direct PDF URL (e.g., https://example.com/file.pdf)' : 'Paste Drive, Canva, Figma URL...'}
                            title="Resource URL"
                            aria-label="Resource URL"
                            className={`${inputCls} flex-1 !py-1.5 !text-xs !bg-[#020817] ${mode === 'upload' ? 'opacity-50 pointer-events-none' : ''}`}
                            value={url}
                            readOnly={mode === 'upload'}
                            onChange={(e) => {
                              const n = [...pdfUrls];
                              n[idx] = e.target.value;
                              setPdfUrls(n);
                            }}
                          />
                          
                          <label className="hidden">
                            <input
                              id={`pdf-upload-${idx}`}
                              type="file"
                              accept="application/pdf"
                              title="Upload PDF"
                              className="hidden"
                              disabled={isUploading}
                              onChange={(e) => handlePdfUpload(e, idx)}
                            />
                          </label>

                          {pdfUrls.length > 1 && (
                            <button
                              type="button"
                              title="Remove document"
                              onClick={() => setPdfUrls(pdfUrls.filter((_, i) => i !== idx))}
                              className="text-red-500 hover:text-red-400 self-center pl-1 opacity-70 hover:opacity-100 transition-opacity"
                            >
                              <Trash className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        {mode === 'link' && (
                          <div className="flex flex-wrap gap-2 text-[9px] text-slate-500 items-center pl-1 mt-1">
                            <span className="font-bold text-slate-400 uppercase tracking-widest mr-1">Formats:</span>
                            <span className="border border-[#1e293b] px-2 py-0.5 rounded-full hover:border-[#334155]">📁 Google Drive</span>
                            <span className="border border-[#1e293b] px-2 py-0.5 rounded-full hover:border-[#334155]">🎨 Canva</span>
                            <span className="border border-[#1e293b] px-2 py-0.5 rounded-full hover:border-[#334155]">✨ Gamma Site</span>
                            <span className="border border-[#1e293b] px-2 py-0.5 rounded-full hover:border-[#334155]">✒️ Figma</span>
                          </div>
                        )}
                      </div>
                    )})}
                  </div>
                </div>
                <div>
                <label className={labelCls}>Branding Theme</label>
                <div className="flex gap-2">
                  {COURSE_COLOR_THEMES.map((t) => (
                    <button key={t.value} onClick={() => setSelectedTheme(t.value)}
                      title={`Select theme ${t.label || t.value}`}
                      aria-label={`Select theme ${t.label || t.value}`}
                      className={`h-8 w-8 rounded-lg bg-gradient-to-br ${t.value} cursor-pointer transition-all ${selectedTheme === t.value ? 'ring-2 ring-cyan-500 ring-offset-2 ring-offset-[#0f172a] scale-110' : 'opacity-60 hover:opacity-100'}`} />
                  ))}
                </div>
              </div>
            </div>
          </Section>

          <Section title="4. Assessment Builder" icon={ClipboardList}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Questions ({questions.length}/10)</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setQuizLanguageMode((prev) => (prev === 'english' ? 'hinglish' : 'english'))}
                    title="Toggle quiz language"
                    aria-label="Toggle quiz language"
                    className="text-[10px] px-3 py-1.5 rounded-lg border border-[#334155] text-slate-300 font-bold uppercase tracking-wider hover:bg-white/5"
                  >
                    {quizLanguageMode === 'hinglish' ? 'हिंदी + EN' : 'English'}
                  </button>
                  <button 
                    type="button"
                    onClick={generateAIQuiz} 
                    disabled={isGeneratingQuiz || !title.trim()} 
                    className={`text-[10px] px-3 py-1.5 rounded-lg border font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                      isGeneratingQuiz 
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400 animate-pulse' 
                        : 'border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10'
                    }`}
                  >
                    {isGeneratingQuiz ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    {isGeneratingQuiz ? 'AI Synthesizing...' : 'AI Auto-Generate'}
                  </button>
                  <button type="button" onClick={addQuestion} disabled={questions.length >= 10} className="text-[10px] px-3 py-1.5 rounded-lg border border-[#334155] text-white font-bold uppercase tracking-wider hover:bg-white/5 disabled:opacity-50">+ Manual</button>
                </div>
              </div>
              
              <div className="space-y-3 max-h-[750px] min-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                {questions.length === 0 && (
                  <div className="bg-[#020817] border border-[#1e293b] rounded-xl p-6 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                    <Sparkles className="h-5 w-5 text-slate-600 mb-1" />
                    {isGeneratingQuiz ? 'Buddy AI is analyzing topics...' : 'Click "AI Auto-Generate" to build a 10-question assessment instantly.'}
                  </div>
                )}
                {questions.map((q, qi) => (
                  <div key={qi} className="bg-[#020817] border border-[#1e293b] rounded-xl p-3 group">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-slate-600 uppercase">Q{qi + 1}</span>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button type="button" onClick={() => regenerateQuestion(qi)} className="text-[10px] text-cyan-500 font-bold uppercase">Refine</button>
                        <button type="button" onClick={() => setQuestions(questions.filter((_, i) => i !== qi))} className="text-[10px] text-red-500 font-bold uppercase">Del</button>
                      </div>
                    </div>
                    <input placeholder={`Question ${qi + 1}`} title={`Question ${qi + 1}`} aria-label={`Question ${qi + 1}`} className={`${inputCls} !py-1.5 !text-xs mb-2`} value={q.text} onChange={(e) => { const nq = [...questions]; nq[qi].text = e.target.value; setQuestions(nq); }} />
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      {q.options.map((opt, oi) => (
                        <div key={oi} className={`flex items-center gap-2 px-2 py-1 rounded-lg border ${q.correct === oi ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-[#1e293b]'}`}>
                          <input type="radio" title={`Mark option ${oi + 1} as correct`} aria-label={`Mark option ${oi + 1} as correct`} checked={q.correct === oi} onChange={() => { const nq = [...questions]; nq[qi].correct = oi; setQuestions(nq); }} className="accent-emerald-500 h-3 w-3" />
                          <input placeholder={`Option ${oi + 1}`} title={`Option ${oi + 1}`} aria-label={`Option ${oi + 1}`} className="bg-transparent text-[10px] text-white outline-none w-full" value={opt} onChange={(e) => { const nq = [...questions]; nq[qi].options[oi] = e.target.value; setQuestions(nq); }} />
                        </div>
                      ))}
                    </div>
                    <textarea 
                      placeholder="Explanation / Reasoning (Shown to trainee after quiz)" 
                      title="Question Explanation"
                      rows={2}
                      className={`${inputCls} !py-2 !text-[10px] !bg-slate-900/30 font-medium`} 
                      value={q.explanation || ''} 
                      onChange={(e) => { const nq = [...questions]; nq[qi].explanation = e.target.value; setQuestions(nq); }} 
                    />
                  </div>
                ))}
              </div>
            </div>
          </Section>
        </div>
      </div>
      <div className="flex gap-3 mt-6">
        <button 
          type="button"
          onClick={onClose}
          className="flex-1 py-3 bg-[#1e293b] border border-[#334155] hover:bg-[#2d3a4f] text-white font-semibold text-sm rounded-xl cursor-pointer transition-colors"
        >
          Cancel
        </button>
        {!showPreview && (
          <button 
            type="button"
            onClick={() => setShowPreview(true)}
            disabled={!title.trim()}
            className="flex-1 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-cyan-400 font-semibold text-sm rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2"
          >
            <Eye className="h-4 w-4" /> Preview
          </button>
        )}
        <button type="button" onClick={async () => {
          try {
            if (!title.trim()) {
              showToast('Course title is required.', 'error');
              return;
            }

            setIsSubmitting(true);
            showToast(isEdit ? 'Updating Central Registry...' : 'Saving to Central Registry...', 'info');

            const safeVideoUrls: string[] = [];
            const safeVideoTitles: string[] = [];
            const safeVideoDurations: string[] = [];

            videoUrls.forEach((u, i) => {
              if (u.trim() !== '') {
                safeVideoUrls.push(getEmbeddableYoutubeUrl(u));
                safeVideoTitles.push(videoTitles[i]?.trim() || `Lesson ${safeVideoUrls.length}`);
                safeVideoDurations.push(videoDurations[i]?.trim() || '10:00');
              }
            });

            const safePdfUrls = pdfUrls.filter(u => u.trim() !== '').map(getEmbeddableDriveUrl);

            // Validation: Ensure questions aren't placeholders
            const hasInvalidQuestions = questions.some(
              q => !q.text.trim() || q.text === 'Enter question' || q.options.some(opt => !opt.trim() || opt.startsWith('Option '))
            );
            
            if (hasInvalidQuestions) {
              showToast('Please update placeholder questions and options before saving.', 'error');
              setIsSubmitting(false);
              return;
            }

            const payload = {
              title,
              description,
              category,
              level,
              deadline: hasDeadline && deadline ? deadline : null,
              passingScore,
              quizTimeLimit,
              departments: normalizeDepartmentsForPayload(depts),
              isDefaultForNewTrainees,
              instructorName: instructorName.trim(),
              instructorRole: instructorRole.trim(),
              objectives: objectives.filter(o => o.trim()),
              thumbnail,
              thumbnailMeta: thumbnail ? thumbnailMeta : undefined,
              videoUrls: safeVideoUrls,
              videoTitles: safeVideoTitles,
              videoDurations: safeVideoDurations,
              pdfUrls: safePdfUrls,
              theme: selectedTheme,
              status: 'Active',
              modules: Math.max(safeVideoUrls.length, safePdfUrls.length, 1),
              quiz: { questions },
            };

            const url = isEdit && course ? `/api/admin/courses/${encodeURIComponent(course.id)}` : '/api/admin/courses';
            const method = isEdit ? 'PUT' : 'POST';
            const response = await fetch(url, {
              method,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.ok) {
              throw new Error(data.message || 'Failed to save course');
            }

            await onSaved();
            showToast(isEdit ? `Course "${title}" updated!` : `Course "${title}" created & assigned!`, 'success');
            onClose();
          } catch (error) {
            showToast(error instanceof Error ? error.message : 'Failed to save course.', 'error');
          } finally {
            setIsSubmitting(false);
          }
        }} disabled={isSubmitting} className="flex-[2] py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold text-sm rounded-xl cursor-pointer transition-colors disabled:opacity-50">
          {isSubmitting ? 'Syncing...' : isEdit ? 'Update Course & Sync' : 'Create & Sync Course'}
        </button>
      </div>
          </>
        )}
      </>
    </Modal>
  );
}




