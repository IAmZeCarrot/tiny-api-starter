import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";

function parse<T>(body: string): T {
  return JSON.parse(body) as T;
}

describe("tasks API", () => {
  let app: FastifyInstance;
  beforeEach(async () => {
    app = await buildApp(
      {
        host: "127.0.0.1",
        port: 3000,
        databasePath: ":memory:",
        logLevel: "silent",
      },
      { logger: false },
    );
  });
  afterEach(async () => app.close());

  it("reports health and exposes OpenAPI", async () => {
    expect(
      (await app.inject({ method: "GET", url: "/health" })).json(),
    ).toEqual({ status: "ok" });
    const docs = await app.inject({
      method: "GET",
      url: "/openapi.json",
    });
    expect(docs.statusCode).toBe(200);
    expect(parse<{ info: { title: string } }>(docs.body).info.title).toBe(
      "Tiny API Starter",
    );
  });

  it("supports the full CRUD lifecycle", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/v1/tasks",
      payload: {
        title: "Ship starter",
        priority: "high",
        tags: ["release", "release"],
      },
    });
    expect(created.statusCode).toBe(201);
    expect(created.headers.location).toBe("/v1/tasks/1");
    expect(created.json()).toMatchObject({
      id: 1,
      title: "Ship starter",
      status: "todo",
      tags: ["release"],
    });
    const updated = await app.inject({
      method: "PATCH",
      url: "/v1/tasks/1",
      payload: { status: "done", description: "Ready" },
    });
    expect(updated.json()).toMatchObject({
      status: "done",
      description: "Ready",
    });
    expect(
      (await app.inject({ method: "GET", url: "/v1/tasks/1" })).statusCode,
    ).toBe(200);
    expect(
      (await app.inject({ method: "DELETE", url: "/v1/tasks/1" })).statusCode,
    ).toBe(204);
    expect(
      (await app.inject({ method: "GET", url: "/v1/tasks/1" })).statusCode,
    ).toBe(404);
  });

  it("filters, searches, sorts, and paginates", async () => {
    for (const payload of [
      { title: "Write docs", priority: "high", status: "todo", tags: ["docs"] },
      { title: "Fix test", priority: "low", status: "done", tags: ["code"] },
      {
        title: "Publish docs",
        priority: "high",
        status: "done",
        tags: ["docs"],
      },
    ])
      await app.inject({ method: "POST", url: "/v1/tasks", payload });
    const response = await app.inject({
      method: "GET",
      url: "/v1/tasks?priority=high&tag=docs&q=docs&sort=title&order=asc&page=1&limit=1",
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      total: 2,
      totalPages: 2,
      page: 1,
      limit: 1,
      data: [{ title: "Publish docs" }],
    });
  });

  it("returns consistent errors for invalid input and routes", async () => {
    const invalid = await app.inject({
      method: "POST",
      url: "/v1/tasks",
      payload: { title: "", surprise: true },
    });
    expect(invalid.statusCode).toBe(400);
    const invalidBody = parse<{
      error: { code: string; message: string; requestId: string };
    }>(invalid.body);
    expect(invalidBody.error).toMatchObject({
      code: "VALIDATION_ERROR",
      message: "Request validation failed",
    });
    expect(invalidBody.error.requestId).toBeTruthy();
    const missing = await app.inject({ method: "GET", url: "/nope" });
    expect(parse<{ error: { code: string } }>(missing.body).error.code).toBe(
      "ROUTE_NOT_FOUND",
    );
  });

  it("rejects empty updates and limits page size", async () => {
    await app.inject({
      method: "POST",
      url: "/v1/tasks",
      payload: { title: "One" },
    });
    expect(
      (await app.inject({ method: "PATCH", url: "/v1/tasks/1", payload: {} }))
        .statusCode,
    ).toBe(400);
    expect(
      (await app.inject({ method: "GET", url: "/v1/tasks?limit=101" }))
        .statusCode,
    ).toBe(400);
  });
});
