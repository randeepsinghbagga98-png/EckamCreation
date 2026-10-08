import { paths } from '@eckamcreation/api-contracts';
import { NextResponse, type NextRequest } from 'next/server';
import { getEditorialCollection } from '@/lib/collections/edits';

const API_ORIGIN =
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://127.0.0.1:3002';
const MISSING_SLUG = 'eckam-missing';
const SKIP_HEADER = 'x-eckam-catalogue-missing';

export const config = {
  matcher: ['/shop/:slug', '/collections/:slug'],
};

type CatalogueKind = 'product' | 'collection';
type Lookup = 'present' | 'missing' | 'error';

function decodeSegment(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function matchCataloguePath(pathname: string): { kind: CatalogueKind; slug: string } | null {
  const shop = pathname.match(/^\/shop\/([^/]+)$/);
  if (shop) {
    return { kind: 'product', slug: decodeSegment(shop[1]) };
  }

  const collection = pathname.match(/^\/collections\/([^/]+)$/);
  if (collection) {
    return { kind: 'collection', slug: decodeSegment(collection[1]) };
  }

  return null;
}

async function lookupCatalogue(kind: CatalogueKind, slug: string): Promise<Lookup> {
  if (kind === 'collection' && getEditorialCollection(slug)) {
    return 'present';
  }

  const encoded = encodeURIComponent(slug);
  const path =
    kind === 'product' ? paths.catalogue.product(encoded) : paths.catalogue.collection(encoded);

  try {
    let response: Response | null = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        response = await fetch(`${API_ORIGIN}${path}`, {
          method: 'GET',
          headers: { accept: 'application/json' },
          cache: 'no-store',
          signal: AbortSignal.timeout(10000),
        });
        break;
      } catch (error) {
        if (attempt === 1) {
          throw error;
        }
      }
    }

    if (!response) {
      return 'error';
    }

    if (response.status === 404) {
      return 'missing';
    }

    if (response.ok) {
      return 'present';
    }

    return 'error';
  } catch {
    return 'error';
  }
}

export async function proxy(request: NextRequest) {
  if (request.headers.get(SKIP_HEADER) === '1') {
    return NextResponse.next();
  }

  const matched = matchCataloguePath(request.nextUrl.pathname);
  if (!matched) {
    return NextResponse.next();
  }

  const lookup =
    matched.slug === MISSING_SLUG ? 'missing' : await lookupCatalogue(matched.kind, matched.slug);
  if (lookup !== 'missing') {
    return NextResponse.next();
  }

  const missingUrl = new URL(
    matched.kind === 'product' ? `/shop/${MISSING_SLUG}` : `/collections/${MISSING_SLUG}`,
    request.url,
  );
  const html = await fetch(missingUrl, {
    headers: {
      accept: 'text/html',
      [SKIP_HEADER]: '1',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(4000),
  }).catch(() => null);

  if (html?.ok && html.body) {
    const headers = new Headers();
    headers.set('content-type', html.headers.get('content-type') ?? 'text/html; charset=utf-8');
    headers.set('x-robots-tag', 'noindex, nofollow');
    return new NextResponse(html.body, {
      status: 404,
      headers,
    });
  }

  const label = matched.kind === 'product' ? 'Product not found' : 'Collection not found';
  return new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex, nofollow"><title>${label}</title></head><body><p>${label}</p></body></html>`,
    {
      status: 404,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'x-robots-tag': 'noindex, nofollow',
      },
    },
  );
}
