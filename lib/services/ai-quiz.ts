import type { ITranscriptCue } from '@/lib/models/Course';
import { generateGroqJson } from '@/lib/services/groq';

export type GeneratedQuizQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type GeneratedQuiz = {
  title: string;
  questions: GeneratedQuizQuestion[];
};

export async function generateGroundedQuiz(
  lessonTitle: string,
  cues: ITranscriptCue[],
  userId?: string
): Promise<GeneratedQuiz> {
  if (!cues || !cues.length) {
    throw new Error('TRANSCRIPT_REQUIRED_FOR_QUIZ');
  }

  const transcriptText = cues
    .map((cue) => `[${Math.floor(cue.startSeconds / 60)}:${String(cue.startSeconds % 60).padStart(2, '0')}] ${cue.text}`)
    .join('\n')
    .slice(0, 16_000);

  const result = await generateGroqJson<Partial<GeneratedQuiz>>({
    model: process.env.GROQ_MODEL,
    feature: 'ai-quiz',
    userId,
    temperature: 0.3,
    systemInstruction:
      'You are an expert technical curriculum designer. Generate a 4 to 5 question multiple choice quiz based strictly on the provided lesson transcript. ' +
      'Return JSON with title (string) and questions (an array of objects). ' +
      'Each question object must contain: question (string), options (array of 4 distinct choices as strings), correctIndex (number 0-3), and explanation (string grounded in the transcript). ' +
      'Never invent information outside the transcript.',
    userPrompt: `Lesson Title: ${lessonTitle}\n\nLesson Transcript:\n${transcriptText}`,
  });

  const parsed = result.data;
  if (!parsed.questions || !Array.isArray(parsed.questions) || !parsed.questions.length) {
    throw new Error('AI_QUIZ_INVALID');
  }

  const validatedQuestions: GeneratedQuizQuestion[] = parsed.questions
    .filter((q) => q.question && Array.isArray(q.options) && q.options.length === 4 && typeof q.correctIndex === 'number')
    .map((q) => ({
      question: String(q.question),
      options: q.options.map(String),
      correctIndex: Math.max(0, Math.min(3, Math.floor(q.correctIndex))),
      explanation: String(q.explanation || ''),
    }));

  if (!validatedQuestions.length) {
    throw new Error('AI_QUIZ_INVALID');
  }

  return {
    title: parsed.title || `${lessonTitle} Checkpoint Quiz`,
    questions: validatedQuestions.slice(0, 5),
  };
}
