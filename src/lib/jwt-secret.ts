import { jwtVerify, SignJWT } from 'jose';

// Fail fast if JWT_SECRET is not set in production
const secret = process.env.JWT_SECRET;
if (!secret) {
    throw new Error('A variável de ambiente JWT_SECRET é obrigatória.');
}

export const JWT_SECRET = new TextEncoder().encode(secret);

// Re-export JWT utilities for convenience
export { jwtVerify, SignJWT };
