import Groq from 'groq-sdk';
import dbConnect from '@/lib/db/connection';
import AiGenerationLog from '@/lib/models/AiGenerationLog';

const DEFAULT_MODEL = 'openai/gpt-oss-20b';

type GenerateJsonOptions = {
  systemInstruction: string;
  userPrompt: string;
  temperature?: number;
  model?: string;
  feature?: string;
  userId?: string;
};

export type GroqJsonResult<T> = {
  data: T;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
};

function stripJsonFence(value: string) {
  return value.replace(/^\uFEFF/, '').replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
}

function removeTrailingJsonCommas(value: string) {
  let result = '';
  let inString = false;
  let escaped = false;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    const nextSignificant = value.slice(index + 1).match(/\S/)?.[0];
    if (escaped) { result += character; escaped = false; continue; }
    if (character === '\\') { result += character; escaped = true; continue; }
    if (character === '"') { result += character; inString = !inString; continue; }
    if (!inString && character === ',' && (nextSignificant === '}' || nextSignificant === ']')) continue;
    result += character;
  }
  return result;
}

function findBalancedJson(value: string) {
  const start = value.search(/[\[{]/);
  if (start === -1) return null;
  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let index = start; index < value.length; index += 1) {
    const character = value[index];
    if (escaped) { escaped = false; continue; }
    if (character === '\\') { escaped = true; continue; }
    if (character === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (character === '{' || character === '[') { stack.push(character === '{' ? '}' : ']'); continue; }
    if (character === '}' || character === ']') {
      if (stack.pop() !== character) return null;
      if (!stack.length) return value.slice(start, index + 1);
    }
  }
  return null;
}

export function parseGroqJson<T>(text: string): T {
  const cleaned = stripJsonFence(text);
  const balanced = findBalancedJson(cleaned);
  const candidates = [cleaned, balanced, removeTrailingJsonCommas(cleaned), balanced ? removeTrailingJsonCommas(balanced) : null]
    .filter((value): value is string => Boolean(value));
  for (const candidate of candidates) {
    try { return JSON.parse(candidate) as T; } catch { /* try next candidate */ }
  }
  throw new Error('GROQ_INVALID_JSON');
}

export function isGroqConfigured() {
  return Boolean(process.env.GROQ_API_KEY);
}

async function recordTelemetry(logData: {
  userId?: string;
  feature: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  status: 'success' | 'error';
  error?: string;
}) {
  try {
    await dbConnect();
    await AiGenerationLog.create(logData);
  } catch (err) {
    console.error('Failed to save AI generation log:', err);
  }
}

export async function generateGroqJson<T>(options: GenerateJsonOptions): Promise<GroqJsonResult<T>> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_NOT_CONFIGURED');

  const model = options.model?.trim() || process.env.GROQ_MODEL?.trim() || DEFAULT_MODEL;
  const client = new Groq({ apiKey });
  const feature = options.feature || 'ai-generation';
  const startTime = Date.now();

  try {
    const completion = await client.chat.completions.create({
      model,
      temperature: options.temperature ?? 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: options.systemInstruction },
        { role: 'user', content: options.userPrompt },
      ],
    });

    const latencyMs = Date.now() - startTime;
    const text = completion.choices[0]?.message?.content;
    if (typeof text !== 'string' || !text.trim()) {
      throw new Error('GROQ_EMPTY_RESPONSE');
    }

    const promptTokens = completion.usage?.prompt_tokens ?? 0;
    const completionTokens = completion.usage?.completion_tokens ?? 0;
    const totalTokens = completion.usage?.total_tokens ?? 0;

    void recordTelemetry({
      userId: options.userId,
      feature,
      model,
      promptTokens,
      completionTokens,
      totalTokens,
      latencyMs,
      status: 'success',
    });

    return {
      data: parseGroqJson<T>(text),
      model,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens,
      },
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    void recordTelemetry({
      userId: options.userId,
      feature,
      model,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      latencyMs,
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
