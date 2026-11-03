import { renderToStaticMarkup } from 'react-dom/server';
import { LessonMarkdown } from '@/components/public/LessonRichContent';
import { loadCourseFolder } from './load';
const course = loadCourseFolder(process.cwd(), process.argv[2] || 'teach-a-small-ai-to-think');
let count = 0;
for (const lesson of course.modules.flatMap((m) => m.lessons)) {
  const docs = [lesson.article, ...lesson.exercises.flatMap((e) => [e.prompt, e.solution, ...e.hints]), ...(lesson.codeWalkthrough?.steps || []).map((s) => s.markdown)];
  for (const doc of docs) {
    const html = renderToStaticMarkup(<LessonMarkdown>{doc}</LessonMarkdown>);
    if (html.length < 20) throw new Error(`${lesson.slug}: empty render`);
    count += 1;
  }
}
console.log(`rendered ${count} markdown documents without errors`);
