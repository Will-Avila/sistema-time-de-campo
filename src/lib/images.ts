import sharp from 'sharp';

/**
 * Otimiza um buffer de imagem para web:
 * - Redimensiona para caber em 1920x1080 (1080p)
 * - Converte para JPEG
 * - Comprime com qualidade 80
 * - Remove metadados (EXIF, etc)
 */
export async function optimizeImage(buffer: Buffer): Promise<Buffer> {
    try {
        return await sharp(buffer)
            .resize({
                width: 1920,
                height: 1080,
                fit: 'inside',
                withoutEnlargement: true
            })
            .jpeg({
                quality: 80,
                progressive: true,
                mozjpeg: true
            })
            .toBuffer();
    } catch (error) {
        console.error('Erro ao otimizar imagem:', error);
        // Se falhar, retorna o buffer original para não bloquear o upload
        return buffer;
    }
}
