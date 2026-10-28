import { NextRequest, NextResponse } from 'next/server';
import { adminCookieName, verifiedAdmin } from './lib/admin-server-auth';

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === '/admin/acesso') return NextResponse.next();
  const token = request.cookies.get(adminCookieName)?.value;
  if (await verifiedAdmin(token)) return NextResponse.next();
  const login = new URL('/admin/acesso', request.url);
  login.searchParams.set('next', request.nextUrl.pathname);
  const response = NextResponse.redirect(login);
  response.cookies.set(adminCookieName, '', { path: '/admin', maxAge: 0, httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

export const config = { matcher: ['/admin/:path*'] };
