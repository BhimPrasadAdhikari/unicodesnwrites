import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { LearnerAccessError, requireVerifiedSession } from '@/lib/auth/learner';
import { updateLearnerCertificate } from '@/lib/services/certificates';
import { isObjectId } from '@/lib/utils/object-id';

// The name printed on the certificate: empty means "use my account name". No control characters.
const displayName = z.string().trim().max(80).regex(/^[^\p{Cc}]*$/u).refine((value) => value === '' || value.length >= 2);
const schema = z.object({ displayName: displayName.optional(), hidden: z.boolean().optional() }).strict()
  .refine((value) => value.displayName !== undefined || value.hidden !== undefined);

type Context = { params: Promise<{ id: string }> };

/** The learner changes the name on their certificate or hides it. Only their own certificate. */
export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    const session = await requireVerifiedSession();
    const { id } = await params;
    if (!isObjectId(id)) return NextResponse.json({ error: 'Certificate not found.' }, { status: 404 });
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Use a name of 2 to 80 characters, or leave it empty to use your account name.' }, { status: 400 });
    const certificate = await updateLearnerCertificate(session.user.id, id, parsed.data);
    if (!certificate) return NextResponse.json({ error: 'Certificate not found.' }, { status: 404 });
    return NextResponse.json({ certificate, message: certificate.hidden ? 'Your certificate is hidden.' : 'Saved.' });
  } catch (error) {
    if (error instanceof LearnerAccessError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
    console.error('Certificate update failed:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json({ error: 'Could not save that change. Try again.' }, { status: 500 });
  }
}
