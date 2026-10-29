import nodemailer from 'nodemailer9';
import { businessConfig } from '@/lib/config/business';
import { render } from '@react-email/render';
import { IPurchase } from '@/lib/models/Purchase';
import { IProduct } from '@/lib/models/Product';
import { ISubscriber } from '@/lib/models/Subscriber';
import { INewsletter } from '@/lib/models/Newsletter';
import { getPurchaseConfirmationHtml } from '@/lib/email-templates/purchase-confirmation';
import ConfirmationEmail from '@/lib/email-templates/confirmation';
import WelcomeEmail from '@/lib/email-templates/welcome';
import NewsletterEmail from '@/lib/email-templates/newsletter';
import UnsubscribeConfirmationEmail from '@/lib/email-templates/unsubscribe-confirm';
import welcomeSeriesTemplate from '@/lib/email-templates/welcome-series';
import { generateUnsubscribeToken } from '@/lib/utils/email-tokens';
import { addTracking } from '@/lib/services/newsletter-tracking';

function boundedEnvInt(value: string | undefined, fallback: number, maximum: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
}

/** Messages per second for newsletter batches. SES allows 14/s on this account; keep headroom. */
export const EMAIL_SEND_RATE = boundedEnvInt(process.env.EMAIL_SEND_RATE, 10, 50);
export const EMAIL_MAX_CONNECTIONS = boundedEnvInt(process.env.EMAIL_MAX_CONNECTIONS, 8, 20);

const transporter = nodemailer.createTransport({
  pool: true, // reuse SMTP connections across a newsletter batch
  maxConnections: EMAIL_MAX_CONNECTIONS,
  // Newsletter delivery paces sends itself: nodemailer's fixed-window limiter lets
  // two windows' worth through back to back, which SES counts as one burst.
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: false, // true for 465, false for other ports
  // Fail fast instead of hanging a serverless request on a slow SMTP server
  // (nodemailer's defaults are 2 minutes to connect and 10 minutes idle).
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 15_000,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export const sendEmail = async ({
  to,
  subject,
  html,
  text,
  headers,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  headers?: Record<string, string>;
}) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('EMAIL_NOT_CONFIGURED');
    }
    console.warn('Email credentials missing, skipping email send in non-production');
    return { skipped: true };
  }

  // Default to the authenticated mailbox. A From on another domain fails DMARC
  // alignment (and lands in spam) unless that domain authorizes Gmail via SPF/DKIM;
  // only set EMAIL_FROM to an address verified as a Gmail "Send mail as" alias.
  const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  const fromName = process.env.EMAIL_FROM_NAME || 'Unicode & Writes';
  const from = `"${fromName}" <${fromAddress}>`;

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    html,
    text,
    headers,
  });

  console.log('Message sent: %s', info.messageId);
  return info;
};

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
}[character] || character));

export const sendAccountVerificationEmail = async (input: { email: string; name: string; token: string; returnTo?: string }) => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const verificationUrl = `${appUrl.replace(/\/$/, '')}/verify-email?token=${encodeURIComponent(input.token)}${input.returnTo ? `&from=${encodeURIComponent(input.returnTo)}` : ''}`;
  const safeName = escapeHtml(input.name);
  const safeUrl = escapeHtml(verificationUrl);

  return sendEmail({
    to: input.email,
    subject: 'Verify your unicodesnwrites learning account',
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px;color:#171717"><p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#666">unicodesnwrites learning</p><h1 style="font-size:28px">Verify your email</h1><p>Hi ${safeName}, confirm this address before enrolling in courses.</p><p style="margin:28px 0"><a href="${safeUrl}" style="background:#171717;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:600">Review and verify email</a></p><p style="font-size:13px;color:#666">This single-use link expires in 30 minutes. The page asks you to confirm before it changes your account.</p></div>`,
    text: `Hi ${input.name}, verify your email to enroll in courses: ${verificationUrl}. This single-use link expires in 30 minutes.`,
  });
};

