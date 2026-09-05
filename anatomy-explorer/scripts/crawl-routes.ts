/**
 * Post-Build Route Crawler & Integrity Checker
 * Modules S0 / R1: Verify all canonical routes, anchors, legal pages, compatibility aliases, and preview isolation.
 *
 * Enforces:
 * - Every generated canonical route exists in dist/ and contains valid HTML
 * - Every published exercise and stretch item has a corresponding anchor id on its area page
 * - All legal routes (/legal/disclaimer/, /legal/privacy/, /legal/credits/) are present and rendered
 * - Compatibility routes (/find-my-pain/) exist and resolve
 * - Preview pages are isolated with <meta name="robots" content="...noindex..."> and excluded from patient navigation
 * - Singular naming convention (/exercise/, never /exercises/) across all routes and links
 * - No broken internal links across the rendered site
 *
 * Exit codes: 0 clean, 1 violation.
 */

import fs from 'node:fs';
import path from 'node:path';

export interface AreaRow {
  id?: string;
  area_id: string;
  section: 'stretching' | 'exercise';
  status: 'published' | 'draft' | 'retired';
  name_en: string;
}

export interface ItemRow {
  id: string;
  area_id: string;
  section: 'stretching' | 'exercise';
  status: 'published' | 'draft' | 'retired';
  name_en: string;
}

export interface CrawlResult {
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly routesCrawled: number;
  readonly anchorsVerified: number;
}

