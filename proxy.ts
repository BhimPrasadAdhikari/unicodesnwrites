import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import { safeInternalPath } from '@/lib/utils/safe-path';

export default withAuth(
  function proxy(req) {
    const token = req.nextauth.token;
    const isAuth = !!token && token.sessionValid !== false;
    const isAuthPage = req.nextUrl.pathname.startsWith('/login') || req.nextUrl.pathname.startsWith('/signup');
    const isDashboard = req.nextUrl.pathname.startsWith('/dashboard');

    if (isAuthPage) {
      // reauth=1 comes from a server page that found the session revoked. The cookie can still
      // claim it is valid, so sending the visitor back would loop; show the sign-in form instead.
      if (isAuth && req.nextUrl.searchParams.get('reauth') !== '1') {
        // Already signed in: go where the sign-in link was taking you.
        const home = token?.role === 'admin' ? '/dashboard' : '/learn';
        return NextResponse.redirect(new URL(safeInternalPath(req.nextUrl.searchParams.get('from'), home), req.url));
      }
      return null;
    }

    if (!isAuth && isDashboard) {
      let from = req.nextUrl.pathname;
      if (req.nextUrl.search) {
        from += req.nextUrl.search;
      }
      return NextResponse.redirect(
        new URL(`/login?from=${encodeURIComponent(from)}`, req.url)
      );
    }

    if (isAuth && isDashboard && token?.role !== 'admin') {
      return NextResponse.redirect(new URL('/', req.url));
    }
  },
  {
    callbacks: {
      async authorized() {
        return true;
      },
    },
  }
);

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/signup'],
};
