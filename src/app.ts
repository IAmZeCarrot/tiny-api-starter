import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import Fastify, { type FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import type { AppConfig } from './config.js';
import { openDatabase } from './database.js';
import { HttpError } from './errors.js';
import { taskRoutes } from './tasks/routes.js';

export async function buildApp(
  config: AppConfig,
  options: { logger?: boolean } = {},
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logger ?? { level: config.logLevel },
    bodyLimit: 1_048_576,
    requestIdHeader: 'x-request-id',
  });
  const database = openDatabase(config.databasePath);
  app.decorate('database', database);
  app.addHook('onClose', async () => database.close());
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Tiny API Starter',
        version: '1.0.0',
        description: 'A small production-minded tasks API.',
      },
      servers: [{ url: 'http://localhost:3000' }],
      tags: [{ name: 'system' }, { name: 'tasks' }],
    },
  });
  app.get(
    '/openapi.json',
    { schema: { hide: true } },
    async (_request, reply) => reply.send(app.swagger()),
  );
  app.get(
    '/health',
    { schema: { tags: ['system'], summary: 'Readiness check' } },
    async () => ({ status: 'ok' }),
  );
  app.setNotFoundHandler((request, reply) =>
    reply.code(404).send({
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: `No route for ${request.method} ${request.url}`,
        requestId: request.id,
      },
    }),
  );
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError)
      return reply.code(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: error.issues,
          requestId: request.id,
        },
      });
    if (error instanceof HttpError)
      return reply.code(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
          requestId: request.id,
        },
      });
    request.log.error(error);
    return reply.code(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        requestId: request.id,
      },
    });
  });
  await app.register(taskRoutes, { prefix: '/v1/tasks' });
  return app;
}
