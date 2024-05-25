import { Elysia } from 'elysia';
import { html } from '@elysiajs/html';
import { rateLimit } from 'elysia-rate-limit';
import staticPlugin from '@elysiajs/static';

import { getCityBySearch } from './utils/google-city';
import { getTextResponse } from './utils/text-response';
import { responseView } from './utils/view-response';
import { getCityByIp } from './utils/ip-city';

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
      isCurl: !!request.headers.get('user-agent')?.includes('curl')
    }))
  )
  .use(app =>
    // provide isCurl to each endpoint handler
    app.derive({ as: 'global' }, ({ request }) => ({
      ip:
        request.headers.get('x-forwarded-for') ??
        request.headers.get('x-envoy-external-address')
    }))
  )
  .get('/', async ({ isCurl, ip }) => {
    console.log('Search for ip:', ip);
    const city = await getCityByIp(ip);
    const textResponse = await getTextResponse(city, isCurl);
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
  .get('/:query', async ({ params, isCurl }) => {
    console.log('Search for city:', params.query);
    const city = await getCityBySearch(params.query);
    const textResponse = await getTextResponse(city, isCurl);
    if (isCurl) return textResponse;
    return responseView(textResponse, city.name);
  })
  .listen(process.env['PORT'] ?? 3000);

console.log(
  `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`
);
