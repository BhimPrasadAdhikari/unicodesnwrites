import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import path from 'node:path';

import { chromium } from 'playwright';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

const PORT = 3200;
const BASE_URL = `http://localhost:${PORT}`;
const learner = { name: 'Launch Learner', email: 'launch-learner@example.test', password: 'LearnerLaunch123!' };
const admin = { name: 'Launch Admin', email: 'launch-admin@example.test', password: 'AdminLaunch123!' };

async function waitForServer(process: ChildProcess, getOutput: () => string) {
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    if (process.exitCode !== null) throw new Error(`Next.js exited before becoming ready (${process.exitCode})\n${getOutput()}`);
    try {
      const response = await fetch(`${BASE_URL}/signup`, { signal: AbortSignal.timeout(5_000) });
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(`Next.js did not become ready within 180 seconds\n${getOutput()}`);
}

async function stopServer(process: ChildProcess) {
  if (!process.pid || process.exitCode !== null) return;
  spawnSync('taskkill', ['/pid', String(process.pid), '/T', '/F'], { stdio: 'ignore' });
}

async function main() {
  if (process.env.CODEX_PROJECT_SANDBOX !== '1') throw new Error('Run this test through the sandbox environment wrapper.');
  const databaseUrl = process.env.COURSE_AUTH_E2E_MONGODB_URI || 'mongodb://127.0.0.1:27019/course-auth-e2e';
  if (!/^mongodb:\/\/(127\.0\.0\.1|localhost):\d+\/course-auth-e2e$/.test(databaseUrl)) {
    throw new Error('The course auth test accepts only a local course-auth-e2e Mongo database.');
  }
  const baseEnv = { ...process.env };
  delete baseEnv.EMAIL_USER;
  delete baseEnv.EMAIL_PASSWORD;
  const runtimeEnv: NodeJS.ProcessEnv = {
    ...baseEnv,
    MONGODB_URI: databaseUrl,
    NEXTAUTH_URL: BASE_URL,
    NEXTAUTH_SECRET: 'course-auth-e2e-secret-at-least-32-characters',
    NEXT_PUBLIC_APP_URL: BASE_URL,
    NODE_ENV: 'development' as const,
  };

  delete process.env.EMAIL_USER;
  delete process.env.EMAIL_PASSWORD;
  Object.assign(process.env, runtimeEnv);
  const { connectDB } = await import('../lib/db/connection');
  const { User } = await import('../lib/models/User');
  const { default: Course } = await import('../lib/models/Course');
  const { Post } = await import('../lib/models/Post');
  const { default: CourseEnrollment } = await import('../lib/models/CourseEnrollment');
  const { default: Product } = await import('../lib/models/Product');
  const { default: Purchase } = await import('../lib/models/Purchase');
  const { default: LearnerLessonState } = await import('../lib/models/LearnerLessonState');
  const { default: CourseQuizAttempt } = await import('../lib/models/CourseQuizAttempt');
  const { default: LearnerNotebookEntry } = await import('../lib/models/LearnerNotebookEntry');
  const { default: Newsletter } = await import('../lib/models/Newsletter');
  const { default: NewsletterSend } = await import('../lib/models/NewsletterSend');
  const { default: Subscriber } = await import('../lib/models/Subscriber');
  const { Analytics } = await import('../lib/models/Analytics');
  const { Session } = await import('../lib/models/Session');
  const { issueEmailVerificationToken } = await import('../lib/auth/verification');
  const { createCheckoutForProduct, ProductPurchaseError } = await import('../lib/services/purchase');
  const { getPublishedLessonWorkspace } = await import('../lib/services/course-platform');
  const { saveAiNotebookEntry } = await import('../lib/services/learner-persistence');
  const { startOrContinueNewsletterDelivery } = await import('../lib/services/newsletter-delivery');
  const { getConversionFunnels } = await import('../lib/services/analytics-session');
  await connectDB();

  const adminUser = await User.create({
    ...admin,
    password: await bcrypt.hash(admin.password, 12),
    role: 'admin',
    emailVerified: new Date(),
  });
  // Reproduce a pre-tokenVersion admin record. Lean JWT revalidation must treat
  // the missing historical field as version 0, just like hydrated sign-in does.
  await User.collection.updateOne({ _id: adminUser._id }, { $unset: { tokenVersion: '' } });
  const tokenSimulation = {
    version: 1 as const,
    kind: 'token-sampling' as const,
    title: 'Shape the next-token distribution',
    description: 'Adjust temperature and top K to see how logits become a constrained probability distribution.',
    takeaway: 'Temperature reshapes confidence while top K removes the long tail before sampling.',
    temperature: 1,
    topK: 4,
    tokens: [{ label: 'model', logit: 3.2 }, { label: 'system', logit: 2.5 }, { label: 'agent', logit: 2.1 }, { label: 'network', logit: 1.3 }, { label: 'banana', logit: -0.4 }],
  };
  const seededCourse = await Course.create({
    title: 'Launch-safe LLM foundations', slug: 'launch-safe-llm-foundations', eyebrow: 'AIML systems',
    summary: 'A focused course used to prove the complete learner lifecycle.', description: 'Understand the systems beneath modern language models.',
    topic: 'language-models', level: 'foundation', tags: ['llm'], prerequisites: [], learningOutcomes: ['Explain next-token prediction', 'Connect context to token probabilities'],
    audience: ['AIML learners'], instructorName: 'Bhim Prasad Adhikari', featured: true, status: 'published', author: adminUser._id, publishedAt: new Date(),
    modules: [{ key: 'foundations', title: 'Foundations', description: 'Core mental models', lessons: [{
      key: 'next-token', slug: 'next-token-prediction', title: 'Next-token prediction', summary: 'How a language model chooses what comes next.',
      type: 'concept', youtubeVideoId: 'aircAruvnKk', durationMinutes: 8, learningObjectives: ['Explain conditional prediction'], concepts: ['tokens'],
      simulation: tokenSimulation,
      transcript: [{ startSeconds: 0, text: 'A language model predicts a distribution over the next token.' }],
      studyGuide: { mentalModel: 'Prediction over a vocabulary.', keyIdeas: ['Context shapes the distribution.'], misconceptions: [], recallPrompts: ['What is predicted?'], explainBackPrompt: 'Explain next-token prediction.' },
      quiz: [{ key: 'q1', prompt: 'What does the model predict?', options: ['The next token', 'The next database'], correctOption: 0, explanation: 'It predicts a distribution over the next token.' }],
      published: true,
    }] }],
  });
  await Post.create({
    title: 'Interactive attention proof',
    slug: 'interactive-attention-proof',
    excerpt: 'A published article with an authored AIML simulation between its ideas.',
    category: 'AIML',
    tags: ['attention'],
    published: true,
    publishedAt: new Date(),
    author: adminUser._id,
    views: 0,
    readingTime: 3,
    content: `## Before the lab\n\nSimilarity scores need normalization.\n\n\`\`\`aiml-simulation\n${JSON.stringify({
      version: 1,
      kind: 'attention',
      title: 'Inspect an attention head',
      description: 'Move the query position and temperature to see how similarity scores become attention weights.',
      takeaway: 'Attention is a normalized routing distribution, and causal masking removes access to future positions.',
      temperature: 1,
      queryIndex: 2,
      causal: true,
      tokens: [{ label: 'The', similarity: 0.4 }, { label: 'agent', similarity: 1.8 }, { label: 'plans', similarity: 2.7 }, { label: 'carefully', similarity: 1.2 }],
    }, null, 2)}\n\`\`\`\n\n## After the lab\n\nThe distribution routes information into the next representation.`,
  });
  const productBase = {
    shortDescription: 'A release-safety product fixture.',
    longDescription: 'A product fixture used to prove public and private data boundaries.',
    price: 149900,
    currency: 'INR',
    productType: 'Template' as const,
    category: 'AIML',
    tags: ['release-safety'],
    thumbnailImage: 'https://example.test/product.png',
    galleryImages: [],
    fileUrl: 'https://release-safety.public.blob.vercel-storage.com/product.zip',
    fileName: 'product.zip',
    fileSize: 1024,
    fileSizeDisplay: '1 KB',
    previewFiles: [],
    whatsIncluded: ['Product fixture'],
    licenseType: 'Personal' as const,
    version: '1.0',
    featured: false,
    author: adminUser._id,
  };
  const publishedProduct = await Product.create({ ...productBase, title: 'Published release product', slug: 'published-release-product', published: true });
  const draftProduct = await Product.create({ ...productBase, title: 'Draft release product', slug: 'draft-release-product', published: false });
  try {
    await createCheckoutForProduct({ productId: draftProduct._id.toString(), customerEmail: learner.email });
    throw new Error('Draft product checkout unexpectedly succeeded.');
  } catch (error) {
    if (!(error instanceof ProductPurchaseError) || error.statusCode !== 404) throw error;
  }

  await Subscriber.insertMany(Array.from({ length: 4 }, (_, index) => ({
    email: `delivery-${index + 1}@example.test`,
    name: `Delivery ${index + 1}`,
    status: 'confirmed',
    confirmedAt: new Date(),
    source: 'api',
  })));
  const deliveryCampaign = await Newsletter.create({
    subject: 'Concurrent delivery proof',
    previewText: 'Each recipient must be claimed once.',
    content: '<p>Delivery safety test</p>',
    template: 'simple',
    status: 'draft',
    author: adminUser._id,
  });
  await Promise.all([
    startOrContinueNewsletterDelivery(deliveryCampaign._id.toString(), { batchSize: 4 }),
    startOrContinueNewsletterDelivery(deliveryCampaign._id.toString(), { batchSize: 4 }),
  ]);
  const deliveryRows = await NewsletterSend.find({ newsletter: deliveryCampaign._id }).lean();
  const deliveredCampaign = await Newsletter.findById(deliveryCampaign._id).lean();
  if (deliveryRows.length !== 4 || deliveryRows.some((row) => row.status !== 'sent' || row.attemptCount !== 1)) {
    throw new Error('Concurrent newsletter workers did not claim each recipient exactly once.');
  }
  if (deliveredCampaign?.status !== 'sent' || deliveredCampaign.sentCount !== 4) {
    throw new Error('Concurrent newsletter delivery did not finalize campaign totals.');
  }

  const server = spawn(process.execPath, [path.join(process.cwd(), 'node_modules/next/dist/bin/next'), 'dev', '-p', String(PORT)], {
    cwd: process.cwd(), env: runtimeEnv, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
  });
  let serverOutput = '';
  const rememberOutput = (chunk: Buffer) => {
    const output = chunk.toString();
    serverOutput = `${serverOutput}${output}`.slice(-12_000);
    process.stdout.write(output);
  };
  server.stdout?.on('data', rememberOutput);
  server.stderr?.on('data', rememberOutput);

  const browser = await chromium.launch({ headless: true });
  try {
    await waitForServer(server, () => serverOutput);
    const publicProductsResponse = await fetch(`${BASE_URL}/api/products`, { signal: AbortSignal.timeout(120_000) });
    if (!publicProductsResponse.ok) throw new Error(`Public products failed with ${publicProductsResponse.status}`);
    const publicProducts = await publicProductsResponse.json() as Array<Record<string, unknown>>;
    if (publicProducts.length !== 1 || publicProducts[0]?.slug !== 'published-release-product') {
      throw new Error('Public products did not enforce published-only visibility.');
    }
    for (const privateField of ['fileUrl', 'fileName', 'author']) {
      if (privateField in publicProducts[0]) throw new Error(`Public product exposed ${privateField}.`);
    }
    const sitemapResponse = await fetch(`${BASE_URL}/sitemap.xml`, { signal: AbortSignal.timeout(120_000) });
    const sitemapXml = await sitemapResponse.text();
    for (const expectedUrl of [
      '/courses/launch-safe-llm-foundations',
      '/blog/interactive-attention-proof',
      '/products/published-release-product',
    ]) {
      if (!sitemapResponse.ok || !sitemapXml.includes(expectedUrl)) throw new Error(`Dynamic sitemap omitted ${expectedUrl}.`);
    }
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.setDefaultTimeout(90_000);
    page.setDefaultNavigationTimeout(90_000);
    await page.goto(`${BASE_URL}/blog/interactive-attention-proof`, { waitUntil: 'domcontentloaded' });
    const blogSimulation = page.getByTestId('aiml-simulation');
    await blogSimulation.getByRole('heading', { name: 'Inspect an attention head' }).waitFor();
    await blogSimulation.getByLabel('Attention query position').selectOption('1');
    await blogSimulation.getByText('agent', { exact: true }).first().waitFor();
    await page.getByRole('heading', { name: 'After the lab' }).waitFor();
    const blogSchema = await page.locator('script[type="application/ld+json"]').allTextContents();
    if (!blogSchema.some((value) => value.includes('BlogPosting') && value.includes('Interactive attention proof'))) throw new Error('Published blog structured data is missing.');
    const analyticsDeadline = Date.now() + 30_000;
    while (Date.now() < analyticsDeadline && !(await Analytics.exists({ event: 'blog_view', page: '/blog/interactive-attention-proof' }))) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    if (!(await Analytics.exists({ event: 'blog_view', page: '/blog/interactive-attention-proof' }))) throw new Error('A pre-script blog event was not queued and persisted.');

    const idempotencyResult = await page.evaluate(async () => {
      const payload = {
        eventId: 'evt_reliable_probe_2026',
        event: 'reliable_probe',
        sessionId: 'session_reliable_probe_2026',
        visitorId: 'visitor_reliable_probe_2026',
        page: '/reliability-proof',
        metadata: { proof: true },
        timestamp: new Date().toISOString(),
      };
      const send = () => fetch('/api/analytics/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const [first, second] = await Promise.all([send(), send()]);
      return [first.status, second.status];
    });
    if (idempotencyResult.some((status) => status !== 200)) throw new Error('Analytics retry request failed.');
    if (await Analytics.countDocuments({ eventId: 'evt_reliable_probe_2026' }) !== 1) throw new Error('Analytics retry created a duplicate event.');
    const reliabilitySession = await Session.findOne({ sessionId: 'session_reliable_probe_2026' }).lean();
    if (reliabilitySession?.events !== 1) throw new Error('Analytics retry inflated the session event count.');
    const intendedPath = '/courses/launch-safe-llm-foundations';
    await page.goto(`${BASE_URL}/signup?from=${encodeURIComponent(intendedPath)}`);
    await page.waitForFunction(() => {
      const form = document.querySelector('form');
      return Boolean(form && Object.keys(form).some((key) => key.startsWith('__reactProps')));
    });
    await page.getByLabel('Name').fill(learner.name);
    await page.getByLabel('Email').fill(learner.email);
    await page.getByLabel('Password').fill(learner.password);
    await page.getByRole('button', { name: 'Create learning account' }).click();
    try {
      await page.waitForURL(/\/verify-email\?sent=1/, { waitUntil: 'commit' });
    } catch (error) {
      const alert = await page.getByRole('alert').textContent().catch(() => null);
      throw new Error(`Signup did not navigate. URL=${page.url()} alert=${alert || 'none'}\n${serverOutput}`, { cause: error });
    }
    if (new URL(page.url()).searchParams.get('from') !== intendedPath) throw new Error('Signup did not preserve the learner return path.');

    const learnerUser = await User.findOne({ email: learner.email }).lean();
    if (!learnerUser || learnerUser.emailVerified) throw new Error('Signup did not create an unverified learner.');
    const token = await issueEmailVerificationToken(learnerUser._id.toString());
    await page.goto(`${BASE_URL}/verify-email?token=${encodeURIComponent(token)}&from=${encodeURIComponent(intendedPath)}`);
    await page.getByLabel('Confirm your account password').fill(learner.password);
    await page.getByRole('button', { name: 'Verify email address' }).click();
    await page.getByText('Email verified. You can now sign in.').waitFor();
    await page.getByRole('link', { name: 'Continue to sign in' }).click();
    await page.getByLabel('Email').fill(learner.email);
    await page.getByLabel('Password').fill(learner.password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    try {
      await page.waitForURL(`${BASE_URL}${intendedPath}`, { waitUntil: 'commit' });
    } catch (error) {
      const alert = await page.getByRole('alert').textContent().catch(() => null);
      throw new Error(`Learner login did not navigate. URL=${page.url()} alert=${alert || 'none'}\n${serverOutput}`, { cause: error });
    }
    const courseSchema = await page.locator('script[type="application/ld+json"]').allTextContents();
    if (!courseSchema.some((value) => value.includes('"@type":"Course"') && value.includes('Launch-safe LLM foundations'))) throw new Error('Course structured data is missing.');

    await page.getByRole('button', { name: 'Enroll for free' }).click();
    await page.waitForURL(/\/courses\/launch-safe-llm-foundations\/learn\/next-token-prediction/, { waitUntil: 'commit' });
    const lessonSimulation = page.getByTestId('aiml-simulation');
    await lessonSimulation.getByRole('heading', { name: 'Shape the next-token distribution' }).waitFor();
    await lessonSimulation.getByLabel('Sampling top K').fill('1');
    await lessonSimulation.getByRole('button', { name: 'Sample next token' }).click();
    await lessonSimulation.getByText('Sampled:').waitFor();
    await page.getByRole('button', { name: 'Mark complete' }).click();
    await page.getByRole('button', { name: 'Completed' }).waitFor();
    let enrollment = await CourseEnrollment.findOne({ user: learnerUser._id }).lean();
    const progressDeadline = Date.now() + 30_000;
    while (Date.now() < progressDeadline && (!enrollment?.completedLessonSlugs.includes('next-token-prediction') || enrollment.status !== 'completed')) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      enrollment = await CourseEnrollment.findOne({ user: learnerUser._id }).lean();
    }
    if (!enrollment?.completedLessonSlugs.includes('next-token-prediction') || enrollment.status !== 'completed') {
      throw new Error('Lesson completion was not persisted to the enrollment.');
    }

    await page.getByRole('button', { name: 'AI Notes' }).click();
    await page.getByLabel('My notes').fill('Attention rescales evidence before the next-token decision.');
    await page.getByText('Synced across your devices').waitFor();
    let lessonState = await LearnerLessonState.findOne({ user: learnerUser._id, lessonSlug: 'next-token-prediction' }).lean();
    const notesDeadline = Date.now() + 30_000;
    while (Date.now() < notesDeadline && lessonState?.notes !== 'Attention rescales evidence before the next-token decision.') {
      await new Promise((resolve) => setTimeout(resolve, 300));
      lessonState = await LearnerLessonState.findOne({ user: learnerUser._id, lessonSlug: 'next-token-prediction' }).lean();
    }
    if (lessonState?.notes !== 'Attention rescales evidence before the next-token decision.') throw new Error('Personal lesson notes were not synchronized.');
    enrollment = await CourseEnrollment.findOne({ user: learnerUser._id }).lean();
    if (enrollment?.lastLessonSlug !== 'next-token-prediction') throw new Error('Enrollment resume pointer was not persisted.');

    await page.getByRole('button', { name: 'Quiz', exact: true }).click();
    await page.getByLabel('The next token').check();
    await page.getByRole('button', { name: 'Check answers' }).click();
    await page.getByText('Concept check passed.').waitFor();
    if (!(await CourseQuizAttempt.exists({ user: learnerUser._id, lessonSlug: 'next-token-prediction', passed: true }))) throw new Error('Quiz attempt was not persisted.');

    const lessonWorkspace = await getPublishedLessonWorkspace('launch-safe-llm-foundations', 'next-token-prediction');
    if (!lessonWorkspace) throw new Error('Published lesson workspace disappeared during notebook test.');
    await saveAiNotebookEntry(learnerUser._id.toString(), lessonWorkspace, 'attention scaling', {
      title: 'Attention scaling mental model', explanation: 'Scaling keeps attention scores in a useful range.',
      evidence: ['A language model predicts a distribution over the next token.'], checkYourself: 'Why can unscaled scores become unstable?',
    });
    await page.goto(`${BASE_URL}/learn/notebook`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'AI notebook' }).waitFor();
    await page.getByText('Attention scaling mental model').waitFor();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/courses/launch-safe-llm-foundations/learn/next-token-prediction`, { waitUntil: 'domcontentloaded' });
    const mobileTools = page.getByRole('navigation', { name: 'Mobile lesson tools' });
    await mobileTools.waitFor();
    await page.waitForFunction(() => {
      const button = document.querySelector('[aria-label="Mobile lesson tools"] button');
      return Boolean(button && Object.keys(button).some((key) => key.startsWith('__reactProps')));
    });
    await mobileTools.getByRole('button', { name: 'Notes' }).click();
    await page.getByLabel('Lesson study tools').waitFor();
    await page.getByRole('button', { name: 'Close study tools' }).last().click();
    await page.setViewportSize({ width: 1440, height: 900 });

    await Purchase.create({
      purchaseId: 'launch-purchase-1', product: publishedProduct._id, customerEmail: learner.email, customerName: learner.name,
      amount: publishedProduct.price, currency: publishedProduct.currency, razorpayOrderId: 'order_launchPurchase1',
      razorpayPaymentId: 'pay_launchPurchase1', status: 'completed', downloadToken: 'launch-download-token',
      downloadTokenExpiry: new Date(Date.now() + 60 * 60 * 1000), downloadCount: 0, maxDownloads: 5, emailSent: true, purchasedAt: new Date(),
    });
    await page.goto(`${BASE_URL}/account`);
    await page.getByRole('heading', { name: 'Settings and purchases' }).waitFor();
    await page.getByText('Published release product').waitFor();
    await page.getByLabel('Display name').fill('Launch Learner Updated');
    await page.getByRole('button', { name: 'Save profile' }).click();
    await page.getByText('Profile updated.').waitFor();
    const updatedLearner = await User.findById(learnerUser._id).select('name').lean();
    if (updatedLearner?.name !== 'Launch Learner Updated') throw new Error('Account profile update did not persist.');
    await page.getByRole('link', { name: 'Export my data' }).waitFor();

    const adminPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
    adminPage.setDefaultTimeout(180_000);
    adminPage.setDefaultNavigationTimeout(180_000);
    await adminPage.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await adminPage.waitForFunction(() => {
      const form = document.querySelector('form');
      return Boolean(form && Object.keys(form).some((key) => key.startsWith('__reactProps')));
    });
    await adminPage.getByLabel('Email').fill(admin.email);
    await adminPage.getByLabel('Password').fill(admin.password);
    await adminPage.getByRole('button', { name: 'Sign in', exact: true }).click();
    try {
      await adminPage.waitForURL(`${BASE_URL}/dashboard`, { waitUntil: 'commit' });
    } catch (error) {
      const alert = await adminPage.getByRole('alert').textContent().catch(() => null);
      throw new Error(`Admin login did not navigate. URL=${adminPage.url()} alert=${alert || 'none'}\n${serverOutput}`, { cause: error });
    }
    const adminSession = await adminPage.evaluate(async () => (await fetch('/api/auth/session')).json());
    if (!adminSession.user?.sessionValid) throw new Error('Legacy admin tokenVersion normalization did not produce a valid session.');
    const funnelDeadline = Date.now() + 30_000;
    let courseFunnel = (await getConversionFunnels({ range: '7days' })).course;
    while (Date.now() < funnelDeadline && courseFunnel.some((step) => step.value !== 1)) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      courseFunnel = (await getConversionFunnels({ range: '7days' })).course;
    }
    if (courseFunnel.some((step, index) => step.value !== 1 || (index > 0 && step.value > courseFunnel[index - 1].value))) throw new Error(`Course conversion funnel is incomplete or non-monotonic: ${JSON.stringify(courseFunnel)}`);
    const realEvents = await adminPage.evaluate(async () => (await fetch('/api/analytics/events?range=7days&limit=50')).json());
    if (!realEvents.events?.some((event: { name: string }) => event.name === 'reliable_probe')) throw new Error('Admin event analytics did not return persisted database events.');
    await adminPage.goto(`${BASE_URL}/dashboard/enrollments`, { waitUntil: 'domcontentloaded' });
    await adminPage.getByText(learner.email).waitFor();
    await adminPage.getByText('Launch-safe LLM foundations').first().waitFor();
    await adminPage.getByText('Average quiz score').waitFor();
    await adminPage.getByText('Lesson activity').waitFor();

    await adminPage.goto(`${BASE_URL}/dashboard/courses/${seededCourse._id.toString()}/preview`, { waitUntil: 'domcontentloaded' });
    await adminPage.getByText('Admin preview').waitFor();
    await adminPage.getByRole('heading', { name: 'Launch-safe LLM foundations' }).waitFor();

    const importedTranscript = await adminPage.evaluate(async () => {
      const response = await fetch('/api/courses/transcript/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: 'lesson.vtt',
          content: 'WEBVTT\n\n00:00:00.000 --> 00:00:04.000\nA model predicts the next token.\n\n00:00:04.000 --> 00:00:08.000\nContext changes the distribution.',
        }),
      });
      return { status: response.status, body: await response.json() };
    });
    if (importedTranscript.status !== 200 || importedTranscript.body.cues?.length !== 2) throw new Error('Admin VTT transcript import failed.');

    await adminPage.goto(`${BASE_URL}/dashboard/courses/${seededCourse._id.toString()}/edit`, { waitUntil: 'domcontentloaded' });
    const titleInput = adminPage.getByLabel('Course title');
    await titleInput.waitFor();
    await adminPage.waitForFunction(() => {
      const input = document.querySelector('input[placeholder="Language Models from First Principles"]');
      return Boolean(input && Object.keys(input).some((key) => key.startsWith('__reactProps')));
    });
    await adminPage.getByRole('button', { name: /Lesson tools/ }).click();
    const simulationModel = adminPage.getByLabel('Simulation model');
    await simulationModel.waitFor();
    if (await simulationModel.inputValue() !== 'token-sampling') throw new Error('Admin course editor did not restore the authored lesson simulation.');
    await adminPage.getByRole('button', { name: /^1.*Course$/ }).click();
    await titleInput.fill('Launch-safe LLM foundations revised');
    await adminPage.getByText(/Autosaved · revision 2/).waitFor();
    await adminPage.getByRole('button', { name: 'History' }).click();
    await adminPage.getByText('Revision 1', { exact: false }).waitFor();

    const staleUpdate = await adminPage.evaluate(async (courseId) => {
      const loaded = await fetch(`/api/courses/${courseId}`);
      const payload = await loaded.json();
      const normalizedCourse = {
        ...payload.course,
        modules: payload.course.modules.map((module: { lessons: Array<{ type: string; visualization?: unknown }> }) => ({
          ...module,
          lessons: module.lessons.map((lesson) => ({
            ...lesson,
            visualization: lesson.type === 'visual-intuition' ? lesson.visualization : undefined,
          })),
        })),
      };
      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course: normalizedCourse, expectedRevision: 1, reason: 'manual' }),
      });
      return { status: response.status, body: await response.json() };
    }, seededCourse._id.toString());
    if (staleUpdate.status !== 409 || staleUpdate.body.currentRevision !== 2) throw new Error('Stale course version was not rejected.');
    await adminPage.close();

    await page.goto(`${BASE_URL}/account`);
    await page.getByLabel('Password', { exact: true }).fill(learner.password);
    await page.getByLabel('Type DELETE to confirm').fill('DELETE');
    await page.getByRole('button', { name: 'Permanently delete account' }).click();
    await page.waitForURL(`${BASE_URL}/`, { waitUntil: 'commit' });
    if (await User.exists({ _id: learnerUser._id })) throw new Error('Deleted learner account still exists.');
    if (await CourseEnrollment.exists({ user: learnerUser._id })) throw new Error('Deleted learner progress still exists.');
    if (await LearnerLessonState.exists({ user: learnerUser._id })) throw new Error('Deleted learner lesson state still exists.');
    if (await CourseQuizAttempt.exists({ user: learnerUser._id })) throw new Error('Deleted learner quiz attempts still exist.');
    if (await LearnerNotebookEntry.exists({ user: learnerUser._id })) throw new Error('Deleted learner notebook entries still exist.');
    const redactedPurchase = await Purchase.findOne({ purchaseId: 'launch-purchase-1' }).lean();
    if (!redactedPurchase?.customerEmail.endsWith('@redacted.invalid')) throw new Error('Deleted learner purchase identity was not redacted.');
    await page.close();
    console.log('PASS: learner lifecycle -> admin analytics -> draft preview -> transcript import -> autosave/version conflict -> account deletion');
  } finally {
    await browser.close();
    await stopServer(server);
    await mongoose.disconnect();
  }
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => undefined);
  process.exitCode = 1;
});
