import path from 'path';

/**
 * Base directory for uploaded photos and attachments.
 * Reads from PHOTOS_PATH env var, falls back to 'uploads' in project root.
 */
export const PHOTOS_BASE_PATH = process.env.PHOTOS_PATH || path.join(process.cwd(), 'uploads');

/**
 * Resolves the upload directory for a given protocol/folder.
 */
export function getUploadDir(protocol: string): string {
    return path.join(PHOTOS_BASE_PATH, protocol);
}

/**
 * Resolves the absolute path for a photo stored via the API.
 * Used for file deletion operations.
 */
export function resolvePhotoPath(photoPath: string): string {
    if (photoPath.startsWith('/api/images/')) {
        const relativePath = photoPath.replace('/api/images/', '');
        return path.join(PHOTOS_BASE_PATH, relativePath);
    }
    return path.join(process.cwd(), 'public', photoPath);
}
