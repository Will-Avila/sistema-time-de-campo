import { jwtVerify, SignJWT } from 'jose';

// Fail fast if JWT_SECRET is not set in production
const secret = process.env.JWT_SECRET;
if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production.');
}

export const JWT_SECRET = new TextEncoder().encode(
    secret || 'default-secret-change-me-in-prod'
);

// Re-export JWT utilities for convenience
export { jwtVerify, SignJWT };