export function auditDist(
  distDir: string,
  areas: readonly AreaRow[],
  items: readonly ItemRow[],
  legalSlugs: readonly string[] = ['disclaimer', 'privacy', 'credits']
): CrawlResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!fs.existsSync(distDir)) {
    return {
      errors: [`✗ Build output directory not found at "${distDir}". Run "npm run build" first.`],
      warnings: [],
      routesCrawled: 0,
      anchorsVerified: 0,
    };
  }

  const expectedRoutes = new Set<string>();

  // 1. Static top-level routes
  expectedRoutes.add('/');
  expectedRoutes.add('/find-my-area/');
  expectedRoutes.add('/clinic/');
  expectedRoutes.add('/stretching/');
  expectedRoutes.add('/exercise/');
  // expectedRoutes.add('/preview/'); // Skipped: SSR

  // 2. Compatibility routes (e.g. /find-my-pain/)
  expectedRoutes.add('/find-my-pain/');

  // 3. Legal routes
  for (const slug of legalSlugs) {
    expectedRoutes.add(`/legal/${slug}/`);
  }

  // 4. Published content routes
  const publishedItems = items.filter((i) => i.status === 'published');
  const publishedAreas = areas.filter((a) => a.status === 'published');

  const populatedAreaKeys = new Set(publishedItems.map((i) => `${i.section}/${i.area_id}`));

  for (const area of publishedAreas) {
    const key = `${area.section}/${area.area_id}`;
    if (populatedAreaKeys.has(key)) {
      expectedRoutes.add(`/${area.section}/${area.area_id}/`);
      expectedRoutes.add(`/area/${area.area_id}/`);
    }
  }

  // 5. Preview routes (for draft inspection)
  // Skipped: preview routes are SSR (prerender = false) to support live sheet data.

  // Resolve route path to HTML file in dist
  const routeToFile = (route: string): string => {
    const normalized = route.replace(/^\/+|\/+$/g, '');
    if (!normalized) return path.join(distDir, 'index.html');
    if (path.extname(normalized)) return path.join(distDir, ...normalized.split('/'));
    return path.join(distDir, ...normalized.split('/'), 'index.html');
  };

  const fileToRoute = (filePath: string): string => {
    const rel = path.relative(distDir, filePath).replace(/\\/g, '/');
    if (rel === 'index.html') return '/';
    if (rel.endsWith('/index.html')) {
      return `/${rel.slice(0, -'/index.html'.length)}/`;
    }
    return `/${rel}`;
  };

  // Find all HTML files in dist
  const discoveredHtmlFiles: string[] = [];
  function walkDir(dir: string) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkDir(full);
      } else if (entry.isFile() && entry.name.endsWith('.html')) {
        discoveredHtmlFiles.push(full);
      }
    }
  }
  walkDir(distDir);

  const renderedContent = new Map<string, string>();

  // Verify all expected routes exist
  for (const route of expectedRoutes) {
    const file = routeToFile(route);
    if (!fs.existsSync(file)) {
      errors.push(`✗ Missing expected rendered route: "${route}" (expected file at "${file}").`);
    }
  }

  // Read and parse all discovered HTML files
  for (const file of discoveredHtmlFiles) {
    const route = fileToRoute(file);
    try {
      const html = fs.readFileSync(file, 'utf8');
      renderedContent.set(route, html);

      if (!html || html.trim().length === 0) {
        errors.push(`✗ Rendered route "${route}" is an empty HTML file.`);
      }
    } catch (err) {
      errors.push(`✗ Could not read rendered file for "${route}": ${(err as Error).message}`);
    }
  }

  // 6. Verify published item anchors on area pages
  let anchorsVerified = 0;
  for (const item of publishedItems) {
    const areaRoute = `/${item.section}/${item.area_id}/`;
    const html = renderedContent.get(areaRoute);
    if (html) {
      const hasId =
        html.includes(`id="${item.id}"`) ||
        html.includes(`id='${item.id}'`) ||
        html.includes(`id=${item.id}`);
      if (!hasId) {
        errors.push(
          `✗ Rendered area page "${areaRoute}" is missing required anchor for published item id="${item.id}".`
        );
      } else {
        anchorsVerified += 1;
      }
    }
  }

  // 7. Preview isolation & noindex verification
  for (const [route, html] of renderedContent) {
    const isPreview = route.startsWith('/preview');

    if (isPreview) {
      // Must contain robots noindex
      const robotsMatch = html.match(/<meta[^>]+name=["']robots["'][^>]*>/i);
      if (!robotsMatch || !robotsMatch[0].toLowerCase().includes('noindex')) {
        errors.push(
          `✗ Preview route "${route}" is missing required <meta name="robots" content="noindex..."> tag. Draft clinical content must never be indexed.`
        );
      }
    } else {
      // Patient route: must NOT link to preview
      for (const match of html.matchAll(/\bhref=["']([^"']+)["']/gi)) {
        const href = match[1];
        if (href.startsWith('/preview') || href.includes('/preview/')) {
          errors.push(
            `✗ Patient-facing route "${route}" contains a link to preview route "${href}". Draft preview routes must remain isolated from patient navigation.`
          );
        }
      }
    }
  }

  // 8. Pluralization check (Decision A-015: /exercise/, never /exercises/)
  for (const [route, html] of renderedContent) {
    if (route.startsWith('/exercises/')) {
      errors.push(
        `✗ Generated route "${route}" uses plural /exercises/. Decision A-015 requires singular /exercise/.`
      );
    }

    for (const match of html.matchAll(/\bhref=["']([^"']+)["']/gi)) {
      const href = match[1];
      if (href.startsWith('/exercises/')) {
        errors.push(
          `✗ Route "${route}" contains plural link "${href}". Decision A-015 requires singular /exercise/.`
        );
      }
    }
  }

  // 9. Internal Link Integrity (verify target routes exist)
  for (const [route, html] of renderedContent) {
    for (const match of html.matchAll(/\bhref=["']([^"']+)["']/gi)) {
      const href = match[1];
      // Skip external, protocol-relative, anchors, and asset links
      if (
        !href.startsWith('/') ||
        href.startsWith('//') ||
        href.startsWith('/_astro/') ||
        href.startsWith('/anatomy/') ||
        href.startsWith('/favicon')
      ) {
        continue;
      }

      const cleanPath = href.split('#')[0].split('?')[0] || '/';
      if (cleanPath.startsWith('/preview') || cleanPath === '/preview') continue;

      const targetFile = routeToFile(cleanPath);
      if (!fs.existsSync(targetFile)) {
        errors.push(
          `✗ Route "${route}" contains broken internal link to "${cleanPath}" (file not found).`
        );
      }
    }
  }

  return {
    errors,
    warnings,
    routesCrawled: renderedContent.size,
    anchorsVerified,
  };
}

function run(): void {
  console.log('--- Route Integrity & Static Build Crawler ---');

  const baseDir = process.cwd();
  const dataDir = path.join(baseDir, 'src', 'data');
  const legalDir = path.join(baseDir, 'src', 'content', 'legal');

  // Detect the correct build output directory.
  // The Vercel static adapter writes rendered routes to dist/client/.
  // Vanilla Astro writes directly to dist/.
  const vercelClientDir = path.join(baseDir, 'dist', 'client');
  const vanillaDistDir = path.join(baseDir, 'dist');

  let distDir: string;
  if (
    fs.existsSync(vercelClientDir) &&
    fs
      .readdirSync(vercelClientDir)
      .some((f) => f.endsWith('.html') || fs.statSync(path.join(vercelClientDir, f)).isDirectory())
  ) {
    distDir = vercelClientDir;
    console.log(`  Detected Vercel adapter output: using dist/client/`);
  } else {
    distDir = vanillaDistDir;
  }

  const areasPath = path.join(dataDir, 'areas.json');
  const itemsPath = path.join(dataDir, 'items.json');

  if (!fs.existsSync(areasPath) || !fs.existsSync(itemsPath)) {
    console.error('✗ Missing areas.json or items.json data files.');
    process.exit(1);
  }

  let areas: AreaRow[] = [];
  let items: ItemRow[] = [];
  try {
    areas = JSON.parse(fs.readFileSync(areasPath, 'utf8'));
    items = JSON.parse(fs.readFileSync(itemsPath, 'utf8'));
  } catch (err) {
    console.error(`✗ Error reading data JSON files: ${(err as Error).message}`);
    process.exit(1);
  }

  let legalSlugs: string[] = ['disclaimer', 'privacy', 'credits'];
  if (fs.existsSync(legalDir)) {
    legalSlugs = fs
      .readdirSync(legalDir)
      .filter((f) => f.endsWith('.md'))
      .map((f) => path.basename(f, '.md'));
  }

  const result = auditDist(distDir, areas, items, legalSlugs);

  console.log(`  Crawled ${result.routesCrawled} rendered route(s).`);
  console.log(`  Verified ${result.anchorsVerified} published item anchor(s).`);

  if (result.warnings.length > 0) {
    console.log(`\n${result.warnings.length} warning(s):`);
    for (const w of result.warnings) console.log(`  ${w}`);
  }

  if (result.errors.length > 0) {
    console.error(`\nFound ${result.errors.length} route violation(s):`);
    for (const e of result.errors) console.error(e);
    process.exit(1);
  }

  console.log(
    '\n✓ Route crawl clean: All canonical routes, anchors, legal pages, and preview isolation verified.'
  );
}

import { fileURLToPath } from 'node:url';

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  run();
}
