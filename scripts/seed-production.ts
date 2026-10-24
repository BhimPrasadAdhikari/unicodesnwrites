import 'dotenv/config';
import { connectDB } from '@/lib/db/connection';
import { User } from '@/lib/models/User';
import { Post } from '@/lib/models/Post';
import { calculateReadingTime, generateSlug } from '@/lib/utils/slug';
import bcrypt from 'bcryptjs';

async function seedProduction() {
  await connectDB();
  
  console.log('Seeding production database...');
  
  // Create admin user
  // In production, these should be set in Vercel environment variables
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@unicodesnwrites.tech';
  const adminPassword = process.env.ADMIN_PASSWORD;
  
  if (!adminPassword) {
    console.error('❌ ADMIN_PASSWORD environment variable is not set!');
    process.exit(1);
  }
  
  const existingAdmin = await User.findOne({ email: adminEmail });

  if (existingAdmin) {
    await User.deleteOne({ _id: existingAdmin._id });
    console.log('🗑️  Existing admin user deleted:', adminEmail);
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const adminUser = await User.create({
    email: adminEmail,
    password: hashedPassword,
    name: 'Admin',
    role: 'admin',
  });

  console.log('✅ Admin user created:', adminEmail);
  console.log('⚠️  Password: (hidden)');

  const blogPosts = [
    {
      title: 'AI Writing Tools That Actually Help You Ship Faster',
      excerpt: 'A practical guide to using AI responsibly in content workflows without sacrificing voice or quality.',
      category: 'AI & Writing',
      tags: ['ai', 'writing', 'workflow', 'productivity'],
      content: `# AI Writing Tools That Actually Help You Ship Faster\n\nAI tools can save hours, but only if you treat them like a collaborator rather than a replacement. Start with your intent, outline the problem, and use AI to draft variants or examples.\n\n## A lightweight workflow\n\n1. Define the audience and goal.\n2. Draft a short outline.\n3. Ask for alternatives, not final answers.\n4. Edit to match your brand voice.\n\n## Common pitfalls\n\n- Over-trusting the output.\n- Shipping without fact checks.\n- Losing your tone.\n\nUse AI to get to a solid first draft, then do the human work: clarity, accuracy, and personality.\n`,
      seoTitle: 'AI Writing Tools That Actually Help You Ship Faster',
      seoDescription: 'A practical AI writing workflow that keeps your voice while saving time.',
      seoKeywords: ['AI writing', 'content workflow', 'productivity'],
    },
    {
      title: 'Design Systems for Small Teams: A Minimal Approach',
      excerpt: 'You do not need a massive design system to stay consistent. Here is how to start small and scale later.',
      category: 'Design',
      tags: ['design systems', 'ui', 'ux', 'components'],
      content: `# Design Systems for Small Teams\n\nSmall teams win by moving fast. A minimal design system focuses on what changes most: colors, typography, spacing, and reusable UI blocks.\n\n## Start with tokens\n\nCreate a tiny set of tokens for color and spacing. Use them everywhere. Even a spreadsheet helps.\n\n## Document only what you use\n\nIf a component does not exist in your UI, do not design it yet. Add components as you ship.\n\nConsistency scales when you pair minimal rules with real usage.\n`,
      seoTitle: 'Design Systems for Small Teams',
      seoDescription: 'A lightweight approach to design systems for lean teams.',
      seoKeywords: ['design system', 'ui', 'ux'],
    },
    {
      title: 'Modern Web Performance: Core Web Vitals in 2026',
      excerpt: 'Practical fixes for LCP, CLS, and INP that actually move the needle.',
      category: 'Web Performance',
      tags: ['performance', 'core web vitals', 'web'],
      content: `# Modern Web Performance\n\nCore Web Vitals keep evolving, but the fundamentals still matter: ship less, load faster, and keep UI stable.\n\n## LCP\n\nServe optimized images, avoid layout shifts, and prioritize above-the-fold content.\n\n## CLS\n\nReserve space for images and ads, and avoid late-loading fonts without fallbacks.\n\n## INP\n\nBreak up long tasks, minimize hydration cost, and defer non-critical scripts.\n\nSmall changes compound into measurable wins.\n`,
      seoTitle: 'Core Web Vitals in 2026',
      seoDescription: 'Actionable fixes for LCP, CLS, and INP in modern sites.',
      seoKeywords: ['web performance', 'core web vitals', 'INP'],
    },
    {
      title: 'Security Basics for Indie Developers',
      excerpt: 'The essential security habits that keep your app safe without slowing you down.',
      category: 'Security',
      tags: ['security', 'auth', 'best practices'],
      content: `# Security Basics for Indie Developers\n\nSecurity is not optional. The good news is you can cover most risks with a few habits.\n\n## The checklist\n\n- Use strong secrets and rotate them.\n- Validate input on server and client.\n- Keep dependencies updated.\n- Store passwords with strong hashing.\n\n## Bonus: observe\n\nAdd basic logging and alerting so you can respond quickly when something goes wrong.\n`,
      seoTitle: 'Security Basics for Indie Developers',
      seoDescription: 'A simple, practical security checklist for solo builders.',
      seoKeywords: ['app security', 'indie dev', 'best practices'],
    },
    {
      title: 'Database Indexing: The 80/20 Guide',
      excerpt: 'Indexes are the fastest path to better query performance. Here is how to apply them wisely.',
      category: 'Databases',
      tags: ['database', 'indexing', 'performance'],
      content: `# Database Indexing: The 80/20 Guide\n\nIndexes speed up reads by trading disk space for lookup time. Add them where queries filter, sort, or join.\n\n## Start with slow queries\n\nMeasure first, then add an index. Review execution plans if available.\n\n## Avoid over-indexing\n\nEvery index slows writes. Add only what you need.\n`,
      seoTitle: 'Database Indexing: The 80/20 Guide',
      seoDescription: 'Learn the practical basics of indexing to speed up your app.',
      seoKeywords: ['database indexing', 'query performance'],
    },
    {
      title: 'A Calm Productivity Stack for Creators',
      excerpt: 'A simple system that helps you create consistently without burnout.',
      category: 'Productivity',
      tags: ['productivity', 'creator', 'systems'],
      content: `# A Calm Productivity Stack for Creators\n\nConsistency beats intensity. Build a system that helps you show up daily without draining your energy.\n\n## The stack\n\n- One capture tool\n- One task list\n- One calendar\n\n## Weekly review\n\nClear inboxes, pick priorities, and block time. The rest is just execution.\n`,
      seoTitle: 'A Calm Productivity Stack for Creators',
      seoDescription: 'A minimal productivity workflow for creators who ship.',
      seoKeywords: ['productivity stack', 'creator workflow'],
    },
    {
      title: 'TypeScript Patterns You Will Use Every Day',
      excerpt: 'Practical patterns for safer, cleaner TypeScript code.',
      category: 'TypeScript',
      tags: ['typescript', 'patterns', 'coding'],
      content: `# TypeScript Patterns You Will Use Every Day\n\nTypeScript shines when you model intent. Start with types that represent your domain.\n\n## Useful patterns\n\n- Discriminated unions\n- Readonly arrays for safety\n- Utility types for transformations\n\nGood types make refactors safer and faster.\n`,
      seoTitle: 'TypeScript Patterns You Will Use Every Day',
      seoDescription: 'Everyday TypeScript patterns for cleaner code.',
      seoKeywords: ['TypeScript patterns', 'typing'],
    },
    {
      title: 'A Practical Guide to Cloud Costs',
      excerpt: 'Control cloud spend with a few operational habits and visibility.',
      category: 'Cloud',
      tags: ['cloud', 'costs', 'devops'],
      content: `# A Practical Guide to Cloud Costs\n\nCloud bills grow quietly. Treat cost like a feature, not an afterthought.\n\n## Quick wins\n\n- Tag resources by project.\n- Remove idle environments.\n- Set budgets and alerts.\n\nVisibility reduces waste and surprises.\n`,
      seoTitle: 'A Practical Guide to Cloud Costs',
      seoDescription: 'Simple steps to monitor and reduce cloud spend.',
      seoKeywords: ['cloud costs', 'cloud budgeting'],
    },
    {
      title: 'Testing for Busy Teams: A Focused Strategy',
      excerpt: 'You do not need 100% coverage. Test the right things first.',
      category: 'Testing',
      tags: ['testing', 'quality', 'engineering'],
      content: `# Testing for Busy Teams\n\nStart with what breaks most: critical flows and data integrity.\n\n## Priorities\n\n- Unit tests for pure logic\n- Integration tests for core flows\n- End-to-end tests for checkout or sign-up\n\nSmall, reliable tests keep you moving fast.\n`,
      seoTitle: 'Testing for Busy Teams',
      seoDescription: 'A focused testing strategy for small teams.',
      seoKeywords: ['testing strategy', 'quality engineering'],
    },
    {
      title: 'Accessibility Wins That Take Under an Hour',
      excerpt: 'A short list of fixes that dramatically improve accessibility.',
      category: 'Accessibility',
      tags: ['accessibility', 'a11y', 'inclusive design'],
      content: `# Accessibility Wins That Take Under an Hour\n\nSmall changes can make your site usable for more people.\n\n## Quick improvements\n\n- Add labels to form fields\n- Ensure color contrast meets WCAG\n- Provide keyboard focus styles\n\nThese are fast to implement and high impact.\n`,
      seoTitle: 'Accessibility Wins That Take Under an Hour',
      seoDescription: 'Quick accessibility fixes with big impact.',
      seoKeywords: ['accessibility', 'a11y', 'WCAG'],
    },
  ];

  for (const post of blogPosts) {
    const slug = generateSlug(post.title);
    const readingTime = calculateReadingTime(post.content);

    await Post.updateOne(
      { slug },
      {
        $set: {
          title: post.title,
          slug,
          content: post.content,
          excerpt: post.excerpt,
          category: post.category,
          tags: post.tags,
          published: true,
          publishedAt: new Date(),
          author: adminUser._id,
          views: 0,
          readingTime,
          seoTitle: post.seoTitle,
          seoDescription: post.seoDescription,
          seoKeywords: post.seoKeywords,
        },
      },
      { upsert: true }
    );

    console.log('✅ Blog post upserted:', post.title);
  }
  
  // Add more seed data if needed (categories, tags, etc.)
  
  console.log('Seeding complete!');
  process.exit(0);
}

seedProduction().catch((error) => {
  console.error('Seed error:', error);
  process.exit(1);
});
