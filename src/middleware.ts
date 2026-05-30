import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE, verifySessionToken } from '@/lib/admin-auth';

// Guards every /admin/* route except /admin/login. Runs on the Node runtime so
// it can reuse verifySessionToken (node:crypto) — one signing implementation,
// no WebCrypto duplicate. verifySessionToken takes the token STRING; cookie
// reads here use the synchronous req.cookies (not next/headers cookies()).
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Login must stay reachable without a cookie, else infinite redirect.
  if (pathname === '/admin/login') {
    return NextResponse.next();
  }

  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  if (verifySessionToken(token)) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL('/admin/login', req.url));
}

export const config = {
  matcher: ['/admin/:path*'],
  runtime: 'nodejs',
};