export const sendPasswordResetEmail = async (input: { email: string; name: string; token: string }) => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const resetUrl = `${appUrl.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(input.token)}`;
  const safeName = escapeHtml(input.name);
  const safeUrl = escapeHtml(resetUrl);

  return sendEmail({
    to: input.email,
    subject: 'Reset your unicodesnwrites password',
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px;color:#171717"><p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#666">unicodesnwrites learning</p><h1 style="font-size:28px">Reset your password</h1><p>Hi ${safeName}, use this single-use link to choose a new password.</p><p style="margin:28px 0"><a href="${safeUrl}" style="background:#171717;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:600">Reset password</a></p><p style="font-size:13px;color:#666">This link expires in 30 minutes. If you did not request it, you can ignore this email.</p></div>`,
    text: `Hi ${input.name}, reset your password: ${resetUrl}. This single-use link expires in 30 minutes.`,
  });
};

export const sendPurchaseConfirmation = async (
  purchase: IPurchase,
  product: IProduct
) => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  // A landing page with a button, not the file itself: mail scanners that open
  // links would otherwise use up the buyer's downloads.
  const downloadLink = `${appUrl}/products/download?token=${encodeURIComponent(purchase.downloadToken)}`;
  
  const html = getPurchaseConfirmationHtml({
    customerName: purchase.customerName || 'Customer',
    productName: product.title,
    orderId: purchase.purchaseId,
    amount: purchase.amount,
    currency: purchase.currency,
    date: purchase.purchasedAt,
    downloadLink: downloadLink,
    supportEmail: 'contact@unicodesnwrites.tech', // Should be in env or config
  });

  await sendEmail({
    to: purchase.customerEmail,
    subject: `Your purchase of ${product.title} is confirmed!`,
    html,
    text: `Thank you for purchasing ${product.title}. Your download link is: ${downloadLink}`,
  });
};

// Newsletter Functions

