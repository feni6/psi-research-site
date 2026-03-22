#!/usr/bin/env node
/**
 * Automated site audit using Playwright.
 * Crawls every page, checks for common issues, and outputs a structured report.
 *
 * Usage: npx playwright test --config=playwright.config.mjs
 *    or: node scripts/audit-site.mjs
 */

import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const BASE = process.argv[2] || 'http://localhost:4321';
const SCREENSHOT_DIR = 'audit-screenshots';

// All known pages to audit
const PAGES = [
  '/',
  '/catalog',
  '/search',
  '/controversies',
  '/controversies/ganzfeld_telepathy',
  '/paths',
  '/paths/path_3_newcomer_survey',
  '/timeline',
  '/replications',
  '/stats',
  '/trends',
  '/glossary',
  '/network',
  '/authors',
  '/journals',
  '/wishlist',
  '/method',
  '/guide',
  '/compare',
  '/about',
  '/paper/bem_2011_feeling',
  '/domain/telepathy',
];

const issues = [];

function addIssue(severity, page, category, description, suggestion) {
  issues.push({ severity, page, category, description, suggestion });
}

async function auditPage(page, browser, url) {
  const path = new URL(url).pathname;
  console.log(`  Auditing ${path}...`);

  try {
    const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });

    // 1. Check HTTP status
    if (!response || response.status() >= 400) {
      addIssue('critical', path, 'HTTP', `Page returned status ${response?.status() || 'no response'}`, 'Fix the route or page file');
      return;
    }

    // 2. Check page title
    const title = await page.title();
    if (!title || title === 'undefined' || title.includes('undefined')) {
      addIssue('high', path, 'SEO', `Page title is "${title}"`, 'Set a proper title in the Layout component');
    }

    // 3. Check for console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // 4. Check meta description
    const metaDesc = await page.$eval('meta[name="description"]', el => el.content).catch(() => null);
    if (!metaDesc || metaDesc.length < 20) {
      addIssue('medium', path, 'SEO', `Meta description is missing or too short: "${metaDesc || ''}"`, 'Add a meaningful description prop to the Layout component');
    }

    // 5. Check heading hierarchy
    const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', els =>
      els.map(el => ({ tag: el.tagName, text: el.textContent.trim().substring(0, 60), visible: el.offsetParent !== null }))
    );
    const visibleHeadings = headings.filter(h => h.visible);
    const h1Count = visibleHeadings.filter(h => h.tag === 'H1').length;
    if (h1Count === 0) {
      addIssue('medium', path, 'Accessibility', 'No visible <h1> element found', 'Add a main heading');
    } else if (h1Count > 1) {
      addIssue('low', path, 'Accessibility', `Multiple <h1> elements (${h1Count}): ${visibleHeadings.filter(h => h.tag === 'H1').map(h => `"${h.text}"`).join(', ')}`, 'Use only one <h1> per page');
    }

    // Check for skipped heading levels
    const levels = visibleHeadings.map(h => parseInt(h.tag[1]));
    for (let i = 1; i < levels.length; i++) {
      if (levels[i] > levels[i - 1] + 1) {
        addIssue('low', path, 'Accessibility', `Heading level skipped: h${levels[i - 1]} → h${levels[i]}`, 'Maintain sequential heading hierarchy');
      }
    }

    // 6. Check images for alt text
    const imgsMissingAlt = await page.$$eval('img', imgs =>
      imgs.filter(img => !img.alt && !img.getAttribute('aria-hidden') && img.offsetParent !== null)
        .map(img => img.src?.substring(0, 80) || 'unknown')
    );
    if (imgsMissingAlt.length > 0) {
      addIssue('medium', path, 'Accessibility', `${imgsMissingAlt.length} image(s) missing alt text`, 'Add alt attributes to all visible images');
    }

    // 7. Check for broken internal links
    const links = await page.$$eval('a[href]', els =>
      els.map(a => a.href).filter(href => href.startsWith('http://localhost'))
    );
    const uniqueLinks = [...new Set(links)];
    for (const link of uniqueLinks.slice(0, 30)) { // limit to avoid hammering
      try {
        const linkPath = new URL(link).pathname;
        // Skip anchors and query params on same page
        if (linkPath === path) continue;
        const resp = await page.context().request.get(link);
        if (resp.status() >= 400) {
          addIssue('high', path, 'Broken Link', `Link to ${linkPath} returns ${resp.status()}`, `Fix or remove the link to ${linkPath}`);
        }
      } catch { /* network errors for external links */ }
    }

    // 8. Check for inputs without labels
    const unlabeledInputs = await page.$$eval('input, select, textarea', els =>
      els.filter(el => {
        if (el.type === 'hidden' || el.type === 'checkbox') return false;
        const hasLabel = el.labels?.length > 0;
        const hasAriaLabel = el.getAttribute('aria-label');
        const hasAriaLabelledBy = el.getAttribute('aria-labelledby');
        const hasTitle = el.title;
        return !hasLabel && !hasAriaLabel && !hasAriaLabelledBy && !hasTitle;
      }).map(el => `${el.tagName.toLowerCase()}#${el.id || '(no id)'}[type=${el.type || 'text'}]`)
    );
    if (unlabeledInputs.length > 0) {
      addIssue('medium', path, 'Accessibility', `Unlabeled form inputs: ${unlabeledInputs.join(', ')}`, 'Add aria-label or associated <label> to each input');
    }

    // 9. Check for empty links
    const emptyLinks = await page.$$eval('a[href]', els =>
      els.filter(a => {
        const text = a.textContent?.trim();
        const ariaLabel = a.getAttribute('aria-label');
        const hasImg = a.querySelector('img, svg');
        return !text && !ariaLabel && !hasImg;
      }).map(a => a.href.substring(0, 80))
    );
    if (emptyLinks.length > 0) {
      addIssue('medium', path, 'Accessibility', `${emptyLinks.length} empty link(s) with no text or aria-label`, 'Add text content or aria-label to links');
    }

    // 10. Check for raw technical strings visible to users
    const bodyText = await page.$eval('body', el => el.innerText);
    const techPatterns = [
      { pattern: /\bundefined\b/i, label: 'literal "undefined"' },
      { pattern: /\bnull\b(?!\s*(hypothesis|result))/i, label: 'literal "null"' },
      { pattern: /\bNaN\b/, label: 'literal "NaN"' },
      { pattern: /\[object Object\]/, label: '"[object Object]"' },
      { pattern: /\$\{[^}]+\}/, label: 'unresolved template expression' },
      { pattern: /TODO|FIXME|HACK|XXX/i, label: 'TODO/FIXME comment' },
    ];
    for (const { pattern, label } of techPatterns) {
      const match = bodyText.match(pattern);
      if (match) {
        const context = bodyText.substring(Math.max(0, match.index - 30), match.index + match[0].length + 30).replace(/\n/g, ' ');
        addIssue('high', path, 'Content', `Visible ${label} in page text: "...${context}..."`, 'Fix the template or data to not output raw technical strings');
      }
    }

    // 11. Check light mode contrast (switch theme and check)
    if (path === '/' || path === '/method') {
      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/${path.replace(/\//g, '_') || 'home'}_light.png`, fullPage: false });
      await page.evaluate(() => document.documentElement.removeAttribute('data-theme'));
    }

    // 12. Check mobile viewport
    if (path === '/' || path === '/catalog' || path === '/controversies') {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.waitForTimeout(300);

      // Check for horizontal overflow
      const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      if (hasOverflow) {
        addIssue('medium', path, 'Mobile', 'Page has horizontal overflow at 375px width', 'Fix overflow on mobile viewport');
      }

      await page.screenshot({ path: `${SCREENSHOT_DIR}/${path.replace(/\//g, '_') || 'home'}_mobile.png`, fullPage: false });
      await page.setViewportSize({ width: 1280, height: 720 });
    }

    // 13. Check for duplicate IDs
    const duplicateIds = await page.$$eval('[id]', els => {
      const counts = {};
      els.forEach(el => { counts[el.id] = (counts[el.id] || 0) + 1; });
      return Object.entries(counts).filter(([, c]) => c > 1).map(([id, c]) => `${id} (${c}x)`);
    });
    if (duplicateIds.length > 0) {
      addIssue('medium', path, 'HTML', `Duplicate IDs: ${duplicateIds.slice(0, 5).join(', ')}${duplicateIds.length > 5 ? ` (+${duplicateIds.length - 5} more)` : ''}`, 'Ensure all IDs are unique');
    }

    // 14. Check buttons without accessible names
    const unlabeledButtons = await page.$$eval('button', btns =>
      btns.filter(btn => {
        const text = btn.textContent?.trim();
        const ariaLabel = btn.getAttribute('aria-label');
        const title = btn.title;
        return !text && !ariaLabel && !title && btn.offsetParent !== null;
      }).length
    );
    if (unlabeledButtons > 0) {
      addIssue('medium', path, 'Accessibility', `${unlabeledButtons} button(s) without accessible name`, 'Add text content or aria-label to buttons');
    }

    // Collect any JS console errors that fired
    if (consoleErrors.length > 0) {
      addIssue('high', path, 'JavaScript', `Console errors: ${consoleErrors.slice(0, 3).join('; ')}`, 'Fix the JavaScript errors');
    }

  } catch (err) {
    addIssue('critical', path, 'Navigation', `Failed to load page: ${err.message}`, 'Check if the page exists and the dev server is running');
  }
}

