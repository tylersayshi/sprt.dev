import { Elysia } from 'elysia';
import { html } from '@elysiajs/html';
import { rateLimit } from 'elysia-rate-limit';
import staticPlugin from '@elysiajs/static';

import { getCityBySearch } from './utils/google-city';
import { getTextResponse } from './utils/text-response';
import { responseView } from './utils/view-response';
import { getCitySportsFromGeo } from './utils/ip-city';
import { getIpCity } from './utils/get-ip-city';
import { DEFAULT_CITY_RES } from 'db';

import * as Sentry from '@sentry/bun';

Sentry.init({
  dsn: process.env['SENTRY_DSN'],
  // Performance Monitoring
  tracesSampleRate: 1.0, // Capture 100% of the transactions

  tracePropagationTargets: ['localhost', /^https:\/\/sprt\.dev/]
});

const app = new Elysia()
  .use(
    rateLimit({
      duration: 1000 * 60 * 60, // 1 hour
      errorResponse: 'Easy big Fella - Too Many Requests',
      max: 50 // 50 requests per hour
    })
  )
  .use(staticPlugin())
  .use(html())
  .use(app =>
    // provide isCurl to each endpoint handler
    app.derive({ as: 'global' }, ({ request }) => ({
      ip:
        request.headers.get('x-forwarded-for') ??
        request.headers.get('x-envoy-external-address'),
      locale: request.headers.get('accept-language')?.split(',')[0] ?? 'en-US',
      // provide isCurl to each endpoint handler
      isCurl: !!request.headers.get('user-agent')?.includes('curl')
    }))
  )
  .get('/', async ({ isCurl, ip, locale }) => {
    const cityGeo = await getIpCity(ip);
    const city = await getCitySportsFromGeo(cityGeo);
    const textResponse = await getTextResponse(city, isCurl, locale);
    if (isCurl) return textResponse;
    return responseView(textResponse, city.name);
  })
  .get('/favicon.ico', async () => {
    const file = Bun.file('public/images/favicon/favicon.ico');
    return new Response(file, {
      headers: {
        'Content-Type': 'image/x-icon'
      }
    });
  })
  .get('/:query', async ({ params, isCurl, ip, locale }) => {
    const parsedQuery = decodeURIComponent(params.query);

    const cityGeo = await getIpCity(ip);

    const city = await (async () => {
      if (!parsedQuery.match(/^[A-Za-z\s-_]+$/)) {
        console.log('Invalid city:', parsedQuery);
        return DEFAULT_CITY_RES;
      } else {
        console.log('Search for city:', parsedQuery);
        return getCityBySearch(params.query, cityGeo?.timezone);
      }
    })();

    const textResponse = await getTextResponse(city, isCurl, locale);
    if (isCurl) return textResponse;
    return responseView(textResponse, city.name);
  })
  .listen(process.env['PORT'] ?? 3000);

console.log(
  `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`
);
