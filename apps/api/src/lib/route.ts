import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { ZodTypeAny, z } from 'zod';
import type { Permission, SessionUser } from '@young-owl/shared';

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export interface RouteSpec<B extends ZodTypeAny, Q extends ZodTypeAny, P extends ZodTypeAny> {
  method: Method;
  url: string;
  summary: string;
  tag: string;
  /** Required permissions; `'auth'` means any logged-in user; `'public'` means no login. */
  access: Permission[] | 'auth' | 'public';
  body?: B;
  query?: Q;
  params?: P;
  status?: number;
}

export interface RegisteredRoute {
  method: Method;
  url: string;
  summary: string;
  tag: string;
  access: string[] | 'auth' | 'public';
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

/** Every route defined through `route()` — used to build the OpenAPI document. */
export const routeRegistry: RegisteredRoute[] = [];

type Infer<T> = T extends ZodTypeAny ? z.infer<T> : undefined;

export interface Ctx<B, Q, P> {
  req: FastifyRequest;
  reply: FastifyReply;
  user: SessionUser;
  body: B;
  query: Q;
  params: P;
}

/**
 * Declares a route with Zod-validated input and RBAC in one place.
 * Validation errors bubble to the global error handler as 400 VALIDATION_ERROR.
 */
export function route<
  B extends ZodTypeAny = ZodTypeAny,
  Q extends ZodTypeAny = ZodTypeAny,
  P extends ZodTypeAny = ZodTypeAny,
>(
  app: FastifyInstance,
  spec: RouteSpec<B, Q, P>,
  handler: (ctx: Ctx<Infer<B>, Infer<Q>, Infer<P>>) => Promise<unknown>,
) {
  const prefix = app.prefix ?? '';
  routeRegistry.push({ ...spec, url: `${prefix}${spec.url}` });

  const preHandler =
    spec.access === 'public'
      ? undefined
      : spec.access === 'auth'
        ? app.requireAuth
        : app.requirePermission(...spec.access);

  app.route({
    method: spec.method,
    url: spec.url,
    preHandler,
    handler: async (req, reply) => {
      const ctx = {
        req,
        reply,
        user: req.user as SessionUser,
        body: (spec.body ? spec.body.parse(req.body ?? {}) : undefined) as Infer<B>,
        query: (spec.query ? spec.query.parse(req.query) : undefined) as Infer<Q>,
        params: (spec.params ? spec.params.parse(req.params) : undefined) as Infer<P>,
      };
      const result = await handler(ctx);
      if (spec.status) reply.status(spec.status);
      if (result === undefined) return reply.status(spec.status ?? 204).send();
      return result;
    },
  });
}
