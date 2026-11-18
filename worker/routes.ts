// The paths the Worker runs for (spec 002 §3, D8). wrangler.jsonc's `run_worker_first` lists
// exactly these, in this order; tests/hosting.test.ts compares the two and checks every page and
// counted file in dist/ against them. Every other path is a static asset Cloudflare serves without
// the script.

/** The MCP server (§2). */
export const MCP_ROUTE = '/mcp'

/** The page routes of spec 001 §3.1: negotiated between HTML and Markdown, and counted as page_served. */
export const PAGE_ROUTES = ['/', '/guide', '/compare', '/runtimes', '/playground', '/agents', '/method', '/privacy', '/changelog', '/devices/*']

/** The files §2.5 counts as file_served, served from the assets unchanged. */
export const COUNTED_FILES = ['/data/*', '/llms.txt', '/llms-full.txt', '/*.md', '/skills/*']

/** `run_worker_first` as wrangler.jsonc writes it. */
export const RUN_WORKER_FIRST = [MCP_ROUTE, ...PAGE_ROUTES, ...COUNTED_FILES]

/**
 * Whether a pattern matches a path, as Cloudflare's asset router reads `run_worker_first`: `*` is
 * any run of characters, `/` included, and the pattern spans the whole path.
 */
export function matchesRoute(pattern: string, pathname: string): boolean {
  const source = pattern.split('*').map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*')
  return new RegExp(`^${source}$`).test(pathname)
}

export type RouteKind = 'mcp' | 'file' | 'page' | 'other'

/** What a path is. A counted file wins over a page route, so /devices/iphone-17.md is a file. */
export function routeKind(pathname: string): RouteKind {
  if (pathname === MCP_ROUTE) return 'mcp'
  if (COUNTED_FILES.some((p) => matchesRoute(p, pathname))) return 'file'
  if (PAGE_ROUTES.some((p) => matchesRoute(p, pathname))) return 'page'
  return 'other'
}
