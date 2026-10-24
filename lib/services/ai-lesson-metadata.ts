import type { ITranscriptCue } from '@/lib/models/Course';
import { generateGroqJson } from '@/lib/services/groq';
import { formatTranscriptCues } from '@/lib/utils/transcript';

export interface GeneratedLessonMetadata {
  summary: string;
  learningObjectives: string[];
  concepts: string[];
}

export interface GenerateMetadataInput {
  lessonTitle: string;
  cues?: ITranscriptCue[];
  topicContext?: string;
  userId?: string;
}

type RawMetadataResponse = {
  summary?: string;
  learningObjectives?: string[];
  learning_objectives?: string[];
  objectives?: string[];
  concepts?: string[];
};

const METADATA_SYSTEM_PROMPT = `You are a master AIML curriculum architect. 
Given a lesson title and transcript (or topic details), generate structured lesson metadata.

Return JSON matching this exact structure:
{
  "summary": "A clear, compelling 2-3 sentence summary of what this lesson covers and why it matters.",
  "learningObjectives": [
    "Understand the key mechanics of X",
    "Differentiate between Y and Z",
    "Apply algorithm W to real-world scenarios"
  ],
  "concepts": [
    "Self-Attention",
    "Query Vector",
    "Key-Value Matrix",
    "Softmax Normalization"
  ]
}

Constraints:
- summary: 2-3 sentences max. High signal, clear, concise.
- learningObjectives: 3-5 concise bullet points starting with action verbs (e.g. Understand, Implement, Compare, Evaluate).
- concepts: 3-6 core technical terms or concepts introduced in this lesson.
- Strictly adhere to the facts in the provided transcript/context. Do not introduce unrelated concepts.`;

export async function generateLessonMetadata(
  input: GenerateMetadataInput
): Promise<GeneratedLessonMetadata> {
  let contextText = `Lesson Title: ${input.lessonTitle || 'Untitled Lesson'}`;

  if (input.cues && input.cues.length > 0) {
    const transcriptText = formatTranscriptCues(input.cues).slice(0, 20_000);
    contextText += `\n\nLesson Transcript:\n${transcriptText}`;
  } else if (input.topicContext) {
    contextText += `\n\nLesson Overview/Context:\n${input.topicContext.slice(0, 5_000)}`;
  }

  const result = await generateGroqJson<RawMetadataResponse>({
    model: 'qwen/qwen3.8-27b',
    feature: 'ai-lesson-metadata-generation',
    userId: input.userId,
    temperature: 0.2,
    systemInstruction: METADATA_SYSTEM_PROMPT,
    userPrompt: contextText,
  });

  const raw = result.data;

  const summary = String(raw.summary || '').trim();
  const rawObjectives = raw.learningObjectives || raw.learning_objectives || raw.objectives || [];
  const learningObjectives = rawObjectives
    .map((item) => String(item).trim())
    .filter(Boolean)
    .slice(0, 6);

  const rawConcepts = raw.concepts || [];
  const concepts = rawConcepts
    .map((item) => String(item).trim())
    .filter(Boolean)
    .slice(0, 8);

  if (!summary && learningObjectives.length === 0) {
    throw new Error('LESSON_METADATA_GENERATION_INVALID');
  }

  return {
    summary: summary || `${input.lessonTitle} concept breakdown and implementation guide.`,
    learningObjectives: learningObjectives.length > 0 ? learningObjectives : [`Master core concepts in ${input.lessonTitle}`],
    concepts: concepts.length > 0 ? concepts : [input.lessonTitle],
  };
}
