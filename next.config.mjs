/** @type {import('next').NextConfig} */

// Force Brasília timezone on the server, regardless of where it's hosted
process.env.TZ = 'America/Sao_Paulo';

const nextConfig = {
    env: {
        TZ: 'America/Sao_Paulo',
    },
};

export default nextConfig;
