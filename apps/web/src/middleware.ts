import { NextResponse, type NextRequest } from 'next/server';

/** Cheap gate: no session cookie → login. The API still validates the session on every call. */
export function middleware(req: NextRequest) {
  if (!req.cookies.has('yo_session')) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/((?!login|api|_next|favicon.ico).*)'] };
