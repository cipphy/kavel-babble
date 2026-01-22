import sharp from "sharp";
import { readdir, mkdir } from "fs/promises";
import { join, extname } from "path";
import { existsSync } from "fs";

/**
 * Generate thumbnails for art images
 * Usage: node tools/make-thumbs.ts ./media-src/art/example-post
 * 
 * This script will:
 * - Find all images in the input directory
 * - Create a thumbs/ subdirectory
 * - Generate optimized thumbnails (max 1000px on longest side)
 */

const MAX_THUMB_SIZE = 1000;
const QUALITY = 85;
const SUPPORTED_FORMATS = ['.jpg', '.jpeg', '.png', '.webp'];

async function generateThumbnails(inputDir: string) {
    if (!existsSync(inputDir)) {
        console.error(`Error: Directory "${inputDir}" does not exist`);
        process.exit(1);
    }

    const thumbsDir = join(inputDir, 'thumbs');

    // Create thumbs directory if it doesn't exist
    if (!existsSync(thumbsDir)) {
        await mkdir(thumbsDir, { recursive: true });
        console.log(`Created directory: ${thumbsDir}`);
    }

    // Get all image files
    const files = await readdir(inputDir);
    const imageFiles = files.filter(file => {
        const ext = extname(file).toLowerCase();
        return SUPPORTED_FORMATS.includes(ext);
    });

    if (imageFiles.length === 0) {
        console.log('Warning: No images found in directory');
        return;
    }

    console.log(`Found ${imageFiles.length} image(s) to process\n`);
    for (const file of imageFiles) {
        const inputPath = join(inputDir, file);
        const outputPath = join(thumbsDir, file);

        try {
            const image = sharp(inputPath);
            const metadata = await image.metadata();

            // Resize image - maintain aspect ratio, max dimension = MAX_THUMB_SIZE
            await image
                .resize(MAX_THUMB_SIZE, MAX_THUMB_SIZE, {
                    fit: 'inside',
                    withoutEnlargement: true,
                })
                .jpeg({ quality: QUALITY, progressive: true })
                .toFile(outputPath);

            const thumbMeta = await sharp(outputPath).metadata();

            console.log(`   ${file}`);
            console.log(`   Original: ${metadata.width}x${metadata.height}`);
            console.log(`   Thumbnail: ${thumbMeta.width}x${thumbMeta.height}`);
            console.log();
        } catch (error) {
            console.error(`Error processing ${file}:`, error);
        }
    }

    console.log('Done! Thumbnails generated in:', thumbsDir);
}

// Get directory from command line argument
const inputDir = process.argv[2];

if (!inputDir) {
    console.error('Usage: node tools/make-thumbs.ts <input-directory>');
    console.error('Example: node tools/make-thumbs.ts ./media-src/art/my-artwork');
    process.exit(1);
}

generateThumbnails(inputDir).catch(console.error);
