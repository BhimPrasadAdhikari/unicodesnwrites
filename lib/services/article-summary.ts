import { generateGroqJson } from '@/lib/services/groq';

export type ArticleSummary = {
  tldr: string;
  keyTakeaways: string[];
  targetAudience: string;
};

export async function generateArticleSummary(
  title: string,
  content: string,
  userId?: string
): Promise<ArticleSummary> {
  if (!content || content.trim().length < 50) {
    throw new Error('CONTENT_TOO_SHORT');
  }

  const sanitizedContent = content
    .replace(/<[^>]+>/g, '')
    .slice(0, 16_000);

  const result = await generateGroqJson<Partial<ArticleSummary>>({
    model: process.env.GROQ_MODEL,
    feature: 'article-summary',
    userId,
    temperature: 0.2,
    systemInstruction:
      'You are a senior technical editor. Provide a concise executive summary for the supplied blog post. ' +
      'Return JSON containing: tldr (a 2-3 sentence core summary as a string), keyTakeaways (an array of 3-5 bulleted takeaway strings), and targetAudience (a short 1-sentence string describing who benefits most from reading). ' +
      'Be clear, rigorous, and faithful to the source article.',
    userPrompt: `Article Title: ${title}\n\nArticle Body:\n${sanitizedContent}`,
  });

  const parsed = result.data;
  if (!parsed.tldr || !Array.isArray(parsed.keyTakeaways) || !parsed.keyTakeaways.length) {
    throw new Error('ARTICLE_SUMMARY_INVALID');
  }

  return {
    tldr: String(parsed.tldr),
    keyTakeaways: parsed.keyTakeaways.map(String).slice(0, 5),
    targetAudience: String(parsed.targetAudience || 'Engineers, AIML builders, and technical leaders'),
  };
}
