import { zodToJsonSchema } from 'zod-to-json-schema';
import type { ZodTypeAny } from 'zod';
import { routeRegistry } from './route.js';

const toSchema = (s: ZodTypeAny) =>
  zodToJsonSchema(s, { target: 'openApi3', $refStrategy: 'none' }) as Record<string, unknown>;

function paramsFrom(schema: ZodTypeAny | undefined, where: 'query' | 'path') {
  if (!schema) return [];
  const js = toSchema(schema) as { properties?: Record<string, unknown>; required?: string[] };
  return Object.entries(js.properties ?? {}).map(([name, s]) => ({
    name,
    in: where,
    required: where === 'path' || (js.required ?? []).includes(name),
    schema: s,
  }));
}

/** Builds an OpenAPI 3.0 document from routes declared with `route()`. */
export function buildOpenApi() {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const r of routeRegistry) {
    const path = r.url.replace(/:(\w+)/g, '{$1}');
    const access =
      r.access === 'public'
        ? 'Public'
        : r.access === 'auth'
          ? 'Any logged-in user'
          : `Requires: ${r.access.join(', ')}`;
    (paths[path] ??= {})[r.method.toLowerCase()] = {
      tags: [r.tag],
      summary: r.summary,
      description: access,
      parameters: [...paramsFrom(r.params, 'path'), ...paramsFrom(r.query, 'query')],
      ...(r.body
        ? {
            requestBody: {
              required: true,
              content: { 'application/json': { schema: toSchema(r.body) } },
            },
          }
        : {}),
      responses: {
        '200': { description: 'OK' },
        '4XX': { description: 'Error envelope { error: { code, message } }' },
      },
      ...(r.access === 'public' ? {} : { security: [{ session: [] }] }),
    };
  }
  return {
    openapi: '3.0.3',
    info: {
      title: 'Young Owl API',
      version: '0.2.0',
      description:
        'Session cookie auth. State-changing requests must send the yo_csrf cookie value in the X-CSRF-Token header.',
    },
    servers: [{ url: '/' }],
    components: {
      securitySchemes: { session: { type: 'apiKey', in: 'cookie', name: 'yo_session' } },
    },
    paths,
  };
}
