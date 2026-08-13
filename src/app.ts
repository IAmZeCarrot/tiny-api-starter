import helmet from "@fastify/helmet";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import Fastify, { type FastifyInstance } from "fastify";
import { ZodError } from "zod";
import type { AppConfig } from "./config.js";
import { openDatabase } from "./database.js";
import { HttpError } from "./errors.js";
import { taskRoutes } from "./tasks/routes.js";

function isFastifyValidationError(
  error: unknown,
): error is { validation: unknown[] } {
  return (
    typeof error === "object" &&
    error !== null &&
    "validation" in error &&
    Array.isArray(error.validation)
  );
}

export async function buildApp(
  config: AppConfig,
  options: { logger?: boolean } = {},
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logger ?? { level: config.logLevel },
    bodyLimit: 1_048_576,
    requestIdHeader: "x-request-id",
    ajv: {
      customOptions: {
        keywords: ["example"],
      },
    },
  });
  const database = openDatabase(config.databasePath);
  app.decorate("database", database);
  app.addHook("onClose", async () => database.close());
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(swagger, {
    openapi: {
      info: {
        title: "Tiny API Starter",
        version: "1.0.0",
        description: "A small production-minded tasks API.",
      },
      servers: [{ url: "http://localhost:3000" }],
      tags: [{ name: "system" }, { name: "tasks" }],
    },
  });
  if (config.docsEnabled !== false) {
    await app.register(swaggerUi, {
      routePrefix: "/docs",
      uiConfig: {
        deepLinking: true,
        displayRequestDuration: true,
        tryItOutEnabled: true,
      },
      staticCSP: true,
    });
    app.get(
      "/openapi.json",
      { schema: { hide: true } },
      async (_request, reply) => reply.send(app.swagger()),
    );
  }
  app.get("/", { schema: { hide: true } }, async () => ({
    name: "Tiny API Starter",
    health: "/health",
    docs: config.docsEnabled === false ? null : "/docs",
    openapi: config.docsEnabled === false ? null : "/openapi.json",
  }));
  app.get(
    "/health",
    { schema: { tags: ["system"], summary: "Readiness check" } },
    async () => ({ status: "ok" }),
  );
  app.setNotFoundHandler((request, reply) =>
    reply.code(404).send({
      error: {
        code: "ROUTE_NOT_FOUND",
        message: `No route for ${request.method} ${request.url}`,
        requestId: request.id,
      },
    }),
  );
  app.setErrorHandler((error, request, reply) => {
    if (isFastifyValidationError(error))
      return reply.code(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          requestId: request.id,
        },
      });
    if (error instanceof ZodError)
      return reply.code(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
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
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
        requestId: request.id,
      },
    });
  });
  await app.register(taskRoutes, { prefix: "/v1/tasks" });
  return app;
}
