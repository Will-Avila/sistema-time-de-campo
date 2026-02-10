import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { JWT_SECRET } from '@/lib/jwt-secret';

export async function middleware(request: NextRequest) {
    const session = request.cookies.get('session')?.value;

    const isAuthRoute = request.nextUrl.pathname.startsWith('/login');
    const isProtectedRoute =
        request.nextUrl.pathname.startsWith('/os') ||
        request.nextUrl.pathname.startsWith('/admin');
    const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');

    // No session → redirect to login for protected routes
    if (isProtectedRoute && !session) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // Has session on login page → redirect based on role
    if (isAuthRoute && session) {
        try {
            const { payload } = await jwtVerify(session, JWT_SECRET);
            const redirectUrl = payload.isAdmin ? '/admin/dashboard' : '/os';
            return NextResponse.redirect(new URL(redirectUrl, request.url));
        } catch (error) {
            // Invalid token, allow access to login page
        }
    }

    // Verify token for protected routes
    if (session && isProtectedRoute) {
        try {
            const { payload } = await jwtVerify(session, JWT_SECRET);

            // Admin route protection: only admins can access /admin/*
            if (isAdminRoute && !payload.isAdmin) {
                return NextResponse.redirect(new URL('/os', request.url));
            }
        } catch (error) {
            // Token invalid/expired - clear it and redirect to login
            const response = NextResponse.redirect(new URL('/login', request.url));
            response.cookies.delete('session');
            return response;
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/os/:path*', '/admin/:path*', '/login'],
};
