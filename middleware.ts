
import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { guestRegex, isDevelopmentEnvironment } from './lib/constants';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/snapshot')||pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: !isDevelopmentEnvironment,
  });

  

  // if (!token) {  // for guest
  //   const redirectUrl = encodeURIComponent(request.url);

  //   return NextResponse.redirect(
  //     new URL(`/api/auth/guest?redirectUrl=${redirectUrl}`, request.url),
  //   );
  // }


  if(!token && pathname !== '/' && pathname !== '/login' && pathname !== '/register' ){
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const isGuest = guestRegex.test(token?.email ?? '');


  if (token && !isGuest && ['/login', '/register'].includes(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|manifest.json).*)',
  ],
};