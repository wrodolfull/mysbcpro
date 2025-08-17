import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from './lib/supabase/server';

// Auth guard: redirect unauthenticated users from app routes to sign-in
export async function middleware(req: NextRequest) {
  const url = new URL(req.url);
  const isAuthRoute = url.pathname.startsWith('/auth') || url.pathname.includes('sign-in') || url.pathname.includes('sign-up');
  
  // Skip auth check for auth routes
  if (isAuthRoute) {
    return NextResponse.next();
  }
  
  try {
    const response = NextResponse.next();
    const supabase = createSupabaseServerClient(req, response);
    
    const { data: { user }, error } = await supabase.auth.getUser();
    
    console.log('Middleware auth check:', {
      path: url.pathname,
      hasUser: !!user,
      error: error?.message,
      cookies: req.cookies.getAll().map(c => c.name)
    });
    
    if (!user) {
      const redirectUrl = new URL('/sign-in', req.url);
      return NextResponse.redirect(redirectUrl);
    }
    
    return response;
  } catch (error) {
    console.error('Middleware error:', error);
    const redirectUrl = new URL('/sign-in', req.url);
    return NextResponse.redirect(redirectUrl);
  }
}

export const config = {
  matcher: [
    // protect everything except assets and auth
    '/((?!_next|favicon.ico|auth).*)'
  ]
};


