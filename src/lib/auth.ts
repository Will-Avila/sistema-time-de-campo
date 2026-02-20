'use server';

import { cookies } from 'next/headers';
import { JWT_SECRET, jwtVerify, SignJWT } from '@/lib/jwt-secret';

export interface Session {
    id: string;
    username: string;
    isAdmin: boolean;
    role: string;
}

/**
 * Retrieves the current user session from the JWT cookie.
 * Returns null if no session exists or the token is invalid.
 */
export async function getSession(): Promise<Session | null> {
    const token = cookies().get('session')?.value;
    if (!token) return null;

    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return {
            id: payload.sub as string,
            username: payload.username as string,
            isAdmin: !!payload.isAdmin || payload.role === 'ADMIN',
            role: (payload.role as string) || (payload.isAdmin ? 'ADMIN' : 'USER'),
        };
    } catch {
        return null;
    }
}

/**
 * Requires a valid session. Throws (returns error object) if not authenticated.
 */
export async function requireAuth(): Promise<Session> {
    const session = await getSession();
    if (!session) {
        throw new Error('Não autenticado.');
    }
    return session;
}

/**
 * Requires an admin session. Throws if not authenticated or not admin.
 */
export async function requireAdmin(): Promise<Session> {
    const session = await requireAuth();
    if (!session.isAdmin) {
        throw new Error('Acesso não autorizado.');
    }
    return session;
}

/**
 * Creates a signed JWT token for the given user data.
 */
export async function createToken(data: {
    id: string;
    username: string;
    isAdmin: boolean;
    role?: string;
}): Promise<string> {
    return new SignJWT({
        sub: data.id,
        username: data.username,
        isAdmin: data.isAdmin,
        role: data.role || (data.isAdmin ? 'ADMIN' : 'USER'),
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(JWT_SECRET);
}

/**
 * Sets the session cookie with the given token.
 */
export async function setSessionCookie(token: string) {
    cookies().set('session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' && process.env.SESSION_SECURE !== 'false',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24, // 24 hours
    });
}

/**
 * Clears the session cookie.
 */
export async function clearSessionCookie() {
    cookies().delete('session');
}


