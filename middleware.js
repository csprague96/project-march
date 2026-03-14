// Vercel Edge Middleware — runs at the CDN edge before any function or static file is served.
// This file must live at the project root and export a default middleware function.
// See: https://vercel.com/docs/functions/edge-middleware
//
// IMPORTANT: This is a plain Vite/static project, NOT Next.js.
// Do not import from 'next/server'. Use the standard Web API (Request / Response) instead.

// Countries whose traffic must be blocked outright per export control obligations.
const BLOCKED_COUNTRIES = new Set(['RU', 'BY'])

export default function middleware(req) {
  // req.geo is injected by Vercel's edge network at runtime.
  // It is undefined during local development, so the block is skipped locally.
  const country = req.geo?.country

  if (country && BLOCKED_COUNTRIES.has(country)) {
    return new Response('Access from this region is not permitted.', { status: 403 })
  }

  // Returning undefined tells Vercel to continue serving the original request normally.
  // Do NOT return a new Response() here — that would replace the response body with an empty page.
  return undefined
}

export const config = {
  matcher: '/:path*',
}
