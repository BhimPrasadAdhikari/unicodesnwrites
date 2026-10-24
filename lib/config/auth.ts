import { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { connectDB } from '@/lib/db/connection';
import { User } from '@/lib/models/User';
import bcrypt from 'bcryptjs';
import { consumeRateLimit, normalizeEmail } from '@/lib/auth/security';

const dummyPasswordHash = bcrypt.hash('timing-equalization-only', 12);

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password || new TextEncoder().encode(credentials.password).length > 72) {
          return null;
        }

        const email = normalizeEmail(credentials.email);
        const forwarded = request.headers?.['x-forwarded-for'];
        const clientAddress = (Array.isArray(forwarded) ? forwarded[0] : forwarded || 'unknown').split(',')[0].trim();
        const [emailLimit, ipLimit] = await Promise.all([
          consumeRateLimit({ scope: 'signin-email', identifier: email, limit: 10, windowSeconds: 15 * 60 }),
          consumeRateLimit({ scope: 'signin-ip', identifier: clientAddress, limit: 40, windowSeconds: 15 * 60 }),
        ]);
        if (!emailLimit.allowed || !ipLimit.allowed) return null;

        await connectDB();
        const user = await User.findOne({ email });

        if (!user) {
          await bcrypt.compare(credentials.password, await dummyPasswordHash);
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (!isValid || (!user.emailVerified && user.role !== 'admin')) {
          return null;
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          emailVerified: Boolean(user.emailVerified || user.role === 'admin'),
          tokenVersion: user.tokenVersion,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60,
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role || 'learner';
        token.id = user.id;
        token.emailVerified = Boolean(user.emailVerified);
        token.tokenVersion = user.tokenVersion || 0;
        token.sessionValid = true;
        return token;
      }

      if (!token.id) return token;
      try {
        await connectDB();
        const currentUser = await User.findById(token.id).select('role emailVerified tokenVersion').lean();
        const emailVerified = Boolean(currentUser?.emailVerified || currentUser?.role === 'admin');
        const currentTokenVersion = Number(currentUser?.tokenVersion ?? 0);
        const sessionTokenVersion = Number(token.tokenVersion ?? 0);
        token.sessionValid = Boolean(
          currentUser &&
          currentUser.role === token.role &&
          currentTokenVersion === sessionTokenVersion &&
          emailVerified
        );
        token.emailVerified = emailVerified;
        token.tokenVersion = currentTokenVersion;
      } catch {
        token.sessionValid = false;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role;
        session.user.id = token.id as string;
        session.user.emailVerified = Boolean(token.emailVerified);
        session.user.tokenVersion = Number(token.tokenVersion || 0);
        session.user.sessionValid = token.sessionValid !== false;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
