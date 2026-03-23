/**
 * Auto-links glossary terms and paper citations in plain text or HTML strings.
 * Skips terms that are already inside an <a> tag.
 */

import catalog from '../data/catalog.json';

const LINK_CLASS = 'text-amber-400 underline decoration-amber-400/40 underline-offset-2 hover:text-amber-300 hover:decoration-amber-300/60';

// Word/phrase-based glossary terms
const GLOSSARY_TERMS: { pattern: RegExp; href: string }[] = [
  { pattern: /\bstandard deviations?\b/gi, href: '/glossary#standard-deviation' },
  { pattern: /\bCohen'?s d\b/g, href: '/glossary#cohen-s-d' },
  { pattern: /\beffect sizes?\b/gi, href: '/glossary#effect-size' },
  { pattern: /\bmeta-analy(?:sis|ses)\b/gi, href: '/glossary#meta-analysis' },
  { pattern: /\bBayes [Ff]actors?\b/g, href: '/glossary#bayes-factor' },
  { pattern: /\bp-values?\b/gi, href: '/glossary#p-value' },
  { pattern: /\bpre-registration\b/gi, href: '/glossary#pre-registration' },
  { pattern: /\bdouble-blind\b/gi, href: '/glossary#double-blind' },
  { pattern: /\bfile drawer problem\b/gi, href: '/glossary#file-drawer-problem' },
  { pattern: /\bPPV\b/g, href: '/glossary#ppv-positive-predictive-value' },
  { pattern: /\bganzfeld\b/gi, href: '/glossary#ganzfeld' },
  { pattern: /\bremote viewing\b/gi, href: '/glossary#remote-viewing' },
  { pattern: /\bpresentiment\b/gi, href: '/glossary#presentiment' },
  { pattern: /\bDMILS\b/g, href: '/glossary#dmils' },
  { pattern: /\bsample sizes?\b/gi, href: '/glossary#sample-size' },
  { pattern: /\bz-scores?\b/gi, href: '/glossary#z-score' },
  { pattern: /\bnull hypothesis\b/gi, href: '/glossary#null-hypothesis' },
  { pattern: /\blinear convergence\b/gi, href: '/glossary#linear-convergence' },
  { pattern: /\bconvergent estimates?\b/gi, href: '/glossary#linear-convergence' },
  { pattern: /\bES\b/g, href: '/glossary#effect-size' },
];

// Inline statistical notation (z=8.31, p<0.05, d=0.2, N=100, BF=13669)
const STAT_NOTATION: { pattern: RegExp; href: string }[] = [
  // z-scores: z = 8.31, Z=3.97, z=-4.9
  { pattern: /(?<![a-zA-Z])([zZ])\s*([=<>≤≥]|&lt;|&gt;)\s*([−\-]?\s*[\d.]+(?:\s*[×x]\s*10[⁻−\-]?\d+)?)/g, href: '/glossary#z-score' },
  // p-values: p = 0.05, p<.001, P < 0.001, p&lt;0.001
  { pattern: /(?<![a-zA-Z])([pP])\s*([=<>≤≥]|&lt;|&gt;)\s*([−\-]?\s*[\d.]+(?:\s*[×x]\s*10[⁻−\-]?\d+)?)/g, href: '/glossary#p-value' },
  // Sigma notation: 6-sigma, 6σ, 11σ
  { pattern: /\b(\d+)\s*[-–]?\s*(?:sigma|σ)/gi, href: '/glossary#standard-deviation' },
  // Cohen's d: d = 0.21, d=0.1-0.3, d ≈ 0.2
  { pattern: /(?<![a-zA-Z])(d)\s*([=≈])\s*([\d.]+(?:\s*[-–]\s*[\d.]+)?)/g, href: '/glossary#cohen-s-d' },
  // Sample size: N=100, n=45, N = 1,050
  { pattern: /(?<![a-zA-Z])([nN])\s*([=<>≤≥]|&lt;|&gt;)\s*([\d,]+)/g, href: '/glossary#sample-size' },
  // Bayes factor: BF=13669, BF₁₀=60.5, BF10 = 16.6, BF01 = 0.63
  { pattern: /\b(BF[₁₀₀10]*)\s*([=<>≤≥]|&lt;|&gt;)\s*([\d.,]+)/g, href: '/glossary#bayes-factor' },
  // Effect size notation: ES=0.209, ES≈0.35
  { pattern: /\b(ES)\s*([=≈<>≤≥]|&lt;|&gt;)\s*([\d.,]+)/g, href: '/glossary#effect-size' },
];

// --- Paper Citation Auto-Linker ---
// Build a lookup from "AuthorLastName (Year)" -> paper ID
// For duplicate author+year combos, first match wins

type CitationEntry = { pattern: RegExp; id: string };
let _citationCache: CitationEntry[] | null = null;

function buildCitationPatterns(): CitationEntry[] {
  if (_citationCache) return _citationCache;

  const seen = new Set<string>();
  const entries: CitationEntry[] = [];

  for (const paper of (catalog as any).papers) {
    if (!paper.authors || paper.authors.length === 0 || !paper.year) continue;

    const lastName = paper.authors[0].split(',')[0].trim();
    if (!lastName) continue;

    const key = `${lastName.toLowerCase()}_${paper.year}`;
    if (seen.has(key)) continue;
    seen.add(key);

    // Escape special regex characters in the author name
    const escaped = lastName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Match patterns like:
    //   AuthorName (Year), AuthorName's (Year), AuthorName et al. (Year)
    //   AuthorName & OtherName (Year), AuthorName, OtherName & Third (Year)
    const pattern = new RegExp(
      `${escaped}(?:'s|'s)?` +           // Author name, optionally possessive
      `(?:\\s+(?:&|and)\\s+\\w+)*` +      // Optional "& CoAuthor"
      `(?:,\\s+\\w+)*` +                  // Optional ", CoAuthor"
      `(?:\\s+et\\s+al\\.?)?` +           // Optional "et al."
      `\\s*\\(?\\s*\\(?(${paper.year})\\)?`, // (Year) with optional parens
      'g'
    );

    entries.push({ pattern, id: paper.id });
  }

  // Sort by author name length descending so longer names match first
  // (e.g., "Bem, Utts & Johnson" before "Bem")
  entries.sort((a, b) => b.pattern.source.length - a.pattern.source.length);

  _citationCache = entries;
  return entries;
}

// --- Shared helpers ---

function escapeHtml(str: string): string {
  return str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function isInsideATag(text: string, offset: number): boolean {
  const before = text.slice(0, offset);
  const lastOpenA = before.lastIndexOf('<a ');
  const lastCloseA = before.lastIndexOf('</a>');
  return lastOpenA > lastCloseA;
}

function isInsideHtmlTag(text: string, offset: number): boolean {
  const before = text.slice(0, offset);
  const lastOpenAngle = before.lastIndexOf('<');
  const lastCloseAngle = before.lastIndexOf('>');
  return lastOpenAngle > lastCloseAngle;
}

// --- Main export ---

export function linkGlossaryTerms(text: string): string {
  if (!text) return '';

  let result = text;

  // Pre-escape < and > in statistical contexts so they survive HTML rendering
  // e.g., "p<0.001" -> "p&lt;0.001", "n<100" -> "n&lt;100", "d < 0.08" -> "d &lt; 0.08"
  // Also escape standalone comparisons like "PPV < 50%", "< 0.05", "> 3"
  result = result.replace(/(?<![a-zA-Z<\/])([pPnNzZdD])\s*(<)\s*([\d.])/g, '$1 &lt; $3');
  result = result.replace(/(?<![a-zA-Z<\/])([pPnNzZdD])\s*(>)\s*([\d.])/g, '$1 &gt; $3');
  // Catch remaining bare < > between spaces/parens and digits (e.g., "PPV < 50%", "< 0.05")
  result = result.replace(/(\s|^)(<)\s*([\d.])/g, '$1&lt; $3');
  result = result.replace(/(\s|^)(>)\s*([\d.])/g, '$1&gt; $3');

  // First pass: word/phrase glossary terms
  for (const { pattern, href } of GLOSSARY_TERMS) {
    pattern.lastIndex = 0;

    result = result.replace(pattern, (match, ...args) => {
      const offset = args[args.length - 2] as number;
      if (isInsideATag(result, offset) || isInsideHtmlTag(result, offset)) {
        return match;
      }
      return `<a href="${href}" class="${LINK_CLASS}">${match}</a>`;
    });
  }

  // Second pass: inline statistical notation (escape < > in matched text for HTML safety)
  for (const { pattern, href } of STAT_NOTATION) {
    pattern.lastIndex = 0;

    result = result.replace(pattern, (match, ...args) => {
      const offset = args[args.length - 2] as number;
      if (isInsideATag(result, offset) || isInsideHtmlTag(result, offset)) {
        return match;
      }
      return `<a href="${href}" class="${LINK_CLASS}">${escapeHtml(match)}</a>`;
    });
  }

  // Third pass: paper citations — "Author (Year)" -> /paper/id
  const citations = buildCitationPatterns();
  for (const { pattern, id } of citations) {
    pattern.lastIndex = 0;

    result = result.replace(pattern, (match, ...args) => {
      const offset = args[args.length - 2] as number;
      if (isInsideATag(result, offset) || isInsideHtmlTag(result, offset)) {
        return match;
      }
      return `<a href="/paper/${id}" class="${LINK_CLASS}">${match}</a>`;
    });
  }

  return result;
}
