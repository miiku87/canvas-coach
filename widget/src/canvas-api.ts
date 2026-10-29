/**
 * Minimal Canvas REST client. Runs inside Canvas, so the teacher's own session
 * cookie authenticates the requests: the coach sees exactly what they can see.
 */
export async function canvasGet<T>(path: string): Promise<T> {
  const res = await fetch(path, {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Canvas API ${res.status}: ${path}`);
  // Canvas may prefix JSON with "while(1);" to prevent JSON hijacking.
  const text = (await res.text()).replace(/^while\(1\);/, "");
  return JSON.parse(text) as T;
}

export interface CanvasCourse {
  id: number;
  name: string;
  course_code?: string;
  default_view?: "feed" | "wiki" | "modules" | "assignments" | "syllabus";
  start_at?: string | null;
  end_at?: string | null;
  syllabus_body?: string | null;
  enrollments?: Array<{ type: string; role?: string }>;
}

export interface CanvasPage {
  title: string;
  body?: string | null;
  front_page?: boolean;
  published?: boolean;
  updated_at?: string;
}

export interface CanvasRubricCriterion {
  description: string;
  long_description?: string;
  points: number;
  ratings?: Array<{ description: string; points: number }>;
}

export interface CanvasAssignment {
  name: string;
  description?: string | null;
  due_at?: string | null;
  unlock_at?: string | null;
  lock_at?: string | null;
  points_possible?: number | null;
  grading_type?: string;
  submission_types?: string[];
  allowed_extensions?: string[];
  allowed_attempts?: number;
  published?: boolean;
  peer_reviews?: boolean;
  group_category_id?: number | null;
  rubric?: CanvasRubricCriterion[];
  is_quiz_assignment?: boolean;
}

export interface CanvasDiscussion {
  title: string;
  message?: string | null;
  is_announcement?: boolean;
  published?: boolean;
  require_initial_post?: boolean;
  discussion_type?: string;
  delayed_post_at?: string | null;
  lock_at?: string | null;
  assignment?: CanvasAssignment | null;
}

export interface CanvasQuiz {
  title: string;
  description?: string | null;
  quiz_type?: string;
  time_limit?: number | null;
  allowed_attempts?: number;
  points_possible?: number | null;
  question_count?: number;
  due_at?: string | null;
  unlock_at?: string | null;
  lock_at?: string | null;
  shuffle_answers?: boolean;
  show_correct_answers?: boolean;
  one_question_at_a_time?: boolean;
  published?: boolean;
}

export interface CanvasModule {
  name: string;
  position: number;
  published?: boolean;
  unlock_at?: string | null;
  require_sequential_progress?: boolean;
  prerequisite_module_ids?: number[];
  items_count?: number;
  items?: Array<{
    title: string;
    type: string;
    indent?: number;
    published?: boolean;
    completion_requirement?: { type: string } | null;
  }>;
}

export interface CanvasTab {
  id: string;
  label: string;
  hidden?: boolean;
  visibility?: string;
}
