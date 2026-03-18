// src/pages/sitemap.xml.ts
import catalog from '../data/catalog.json';

export async function GET() {
  const baseUrl = 'https://psi-research-library.org'; // placeholder
  
  const staticPages = [
    '', '/catalog', '/controversies', '/paths', '/timeline',
    '/replications', '/stats', '/method', '/about', '/glossary', '/network'
  ];
  
  const paperPages = catalog.papers.map((p: any) => `/paper/${p.id}`);
  
  const allPages = [...staticPages, ...paperPages];
  
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages.map(page => `  <url><loc>${baseUrl}${page}</loc></url>`).join('\n')}
</urlset>`;
  
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml' }
  });
}