export interface WelcomeSeriesSection {
  heading: string;
  links: Array<{ title: string; url: string; description?: string }>;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const sendSubscriberConfirmation = async (subscriber: ISubscriber, token: string) => {
  const confirmUrl = `${APP_URL}/newsletter/confirm?token=${token}`;
  
  const html = await render(<ConfirmationEmail confirmUrl={confirmUrl} />);
  
  await sendEmail({
    to: subscriber.email,
    subject: 'Please confirm your subscription to unicodesnwrites',
    html,
    text: `Please confirm your subscription by clicking this link: ${confirmUrl}`,
  });
};

export const sendWelcomeEmail = async (subscriber: ISubscriber) => {
  const unsubscribeToken = generateUnsubscribeToken(subscriber.email);
  const unsubscribeUrl = `${APP_URL}/newsletter/unsubscribe?email=${encodeURIComponent(subscriber.email)}&token=${unsubscribeToken}`;
  
  const html = await render(<WelcomeEmail unsubscribeUrl={unsubscribeUrl} />);
  
  await sendEmail({
    to: subscriber.email,
    subject: 'Welcome to unicodesnwrites Newsletter!',
    html,
    text: `Welcome! We're glad to have you. You can unsubscribe anytime here: ${unsubscribeUrl}`,
  });
};

/**
 * A welcome-series follow-up (steps after the welcome email). Same footer and
 * unsubscribe handling as campaigns; throws when the send was skipped so the
 * series never records an email that didn't go out.
 */
export const sendWelcomeSeriesEmail = async (
  subscriber: Pick<ISubscriber, 'email'>,
  email: { step: number; subject: string; intro: string; sections: WelcomeSeriesSection[] },
) => {
  const unsubscribeQuery = `email=${encodeURIComponent(subscriber.email)}&token=${generateUnsubscribeToken(subscriber.email)}`;
  const unsubscribeUrl = `${APP_URL}/newsletter/unsubscribe?${unsubscribeQuery}`;
  const oneClickUnsubscribeUrl = `${APP_URL}/api/newsletter/unsubscribe?${unsubscribeQuery}`;

  const { html, text } = welcomeSeriesTemplate.renderWelcomeSeriesEmail({
    subject: email.subject,
    intro: email.intro,
    sections: email.sections,
    unsubscribeUrl,
    postalAddress: businessConfig.mailingAddress,
  });

  const result = await sendEmail({
    to: subscriber.email,
    subject: email.subject,
    html,
    text,
    headers: {
      'List-Unsubscribe': `<${oneClickUnsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      'Precedence': 'bulk',
      'X-Campaign-ID': `welcome-step-${email.step}`,
    },
  });
  if (result && 'skipped' in result) throw new Error('EMAIL_SKIPPED');
};

export const sendNewsletterToSubscriber = async (
  newsletter: INewsletter,
  subscriber: ISubscriber,
  /** The NewsletterSend id; when given, links and an open pixel are tracked per recipient */
  sendId?: string
) => {
  const unsubscribeQuery = `email=${encodeURIComponent(subscriber.email)}&token=${generateUnsubscribeToken(subscriber.email)}`;
  const unsubscribeUrl = `${APP_URL}/newsletter/unsubscribe?${unsubscribeQuery}`;
  // RFC 8058 one-click unsubscribe: mail clients POST directly to this endpoint.
  const oneClickUnsubscribeUrl = `${APP_URL}/api/newsletter/unsubscribe?${unsubscribeQuery}`;
  
  const rendered = await render(
    <NewsletterEmail 
      subject={newsletter.subject} 
      content={newsletter.content} 
      previewText={newsletter.previewText} 
      unsubscribeUrl={unsubscribeUrl} 
      postalAddress={businessConfig.mailingAddress}
    />
  );
  const html = sendId ? addTracking(rendered, sendId) : rendered;
  
  const headers = {
    'List-Unsubscribe': `<${oneClickUnsubscribeUrl}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    'Precedence': 'bulk',
    'X-Campaign-ID': newsletter._id.toString(),
  };
  
  const result = await sendEmail({
    to: subscriber.email,
    subject: newsletter.subject,
    html,
    text: `${newsletter.contentPlainText || newsletter.previewText || newsletter.subject}

Unsubscribe: ${unsubscribeUrl}`,
    headers,
  });
  // Without credentials outside production sendEmail skips silently; never record that as delivered.
  if (result && 'skipped' in result) throw new Error('EMAIL_SKIPPED');
};

export const sendUnsubscribeConfirmation = async (subscriber: ISubscriber) => {
  const resubscribeUrl = `${APP_URL}/newsletter`;
  
  const html = await render(<UnsubscribeConfirmationEmail resubscribeUrl={resubscribeUrl} />);
  
  await sendEmail({
    to: subscriber.email,
    subject: 'You have been unsubscribed',
    html,
    text: `You have been unsubscribed. If this was a mistake, you can resubscribe at: ${resubscribeUrl}`,
    headers: {
        'List-Unsubscribe': `<mailto:unsubscribe@unicodesnwrites.tech?subject=unsubscribe>`
    }
  });
};

export const sendTestNewsletter = async (
    newsletter: INewsletter,
    toEmail: string
) => {
    const html = await render(
        <NewsletterEmail
            subject={`[TEST] ${newsletter.subject}`}
            content={newsletter.content}
            previewText={newsletter.previewText}
            unsubscribeUrl={`${APP_URL}/newsletter`} // Real subscribers get a signed per-address link
            postalAddress={businessConfig.mailingAddress}
        />
    );

    const result = await sendEmail({
        to: toEmail,
        subject: `[TEST] ${newsletter.subject}`,
        html,
        text: newsletter.contentPlainText || newsletter.previewText || newsletter.subject,
    });
    return { skipped: Boolean(result && 'skipped' in result) };
};