async function main() {
  console.log(`\n🔍 Psi Research Library — Automated Site Audit`);
  console.log(`   Target: ${BASE}`);
  console.log(`   Pages: ${PAGES.length}\n`);

  const { mkdirSync } = await import('fs');
  mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  for (const path of PAGES) {
    await auditPage(page, browser, `${BASE}${path}`);
  }

  await browser.close();

  // Sort by severity
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  // Print report
  console.log(`\n${'='.repeat(80)}`);
  console.log(`AUDIT REPORT — ${issues.length} issues found`);
  console.log(`${'='.repeat(80)}\n`);

  const bySeverity = { critical: [], high: [], medium: [], low: [] };
  issues.forEach(i => bySeverity[i.severity].push(i));

  for (const [sev, items] of Object.entries(bySeverity)) {
    if (items.length === 0) continue;
    const icon = { critical: '🔴', high: '🟠', medium: '🟡', low: '🔵' }[sev];
    console.log(`${icon} ${sev.toUpperCase()} (${items.length})`);
    console.log('-'.repeat(40));
    items.forEach((item, i) => {
      console.log(`  ${i + 1}. [${item.category}] ${item.page}`);
      console.log(`     ${item.description}`);
      console.log(`     → ${item.suggestion}`);
      console.log();
    });
  }

  // Write JSON report
  const reportPath = 'audit-report.json';
  const { writeFileSync } = await import('fs');
  writeFileSync(reportPath, JSON.stringify({ timestamp: new Date().toISOString(), base: BASE, issues }, null, 2));
  console.log(`\nFull report saved to: ${reportPath}`);
  console.log(`Screenshots saved to: ${SCREENSHOT_DIR}/`);
}

main().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
