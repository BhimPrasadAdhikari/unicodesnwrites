import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import { ContactSubmission } from '@/lib/models/ContactSubmission';
import { sendEmail } from '@/lib/services/email';
import { trackContactSubmit } from '@/lib/services/event-tracking';
import { contactSchema } from '@/lib/utils/validation';
import { escapeHtml } from '@/lib/utils/sanitize';
import { consumeRateLimit, getClientAddress, normalizeEmail } from '@/lib/auth/security';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Validation
    const validation = contactSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { name, email, subject, message } = validation.data;

    const [ipLimit, emailLimit] = await Promise.all([
      consumeRateLimit({ scope: 'contact-ip', identifier: getClientAddress(req), limit: 6, windowSeconds: 60 * 60 }),
      consumeRateLimit({ scope: 'contact-email', identifier: normalizeEmail(email), limit: 3, windowSeconds: 60 * 60 }),
    ]);
    if (!ipLimit.allowed || !emailLimit.allowed) {
      return NextResponse.json({ error: 'Too many messages. Please try again later.' }, { status: 429 });
    }

    // 2. Database Connection
    await connectDB();

    // 3. Create Submission
    const submission = await ContactSubmission.create({
      name,
      email,
      subject,
      message,
      submittedAt: new Date(),
    });

    // Track server-side contact submission event
    await trackContactSubmit(subject || 'general-inquiry', email);

    // 4. Send Notification Email to Admin
    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_FROM;
    if (adminEmail) {
      const subjectText = subject || 'New contact form submission';
      const safeName = escapeHtml(name);
      const safeEmail = escapeHtml(email);
      const safeSubject = escapeHtml(subjectText);
      const safeMessage = escapeHtml(message);

      const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${safeName}</p>
          <p><strong>Email:</strong> ${safeEmail}</p>
          <p><strong>Subject:</strong> ${safeSubject}</p>
          <p><strong>Message:</strong></p>
          <div style="white-space: pre-wrap; padding: 12px; border: 1px solid #e5e7eb; border-radius: 6px;">${safeMessage}</div>
          <p style="margin-top: 16px; color: #6b7280; font-size: 12px;">Submitted at ${new Date().toLocaleString()}</p>
        </div>
      `;

      await sendEmail({
        to: adminEmail,
        subject: `Contact: ${subjectText}`,
        html,
        text: `New contact form submission\n\nName: ${name}\nEmail: ${email}\nSubject: ${subjectText || 'N/A'}\n\nMessage:\n${message}`,
        headers: {
          'Reply-To': email,
        },
      });
    }

    return NextResponse.json(
      { message: 'Message received successfully', id: submission._id },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    console.error('Contact API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
