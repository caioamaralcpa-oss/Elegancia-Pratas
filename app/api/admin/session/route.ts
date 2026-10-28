import { NextRequest, NextResponse } from 'next/server';
import { adminCookieName, verifiedAdmin } from '@/lib/admin-server-auth';

const noStore = { 'Cache-Control': 'no-store' };

export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin)
    return NextResponse.json({ error: 'Origem inválida.' }, { status: 403, headers: noStore });
  const match = /^Bearer (\S+)$/.exec(request.headers.get('authorization') ?? '');
  if (!match || !await verifiedAdmin(match[1]))
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403, headers: noStore });
  const response = new NextResponse(null, { status: 204, headers: noStore });
  response.cookies.set(adminCookieName, match[1], {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax',
    path: '/admin', maxAge: 3600,
  });
  return response;
}

export async function DELETE(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin)
    return NextResponse.json({ error: 'Origem inválida.' }, { status: 403, headers: noStore });
  const response = new NextResponse(null, { status: 204, headers: noStore });
  response.cookies.set(adminCookieName, '', { path: '/admin', maxAge: 0, httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
  return response;
}
