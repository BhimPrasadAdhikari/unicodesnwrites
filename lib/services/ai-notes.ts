import type { LessonWorkspaceDTO } from '@/lib/services/course-platform';
import { generateGroqJson } from '@/lib/services/groq';

type GeneratedNote = { title: string; explanation: string; evidence: string[]; checkYourself: string };

export async function generateGroundedAiNote(workspace: LessonWorkspaceDTO, focus: string, userId?: string): Promise<GeneratedNote> {
  const transcript = workspace.lesson.transcript
    .map((cue) => `[${Math.floor(cue.startSeconds / 60)}:${String(cue.startSeconds % 60).padStart(2, '0')}] ${cue.text}`)
    .join('\n')
    .slice(0, 16_000);
  const result = await generateGroqJson<Partial<GeneratedNote>>({
    model: process.env.GROQ_MODEL,
    feature: 'ai-notes',
    userId,
    temperature: 0.2,
    systemInstruction: 'You are a rigorous AIML tutor. Use only the supplied lesson transcript. Return JSON with title (string), explanation (string), evidence (an array of 2-4 short timestamped citation strings, e.g. "[15:30] Text"), and checkYourself (string). Never invent facts not present in the transcript.',
    userPrompt: `Lesson: ${workspace.lesson.title}\nLearner focus: ${focus}\n\nTranscript:\n${transcript}`,
  });
  const parsed = result.data;
  if (!parsed.title || !parsed.explanation || !Array.isArray(parsed.evidence) || !parsed.checkYourself) throw new Error('AI_NOTES_INVALID');
  
  const normalizedEvidence: string[] = parsed.evidence.map((item: unknown) => {
    if (typeof item === 'string') return item;
    if (typeof item === 'object' && item !== null) {
      const obj = item as { timestamp?: string; text?: string; cue?: string; citation?: string };
      if (obj.timestamp && obj.text) return `[${obj.timestamp}] ${obj.text}`;
      if (obj.text) return obj.text;
      if (obj.citation) return obj.citation;
    }
    return String(item);
  }).slice(0, 4);

  return { title: parsed.title, explanation: parsed.explanation, evidence: normalizedEvidence, checkYourself: parsed.checkYourself };
}
