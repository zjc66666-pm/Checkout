/* BestShopio prototypes — shared Tailwind (Play CDN) config.
   Load right AFTER <script src="https://cdn.tailwindcss.com">.
   Single source of brand tokens for every prototype page (mirrors the
   bestvoy-admin web-antd palette). */
tailwind.config = {
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#0066e6', 50: '#e6f0ff', 100: '#cfe1ff', 500: '#0066e6', 600: '#0058c4', 700: '#004aa3' },
        ink: { DEFAULT: '#242833', body: '#474f5e', muted: '#62708d' },
        page: '#ffffff', panel: '#f7f8fb', hair: '#eaedf1', ctl: '#d7dbe7',
        ok: '#008051', okbg: '#e0f2ec', warn: '#ffc453', err: '#D33612',
      },
      fontFamily: { sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'] },
    },
  },
};
