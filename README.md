# Receiptly

Receiptly is a private, browser-only receipt image maker built with React and Vite. It turns daily, weekly, monthly, or yearly highlights into a thermal-printer-style PNG. Editing, persistence, barcode generation, and image export all stay in the browser; there is no backend and no analytics.

## Local setup

Requirements: a current Node.js LTS release and npm.

```bash
npm install
npm run dev
```

Open the local URL Vite prints (normally `http://localhost:5173`). The source `index.html` uses Vite modules and is **not** intended to be opened directly with `file://`.

Other commands:

```bash
npm run build    # production output in dist/
npm run preview  # preview the production build locally
```

For a generic local static server, build first and serve `dist/`, for example with `npx serve dist`. Share and clipboard APIs generally require HTTPS or localhost; PNG download and editing do not.

## GitHub and Vercel

1. Create an empty GitHub repository.
2. Commit and push this project folder, including `package.json`, `package-lock.json`, `index.html`, `src/`, and this README.
3. Import the repository into Vercel.
4. Use these exact settings:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Root Directory:** the folder containing `package.json`

No `vercel.json` is needed. Receiptly is a single-page app with no routes beyond the root page.

## Netlify

Import the repository and use `npm run build` as the build command and `dist` as the publish directory. A build command is required for this Vite source project. Alternatively, upload the already-generated `dist/` folder directly as a manual deploy.

## Browser notes

- `html-to-image` is installed from npm; no runtime CDN script is used.
- Google Fonts are optional. If unavailable, Receiptly falls back to local monospace and system fonts.
- File sharing depends on the Web Share API and file-sharing support. Unsupported browsers download the PNG instead.
- Image copying requires `ClipboardItem`, clipboard write permission, and a secure context. Download remains available as the fallback.
- Older browsers receive best-effort editing and preview. Modern export, sharing, clipboard, `clip-path`, and animation features may not be available.
- Local form state is stored with guarded `localStorage` access. Generated images are never persisted.

## Manual testing checklist

- Check 320, 360, 380, 390, 768, 1024, and 1440 px widths; confirm no horizontal scrolling.
- Switch all four receipt types and check the date labels, especially around month and year boundaries.
- Clear a custom title, try each preset, and add/remove rows at the 1- and 10-row limits.
- Leave an item half-filled and confirm it stays editable but is omitted from the receipt.
- Try long titles, keys, values, messages, usernames, and footer text.
- Switch all receipt themes and test the editor in system light and dark modes.
- Toggle the barcode and order number; use Shuffle and Print again; enable reduced motion.
- Reload to verify persistence, then place invalid data under the `receiptly-state` localStorage key to verify recovery.
- Download a PNG and inspect its colors, edges, barcode, long content, and 3× resolution.
- Test Share and Copy image on supported HTTPS browsers and verify the explanatory fallbacks elsewhere.
- Check the browser console for errors during normal use.

## Privacy

Receipt content is not transmitted. The only external request is the optional Google Fonts stylesheet/font; the app remains usable if it fails.
