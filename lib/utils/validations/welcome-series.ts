import { z } from 'zod';

export const WELCOME_SUBJECT_MAX = 120;
export const WELCOME_INTRO_MAX = 1500;

export const welcomeSeriesStepSchema = z.object({
  delayDays: z.number().int().min(0).max(30),
  subject: z.string().trim().min(1, 'Every step needs a subject.').max(WELCOME_SUBJECT_MAX, `Subjects are at most ${WELCOME_SUBJECT_MAX} characters.`),
  intro: z.string().trim().min(1, 'Every step needs an intro.').max(WELCOME_INTRO_MAX, `Intros are at most ${WELCOME_INTRO_MAX} characters.`),
});

export type WelcomeSeriesStep = z.infer<typeof welcomeSeriesStepSchema>;

/** Step 0 is the welcome email sent on confirmation; the scheduler sends the rest. */
export const welcomeSeriesSettingsSchema = z.object({
  enabled: z.boolean(),
  steps: z
    .array(welcomeSeriesStepSchema)
    .length(3)
    .refine((steps) => steps[0].delayDays === 0, 'The first step is sent on confirmation (day 0).')
    .refine(
      (steps) => steps.every((step, index) => index === 0 || step.delayDays > steps[index - 1].delayDays),
      'Each step must be sent later than the one before it.',
    ),
});

export type WelcomeSeriesSettings = z.infer<typeof welcomeSeriesSettingsSchema>;

/** Ships disabled: nothing is emailed until an admin turns it on. */
export const DEFAULT_WELCOME_SERIES: WelcomeSeriesSettings = {
  enabled: false,
  steps: [
    {
      delayDays: 0,
      subject: 'Welcome to unicodesnwrites Newsletter!',
      intro: 'The welcome email sent the moment a reader confirms.',
    },
    {
      delayDays: 2,
      subject: 'Where to start on unicodesnwrites',
      intro: 'Thanks again for subscribing. If you are wondering where to begin, these are the best places to start reading.',
    },
    {
      delayDays: 6,
      subject: 'Going deeper: a course and tools',
      intro: 'One last note in your first week. When you want more than single articles, a course takes you through a topic end to end, and the tools page has the things we use ourselves.\n\nAfter this, you will only hear from us when a new issue goes out.',
    },
  ],
};

/** What the admin page may change: on/off, plus the subject and intro of the scheduled steps. */
export const welcomeSeriesUpdateSchema = z.object({
  enabled: z.boolean(),
  steps: z
    .array(welcomeSeriesStepSchema.pick({ subject: true, intro: true }))
    .length(DEFAULT_WELCOME_SERIES.steps.length - 1),
});

export type WelcomeSeriesUpdate = z.infer<typeof welcomeSeriesUpdateSchema>;
