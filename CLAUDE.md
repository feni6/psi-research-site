# psi-research-site

## Project

Astro static site with Tailwind CSS. No SSR — builds to plain static HTML.

## Tech Stack

- **Framework:** Astro 6 (static output)
- **Styling:** Tailwind CSS 4
- **Node:** >=22.12.0
- **Build:** `npm run build` (outputs to `dist/`)
- **Dev:** `npm run dev`

## Hosting & Deployment

- **Host:** Cloudflare Pages (free tier)
- **Domain:** thepsifiles.org (registered via Cloudflare Registrar, 2026-03-23)
- **URL:** https://thepsifiles.org (also accessible via www.thepsifiles.org)
- **Legacy URL:** https://psi-research-site.pages.dev (still works)
- **DNS:** Two CNAME records (@ and www) → psi-research-site.pages.dev, proxied via Cloudflare
- **Repo:** https://github.com/feni6/psi-research-site (public)
- **Auto-deploy:** GitHub Actions workflow at `.github/workflows/deploy.yml`
  - Triggers on every push to `main`
  - Runs `npm ci` → `npm run build` → `wrangler pages deploy dist`
  - Requires two GitHub secrets: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`

## Git Workflow

- Push to `main` to deploy: `git push origin main`
- The site will be live ~1 minute after push
- GitHub CLI (`gh`) is installed and authenticated

## Important Notes

- This is a **static site** — do NOT add the `@astrojs/cloudflare` adapter. The Cloudflare Workers runtime does not support `node:fs` and `node:path`, which several pages use at build time to read markdown files.
- Some pages (controversies, timeline, paths, replications) use `node:fs` and `node:path` to read `.md` files during static generation. This is fine for static builds but incompatible with Cloudflare Workers/SSR.
