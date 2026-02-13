import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

import { getSession } from '@/lib/auth';

export async function GET(
    request: NextRequest,
    { params }: { params: { folder: string; filename: string } }
) {
    // Auth security: Only logged in users can view OS photos
    const session = await getSession();
    if (!session) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const { folder, filename } = params;

    // Security: Prevent directory traversal (basic check)
    // In a real app, strict validation of 'folder' (protocol) to be alphanumeric is good.
    if (folder.includes('..') || filename.includes('..') || folder.includes('/') || filename.includes('/')) {
        return new NextResponse('Invalid path', { status: 400 });
    }

    const basePath = process.env.PHOTOS_PATH || 'C:\\Programas\\PROJETOS\\fotos';
    const filePath = path.join(basePath, folder, filename);

    if (!existsSync(filePath)) {
        return new NextResponse('File not found', { status: 404 });
    }

    try {
        const fileBuffer = await readFile(filePath);

        // Determine content type based on extension
        const ext = path.extname(filename).toLowerCase();
        let contentType = 'application/octet-stream';

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

        if (mimeMap[ext]) {
            contentType = mimeMap[ext];
        }

        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch (error) {
        console.error('Error serving file:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
