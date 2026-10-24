import { generateGroqJson } from '@/lib/services/groq';
import type { ITranscriptCue } from '@/lib/models/Course';
import { formatTranscriptCues } from '@/lib/utils/transcript';

// ── types ───────────────────────────────────────────────────────────────────

export interface GeneratedStudyGuide {
  mentalModel: string;
  keyIdeas: string[];
  misconceptions: string[];
  recallPrompts: string[];
  explainBackPrompt: string;
}

export interface GenerateStudyGuideInput {
  lessonTitle: string;
  cues: ITranscriptCue[];
  userId?: string;
}

type RawStudyGuideResponse = {
  mentalModel?: string;
  mental_model?: string;
  keyIdeas?: string[];
  key_ideas?: string[];
  misconceptions?: string[];
  recallPrompts?: string[];
  recall_prompts?: string[];
  explainBackPrompt?: string;
  explain_back_prompt?: string;
  explainItBackPrompt?: string;
};

// ── system prompt ───────────────────────────────────────────────────────────

const STUDY_GUIDE_SYSTEM_PROMPT = `You are a master technical educator creating study companions for online course lessons.

Given a lesson transcript, generate a complete study guide with all five sections below.

Return JSON matching this exact structure:
{
  "mentalModel": "A vivid 2-4 sentence paragraph that gives the learner a mental model or analogy for the core concept taught in this lesson. It should be intuitive and memorable.",
  "keyIdeas": [
    "First key idea — a concise, self-contained statement of an important concept from the transcript",
    "Second key idea",
    "Third key idea"
  ],
  "misconceptions": [
    "A common misconception about this topic that learners often hold, stated as a false belief",
    "Another misconception"
  ],
  "recallPrompts": [
    "A thought-provoking question that tests conceptual understanding, not trivial recall",
    "Another recall question"
  ],
  "explainBackPrompt": "A single prompt asking the learner to explain a core concept from the lesson in their own words, as if teaching someone else."
}

Constraints:
- mentalModel: 2-4 sentences. Use a concrete analogy or metaphor grounded in the transcript.
- keyIdeas: 3-6 items. Each is a single concise statement. Cover different parts of the transcript.
- misconceptions: 2-4 items. State each as a false belief that sounds plausible. Ground them in the topic.
- recallPrompts: 2-4 items. Ask "why" or "how" questions, not "what minute did X happen".
- explainBackPrompt: Exactly 1 prompt. Ask the learner to explain a central concept in their own words.
- ALL content must be strictly grounded in the provided transcript. Do not invent details not present in it.`;

// ── main function ───────────────────────────────────────────────────────────

export async function generateStudyGuideFromTranscript(
  input: GenerateStudyGuideInput,
): Promise<GeneratedStudyGuide> {
  if (!input.cues || input.cues.length === 0) {
    throw new Error('STUDY_GUIDE_TRANSCRIPT_REQUIRED');
  }

  const transcriptText = formatTranscriptCues(input.cues).slice(0, 24_000);

  const userPrompt = `Lesson Title: ${input.lessonTitle || 'Untitled Lesson'}

Transcript:
${transcriptText}

Generate a complete study guide for this lesson.`;

  const result = await generateGroqJson<RawStudyGuideResponse>({
    model: 'qwen/qwen3.8-27b',
    feature: 'ai-study-guide-generation',
    userId: input.userId,
    temperature: 0.3,
    systemInstruction: STUDY_GUIDE_SYSTEM_PROMPT,
    userPrompt,
  });

  const raw = result.data;

  // Normalize field names (handle both camelCase and snake_case from LLM)
  const mentalModel = (
    raw.mentalModel || raw.mental_model || ''
  ).trim();

  const keyIdeas = (raw.keyIdeas || raw.key_ideas || [])
    .map((item) => String(item).trim())
    .filter(Boolean);

  const misconceptions = (raw.misconceptions || [])
    .map((item) => String(item).trim())
    .filter(Boolean);

  const recallPrompts = (raw.recallPrompts || raw.recall_prompts || [])
    .map((item) => String(item).trim())
    .filter(Boolean);

  const explainBackPrompt = (
    raw.explainBackPrompt ||
    raw.explain_back_prompt ||
    raw.explainItBackPrompt ||
    ''
  ).trim();

  // Validate we got meaningful content
  if (!mentalModel && keyIdeas.length === 0) {
    throw new Error('STUDY_GUIDE_GENERATION_INVALID');
  }

  return {
    mentalModel,
    keyIdeas: keyIdeas.length > 0 ? keyIdeas : [''],
    misconceptions,
    recallPrompts: recallPrompts.length > 0 ? recallPrompts : [''],
    explainBackPrompt,
  };
}
