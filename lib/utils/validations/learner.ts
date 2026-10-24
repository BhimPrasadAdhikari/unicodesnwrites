import { z } from 'zod';

import { cleanMultiline } from '@/lib/utils/sanitize';

export const lessonStatePatchSchema = z.object({
  notes: z.string().max(20_000).transform(cleanMultiline).optional(),
  activeTab: z.enum(['transcript', 'notes', 'quiz']).optional(),
  videoPositionSeconds: z.number().finite().min(0).max(86_400).transform(Math.floor).optional(),
}).refine((value) => Object.values(value).some((item) => item !== undefined), 'No learning state supplied');
