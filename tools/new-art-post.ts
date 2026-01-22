import { writeFile, readdir } from "fs/promises";
import { join, extname } from "path";
import { existsSync } from "fs";
import slugify from "slugify";
import { Command } from "commander";

/**
 * Create a new art post with proper frontmatter
 * Usage: node tools/new-art-post.ts --title "My Artwork" --tags digital,portrait --media-dir ./media-src/art/my-artwork
 */

interface ArtPostOptions {
    title: string;
    tags: string;
    mediaDir: string;
    date?: string;
    draft?: boolean;
}

const SUPPORTED_FORMATS = ['.jpg', '.jpeg', '.png', '.webp'];
const MEDIA_BASE_URL = 'https://media.kavelbabble.com/art';

async function createArtPost(options: ArtPostOptions) {
    const { title, tags, mediaDir, date, draft } = options;

    // Generate slug from title
    const slug = slugify(title, {
        lower: true,
        strict: true,
        remove: /[*+~.()'"!:@]/g,
    });

    // Parse tags
    const tagArray = tags.split(',').map(t => t.trim()).filter(Boolean);

    if (tagArray.length === 0) {
        console.error('Error: At least one tag is required');
        process.exit(1);
    }

    // Check if media directory exists
    if (!existsSync(mediaDir)) {
        console.error(`Error: Media directory "${mediaDir}" does not exist`);
        console.log('Tip: Create the directory and add your images first');
        process.exit(1);
    }

    // Get image files
    const files = await readdir(mediaDir);
    const imageFiles = files
        .filter(file => {
            const ext = extname(file).toLowerCase();
            return SUPPORTED_FORMATS.includes(ext);
        })
        .sort(); // Sort alphabetically (01.jpg, 02.jpg, etc.)

    if (imageFiles.length === 0) {
        console.error('Error: No images found in media directory');
        process.exit(1);
    }

    // Check if thumbs exist
    const thumbsDir = join(mediaDir, 'thumbs');
    if (!existsSync(thumbsDir)) {
        console.warn('Warning: thumbs/ directory not found');
        console.log('Tip: Run "node tools/make-thumbs.ts ' + mediaDir + '" first');
    }

    // Build images array
    const images = imageFiles.map(file => {
        return {
            src: `${MEDIA_BASE_URL}/${slug}/${file}`,
            thumbSrc: `${MEDIA_BASE_URL}/${slug}/thumbs/${file}`,
            alt: `${title} - Image ${imageFiles.indexOf(file) + 1}`,
            width: 2400, // You'll need to update these manually
            height: 3000,
        };
    });

    // Build frontmatter
    const postDate = date || new Date().toISOString().split('T')[0];
    const draftStatus = draft !== undefined ? draft : false;

    let content = '---\n';
    content += `title: "${title}"\n`;
    content += `date: "${postDate}"\n`;
    content += `tags: [${tagArray.map(t => `"${t}"`).join(', ')}]\n`;
    content += 'images:\n';

    for (const img of images) {
        content += `  - src: "${img.src}"\n`;
        content += `    thumbSrc: "${img.thumbSrc}"\n`;
        content += `    alt: "${img.alt}"\n`;
        content += `    width: ${img.width}\n`;
        content += `    height: ${img.height}\n`;
    }

    content += `draft: ${draftStatus}\n`;
    content += '---\n\n';
    content += `Add your description and notes about this artwork here.\n\n`;
    content += `## TODO\n`;
    content += `- [ ] Update alt text for each image\n`;
    content += `- [ ] Update width and height for each image\n`;
    content += `- [ ] Upload images to R2: wrangler r2 object put kavel-babble-media/art/${slug}/ --recursive --file ${mediaDir}\n`;
    content += `- [ ] Set draft: false when ready to publish\n`;

    // Write to file
    const outputPath = join(process.cwd(), 'src', 'content', 'art', `${slug}.md`);

    if (existsSync(outputPath)) {
        console.error(`Error: Post already exists at ${outputPath}`);
        process.exit(1);
    }

    await writeFile(outputPath, content, 'utf-8');

    console.log('Art post created successfully!\n');
    console.log(`File: src/content/art/${slug}.md`);
    console.log(`Slug: ${slug}`);
    console.log(`Images: ${images.length}`);
    console.log(`\nNext steps:`);
    console.log(`   1. Review and edit the post at: src/content/art/${slug}.md`);
    console.log(`   2. Update image dimensions and alt text`);
    console.log(`   3. Upload images to R2`);
    console.log(`   4. Set draft: false when ready to publish`);
}

const program = new Command();

program
    .name('new-art-post')
    .description('Create a new art post with proper frontmatter')
    .requiredOption('-t, --title <title>', 'Title of the artwork')
    .requiredOption('--tags <tags>', 'Comma-separated list of tags (e.g., "digital,portrait")')
    .requiredOption('-m, --media-dir <dir>', 'Path to directory containing images')
    .option('-d, --date <date>', 'Publication date (YYYY-MM-DD)', new Date().toISOString().split('T')[0])
    .option('--draft', 'Create as draft (default: false)', false);

// Filter out -- from argv if present (pnpm passes it)
const argv = process.argv.filter(arg => arg !== '--');
program.parse(argv);

const options = program.opts();
createArtPost(options as ArtPostOptions).catch(console.error);
