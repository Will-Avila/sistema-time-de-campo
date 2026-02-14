import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

import { getSession } from '@/lib/auth';
import { PHOTOS_BASE_PATH } from '@/lib/constants';
import { logger } from '@/lib/logger';

export async function GET(
    request: NextRequest,
    { params }: { params: { folder: string; filename: string } }
) {
    const session = await getSession();
    if (!session) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const { folder, filename } = params;

    // Security: Resolve and validate that the final path is within the allowed directory
    const resolvedBase = path.resolve(PHOTOS_BASE_PATH);
    const resolvedFile = path.resolve(PHOTOS_BASE_PATH, folder, filename);

    if (!resolvedFile.startsWith(resolvedBase + path.sep)) {
        return new NextResponse('Invalid path', { status: 400 });
    }

    if (!existsSync(resolvedFile)) {
        return new NextResponse('File not found', { status: 404 });
    }

    try {
        const fileBuffer = await readFile(resolvedFile);

        const ext = path.extname(filename).toLowerCase();
        const mimeMap: Record<string, string> = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.webp': 'image/webp',
            '.pdf': 'application/pdf',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.xls': 'application/vnd.ms-excel',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.doc': 'application/msword',
            '.txt': 'text/plain',
            '.csv': 'text/csv',
            '.zip': 'application/zip'
        };

        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': mimeMap[ext] || 'application/octet-stream',
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch (error) {
        logger.error('Error serving file', { error: String(error) });
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
