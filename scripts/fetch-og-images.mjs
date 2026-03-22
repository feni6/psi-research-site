#!/usr/bin/env node
/**
 * Fetch OpenGraph images for papers via their DOI URLs.
 * Resolves DOIs through doi.org, follows redirects to the publisher page,
 * and extracts the og:image meta tag.
 *
 * Usage: node scripts/fetch-og-images.mjs [--concurrency 5] [--delay 500]
 *
 * Saves results to src/data/paper-images.json incrementally.
 * Can be safely interrupted and resumed — skips already-fetched DOIs.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';

const CATALOG_PATH = 'src/data/catalog.json';
const OUTPUT_PATH = 'src/data/paper-images.json';
const CONCURRENCY = parseInt(process.argv.find((_, i, a) => a[i - 1] === '--concurrency') || '5');
const DELAY_MS = parseInt(process.argv.find((_, i, a) => a[i - 1] === '--delay') || '500');

// Load catalog
const catalog = JSON.parse(readFileSync(CATALOG_PATH, 'utf-8'));
const papersWithDoi = catalog.papers.filter(p => p.doi);

// Load existing results (for resume support)
let results = {};
if (existsSync(OUTPUT_PATH)) {
  results = JSON.parse(readFileSync(OUTPUT_PATH, 'utf-8'));
  console.log(`Loaded ${Object.keys(results).length} existing results from ${OUTPUT_PATH}`);
}

function save() {
  writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2));
}

async function fetchOgImage(doi) {
  const url = `https://doi.org/${doi}`;
  try {
    const resp = await fetch(url, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'PsiResearchLibrary/1.0 (academic research catalog; fetching paper thumbnails)',
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!resp.ok) {
      return { doi, status: resp.status, image: null, finalUrl: resp.url };
    }

    const html = await resp.text();
    const finalUrl = resp.url;

    // Extract og:image
    let image = null;
    const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    if (ogMatch) {
      image = ogMatch[1];
      // Resolve relative URLs
      if (image && !image.startsWith('http')) {
        const base = new URL(finalUrl);
        image = new URL(image, base.origin).href;
      }
    }

    // Also try twitter:image as fallback
    if (!image) {
      const twMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)
        || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
      if (twMatch) {
        image = twMatch[1];
        if (image && !image.startsWith('http')) {
          const base = new URL(finalUrl);
          image = new URL(image, base.origin).href;
        }
      }
    }

    return { doi, status: resp.status, image, finalUrl };
  } catch (err) {
    return { doi, status: 'error', image: null, error: err.message };
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function processQueue(papers) {
  const queue = papers.filter(p => !results[p.id]);
  console.log(`\nFetching og:image for ${queue.length} papers (${papers.length - queue.length} already cached)`);
  console.log(`Concurrency: ${CONCURRENCY}, Delay: ${DELAY_MS}ms\n`);

  let completed = 0;
  let found = 0;
  let failed = 0;

  // Process in batches
  for (let i = 0; i < queue.length; i += CONCURRENCY) {
    const batch = queue.slice(i, i + CONCURRENCY);
    const promises = batch.map(async (paper) => {
      const result = await fetchOgImage(paper.doi);
      results[paper.id] = {
        doi: paper.doi,
        image: result.image,
        publisherUrl: result.finalUrl || null,
        fetchedAt: new Date().toISOString(),
      };

      completed++;
      if (result.image) {
        found++;
        console.log(`  ✓ [${completed}/${queue.length}] ${paper.id}: ${result.image.substring(0, 80)}`);
      } else {
        failed++;
        console.log(`  ✗ [${completed}/${queue.length}] ${paper.id}: no image (${result.status})`);
      }
    });

    await Promise.all(promises);

    // Save after each batch (resume support)
    save();

    // Rate limit between batches
    if (i + CONCURRENCY < queue.length) {
      await sleep(DELAY_MS);
    }
  }

  console.log(`\nDone: ${found} images found, ${failed} without images, ${Object.keys(results).length} total cached`);
  save();
}

processQueue(papersWithDoi);
