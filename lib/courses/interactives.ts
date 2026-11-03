// Built-in interactive visualizations a lesson can embed. Lessons store only
// the key; the React components live in components/course-interactives.
export const LESSON_INTERACTIVES = [
  { key: 'think-budget', label: 'Thinking budget vs accuracy' },
  { key: 'reward-grader', label: 'Reward grader (format + correctness)' },
  { key: 'policy-nudge', label: 'Policy nudge (softmax update)' },
  { key: 'group-advantage', label: 'Group advantages (GRPO)' },
  { key: 'clip-explorer', label: 'Clipped objective explorer' },
  { key: 'training-run', label: 'Live GRPO training run (Tiny Adder)' },
  { key: 'length-aha', label: 'Response length and the "aha" moment' },
  { key: 'distill-compare', label: 'Distillation: teacher vs student' },
] as const;

export type LessonInteractiveKey = (typeof LESSON_INTERACTIVES)[number]['key'];

export const LESSON_INTERACTIVE_KEYS = LESSON_INTERACTIVES.map((item) => item.key) as [
  LessonInteractiveKey,
  ...LessonInteractiveKey[],
];

export const LESSON_RESOURCE_KINDS = ['notebook', 'cheatsheet', 'repo', 'slides', 'dataset', 'link'] as const;
