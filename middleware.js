// Vercel Edge Middleware — runs at the CDN edge before any function or static file is served.
// This file must live at the project root and export a default middleware function.
// See: https://vercel.com/docs/functions/edge-middleware

import { NextResponse } from 'next/server'

// Countries whose traffic must be blocked outright per export control obligations.
const BLOCKED_COUNTRIES = new Set(['RU', 'BY'])

export function middleware(req) {
  const country = req.geo?.country

  // req.geo is populated by Vercel's edge network. When running locally it will
  // be undefined, so we fall through and allow the request.
  if (country && BLOCKED_COUNTRIES.has(country)) {
    return new NextResponse('Access from this region is not permitted.', { status: 403 })
  }

  return NextResponse.next()
}

export const config = {
  // Apply to every route. Narrow this down (e.g. '/api/:path*') if you only
  // want to gate the serverless functions and not static assets.
  matcher: '/:path*',
}
