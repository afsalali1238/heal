import { defineMiddleware } from 'astro:middleware';
import { checkPreviewAuth } from './lib/preview-auth';

/**
 * `/preview` is the clinician's review area: drafted rows, unapproved figures,
 * internal notes. It must never be reachable by a patient by accident, and never
 * indexable even when it is reachable.
 *
 * The decision itself lives in `src/lib/preview-auth.ts`, because middleware cannot
 * be imported into a test without an Astro runtime — and an auth check that has
 * never run outside the request that ships it is the kind of thing that stays broken
 * quietly. See that file for why `Buffer` is not used here.
 */

const CHALLENGE = 'Basic realm="Clinician Preview Area"';

const challenge = (body: string) =>
  new Response(body, {
    status: 401,
    headers: { 'WWW-Authenticate': CHALLENGE },
  });

export const onRequest = defineMiddleware((context, next) => {
  const url = new URL(context.request.url);
  if (!url.pathname.startsWith('/preview')) return next();

  switch (
    checkPreviewAuth({
      header: context.request.headers.get('authorization'),
      expectedPassword: import.meta.env.PREVIEW_PASSWORD,
      hostname: url.hostname,
    })
  ) {
    case 'open':
      return next();
    case 'unauthenticated':
      return challenge('Authentication Required');
    case 'denied':
      return challenge('Unauthorized');
    case 'not-configured':
      return new Response('Preview unavailable: PREVIEW_PASSWORD is not configured.', {
        status: 503,
      });
  }
});
