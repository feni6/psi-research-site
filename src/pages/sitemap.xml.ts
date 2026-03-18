// src/pages/sitemap.xml.ts
import catalog from '../data/catalog.json';

function generateAuthorId(name: string): string {
  return name.toLowerCase().replace(/[ ,.]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

export async function GET() {
  const baseUrl = 'https://psi-research-library.org';
  
  // Top-level pages
  const staticPages = [
    '',
    '/catalog',
    '/search',
    '/stats',
    '/about',
    '/method',
    '/glossary',
    '/network',
    '/trends',
    '/replications',
    '/wishlist',
    '/authors',
    '/journals'
  ];
  
  // Paper pages
  const paperPages = catalog.papers.map((p: any) => `/paper/${p.id}`);
  
  // Author pages - extract unique authors
  const authorSet = new Set<string>();
  catalog.papers.forEach((p: any) => {
    if (p.authors && Array.isArray(p.authors)) {
      p.authors.forEach((author: string) => authorSet.add(author));
    }
  });
  const authorPages = Array.from(authorSet).map(author => `/author/${generateAuthorId(author)}`);
  
  // Controversy pages (01-14)
  const controversyPages = Array.from({ length: 14 }, (_, i) => `/controversies/${String(i + 1).padStart(2, '0')}`);
  
  // Reading path pages (path_1 through path_6)
  const pathPages = Array.from({ length: 6 }, (_, i) => `/paths/path_${i + 1}`);
  
  // Timeline era pages (era_1 through era_6)
  const eraPages = Array.from({ length: 6 }, (_, i) => `/timeline/era_${i + 1}`);
  
  // Domain pages - extract unique psi_domains
  const domainSet = new Set<string>();
  catalog.papers.forEach((p: any) => {
    if (p.psi_domain) {
      domainSet.add(p.psi_domain);
    }
  });
  const domainPages = Array.from(domainSet).map(domain => `/domain/${domain}`);
  
  // Combine all pages
  const allPages = [
    ...staticPages,
    ...paperPages,
    ...authorPages,
    ...controversyPages,
    ...pathPages,
    ...eraPages,
    ...domainPages
  ];
  
  // Generate XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages.map(page => `  <url><loc>${baseUrl}${page}</loc></url>`).join('\n')}
</urlset>`;
  
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml' }
  });
}