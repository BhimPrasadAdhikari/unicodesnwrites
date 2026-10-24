import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token && token.sessionValid !== false;
    const isAuthPage = req.nextUrl.pathname.startsWith('/login') || req.nextUrl.pathname.startsWith('/signup');
    const isDashboard = req.nextUrl.pathname.startsWith('/dashboard');

    if (isAuthPage) {
      if (isAuth) {
        return NextResponse.redirect(new URL(token?.role === 'admin' ? '/dashboard' : '/learn', req.url));
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
