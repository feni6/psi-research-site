/**
 * Auto-links glossary terms in plain text or HTML strings.
 * Skips terms that are already inside an <a> tag.
 */

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
];

// Inline statistical notation (z=8.31, p<0.05, d=0.2, N=100, BF=13669)
const STAT_NOTATION: { pattern: RegExp; href: string }[] = [
  // z-scores: z = 8.31, Z=3.97, z=-4.9
  { pattern: /(?<![a-zA-Z])([zZ])\s*([=<>≤≥])\s*([−\-]?\s*[\d.]+(?:\s*[×x]\s*10[⁻−\-]?\d+)?)/g, href: '/glossary#z-score' },
  // p-values: p = 0.05, p<.001, P < 0.001
  { pattern: /(?<![a-zA-Z])([pP])\s*([=<>≤≥])\s*([−\-]?\s*[\d.]+(?:\s*[×x]\s*10[⁻−\-]?\d+)?)/g, href: '/glossary#p-value' },
  // Sigma notation: 6-sigma, 6σ, 11σ
  { pattern: /\b(\d+)\s*[-–]?\s*(?:sigma|σ)/gi, href: '/glossary#standard-deviation' },
  // Cohen's d: d = 0.21, d=0.1-0.3, d ≈ 0.2
  { pattern: /(?<![a-zA-Z])(d)\s*([=≈])\s*([\d.]+(?:\s*[-–]\s*[\d.]+)?)/g, href: '/glossary#cohen-s-d' },
  // Sample size: N=100, n=45, N = 1,050
  { pattern: /(?<![a-zA-Z])([nN])\s*([=<>≤≥])\s*([\d,]+)/g, href: '/glossary#sample-size' },
  // Bayes factor: BF=13669, BF₁₀=60.5, BF10 = 16.6, BF01 = 0.63
  { pattern: /\b(BF[₁₀₀10]*)\s*([=<>≤≥])\s*([\d.,]+)/g, href: '/glossary#bayes-factor' },
];

function isInsideATag(text: string, offset: number): boolean {
  const before = text.slice(0, offset);
  const lastOpenA = before.lastIndexOf('<a ');
  const lastCloseA = before.lastIndexOf('</a>');
  return lastOpenA > lastCloseA;
}

function isInsideHtmlTag(text: string, offset: number): boolean {
  // Check if we're inside an HTML tag attribute (e.g., <a href="...">)
  const before = text.slice(0, offset);
  const lastOpenAngle = before.lastIndexOf('<');
  const lastCloseAngle = before.lastIndexOf('>');
  return lastOpenAngle > lastCloseAngle;
}

export function linkGlossaryTerms(text: string): string {
  if (!text) return '';

  let result = text;

  // First pass: word/phrase terms
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

  // Second pass: inline statistical notation
  for (const { pattern, href } of STAT_NOTATION) {
    pattern.lastIndex = 0;

    result = result.replace(pattern, (match, ...args) => {
      const offset = args[args.length - 2] as number;
      if (isInsideATag(result, offset) || isInsideHtmlTag(result, offset)) {
        return match;
      }
      return `<a href="${href}" class="${LINK_CLASS}">${match}</a>`;
    });
  }

  return result;
}
