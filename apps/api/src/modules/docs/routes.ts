import type { FastifyPluginAsync } from 'fastify';
import { buildOpenApi } from '../../lib/openapi.js';

export const docsRoutes: FastifyPluginAsync = async (app) => {
  // Built lazily so it includes every route registered before the first request.
  let cached: unknown;
  app.get('/openapi.json', async () => (cached ??= buildOpenApi()));
};
