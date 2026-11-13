# GitHub publication — Monjes Rumberos

<https://github.com/AngelDanielC0des/monjes-rumberos>

## Publication status

- Repository: `AngelDanielC0des/monjes-rumberos`
- Default branch: `main`
- Status: populated; the repository is no longer empty.
- Source, documentation, tests and runtime assets are committed directly to GitHub.
- The one-time import workflow and transfer chunks have been removed after successful publication.
- CI workflow: `.github/workflows/ci.yml` (Ubuntu 24.04, Node 22, Python 3.12, Playwright Chromium).

## Included in the repository

- Semantic HTML, CSS and native JavaScript modules.
- Full-bleed responsive layout correction in `layout-fix.css`.
- Eight section backgrounds, desktop and mobile variants.
- Transparent optimized WebP characters, animated WebP loops, static posters and GIF fallbacks.
- Scroll-driven ambient lighting and the accessible performer settings panel.
- Vercel configuration and reproducible static build script.
- Documentation, QA reports, Chromium screenshots, smoke tests and responsive browser tests.
- npm lockfile and Python Playwright test requirements.

## Asset scope

The optimized transparent WebP character assets and all assets required to build the landing are included. The two original high-resolution working PNG masters under the local `assets/source/` directory are not included in this GitHub snapshot; they are not runtime assets and have not been replaced by lower-quality conversions. The omission is documented rather than hidden.

## Verification

The import workflow completed successfully after:
- Restoring all production image assets from the live Vercel deployment.
- Running JavaScript syntax checks and smoke tests.
- Running Chromium responsive regression at 2048, 1440, 1024, 768, 390 and 320 px.
- Building the static output and checking all expected runtime files.

The standalone CI workflow was then added directly to the repository and has passed once on the published source. Subsequent commits also trigger the same CI workflow.

## Production

- Website: https://monjes-rumberos.vercel.app/
- Build command: `npm run build`
- Output directory: `public`

No local bundle download or manual push is required. Clone the GitHub repository directly:

```powershell
git clone https://github.com/AngelDanielC0des/monjes-rumberos.git
cd monjes-rumberos
npm ci
python -m pip install -r requirements-dev.txt
python -m playwright install chromium
npm run check
npm test
npm run build
```
