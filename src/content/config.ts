import { defineCollection, z } from "astro:content";

const imageSchema = z.object({
    src: z.string().url(),
    thumbSrc: z.string().url(),
    alt: z.string().min(1, "Alt text is required for accessibility."),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
});

const art = defineCollection({
    type: "content",
    schema: z.object({
        title: z.string().min(1),
        date: z.coerce.date(),
        tags: z.array(z.string().min(1)).default([]),
        images: z.array(imageSchema).min(1),
        draft: z.boolean().default(false),
    }),
});

const blog = defineCollection({
    type: "content",
    schema: z.object({
        title: z.string().min(1),
        date: z.coerce.date(),
        description: z.string().min(1),
        draft: z.boolean().default(false),
    }),
});

export const collections = { art, blog };
