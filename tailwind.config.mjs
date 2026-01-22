/** @type {import('tailwindcss').Config} */
export default {
    darkMode: "class",
    content: ["./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx,vue,svelte}"],
    theme: {
        extend: {},
    },
    plugins: [require("@tailwindcss/typography")],
};
