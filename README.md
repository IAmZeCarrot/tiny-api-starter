# Tiny API Starter

A compact, production-minded REST API starter built with Node.js, TypeScript, Fastify, and SQLite. It provides a complete tasks resource, strict request validation, migrations, consistent errors, interactive OpenAPI documentation, and a test suite you can extend with the product.

## Why this starter

- Local SQLite persistence with ordered, transactional migrations
- CRUD, filtering, search, sorting, and bounded pagination
- Strict Zod validation at the HTTP boundary
- Interactive Swagger UI and OpenAPI JSON generated from the running application
- Security headers, request IDs, size limits, graceful shutdown, and safe network defaults
- Unit and integration tests with enforced coverage thresholds
- ESLint, Prettier, strict TypeScript, and GitHub Actions CI

There are no accounts, external services, telemetry, or secrets in the starter.

## Requirements

- Node.js 22 or newer
- npm 10 or newer

## Quick start

```bash
npm install
cp .env.example .env
npm run dev
```

Open `http://127.0.0.1:3000/docs` in a browser. Swagger UI shows every operation and lets you create, list, edit, and delete tasks with **Try it out**. The same generated specification is available at `http://127.0.0.1:3000/openapi.json` for Insomnia, Postman, code generators, and other OpenAPI tools.

Create and list tasks:

```bash
curl -X POST http://127.0.0.1:3000/v1/tasks \
  -H 'content-type: application/json' \
  -d '{"title":"Ship the API","priority":"high","tags":["release"]}'

curl 'http://127.0.0.1:3000/v1/tasks?status=todo&priority=high&page=1&limit=20'
```

## API

| Method   | Path            | Purpose                                        |
| -------- | --------------- | ---------------------------------------------- |
| `GET`    | `/health`       | Readiness check                                |
| `GET`    | `/docs`         | Interactive Swagger UI                         |
| `GET`    | `/openapi.json` | Generated OpenAPI document                     |
| `GET`    | `/v1/tasks`     | List, filter, search, sort, and paginate tasks |
| `POST`   | `/v1/tasks`     | Create a task                                  |
| `GET`    | `/v1/tasks/:id` | Fetch one task                                 |
| `PATCH`  | `/v1/tasks/:id` | Update selected task fields                    |
| `DELETE` | `/v1/tasks/:id` | Delete a task                                  |

A task has a title, optional description and due date, a status (`todo`, `in_progress`, or `done`), a priority (`low`, `medium`, or `high`), tags, and server-managed timestamps.

List parameters:

- `status`, `priority`, and exact `tag` filters
- case-insensitive `q` search across title and description
- inclusive `dueBefore` date filter
- `sort=createdAt|updatedAt|dueDate|title` and `order=asc|desc`
- `page` (starting at 1) and `limit` (1 through 100)

List responses include `data`, `page`, `limit`, `total`, and `totalPages`. Deletes return `204 No Content`.

Errors use a stable envelope:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [],
    "requestId": "req-1"
  }
}
```

Clients can supply `x-request-id`; otherwise the server creates one.

## Configuration

| Variable        | Default                  | Meaning                                                       |
| --------------- | ------------------------ | ------------------------------------------------------------- |
| `HOST`          | `127.0.0.1`              | Listen address. Set deliberately to `0.0.0.0` for containers. |
| `PORT`          | `3000`                   | TCP port, validated from 1 to 65535.                          |
| `DATABASE_PATH` | `./data/tiny-api.sqlite` | SQLite file. Parent directories are created.                  |
| `LOG_LEVEL`     | `info`                   | Pino log level, including `silent` for tests.                 |
| `DOCS_ENABLED`  | `true`                   | Serve `/docs` and `/openapi.json`; accepts `true` or `false`. |

`.env` and database files are ignored. Do not store production credentials in repository files.

The documentation interface can execute real requests against the running server. Set `DOCS_ENABLED=false` where public API exploration is inappropriate, or protect the service at your gateway. Disabling it removes both `/docs` and `/openapi.json`; the API itself continues to operate.

## Database and migrations

Migrations live in `src/database.ts`, run in ascending order at startup, and are recorded in the `migrations` table. Each pending migration is applied transactionally. Add a new immutable entry for every schema change; never edit a migration already used by a deployed database. Back up the SQLite file before applying production migrations.

SQLite uses WAL mode for good local concurrency. The server should remain a single application instance unless you have assessed your shared-filesystem and write-concurrency needs.

## Development

```bash
npm run dev          # reload on source changes
npm test             # tests and coverage thresholds
npm run lint
npm run format:check
npm run typecheck
npm run build
npm run check        # everything CI runs
```

Production-style local run:

```bash
npm run build
NODE_ENV=production npm start
```

Tests use an isolated in-memory SQLite database. Add API integration tests for every behavior change and focused unit tests for validation or persistence edge cases.

## Project structure

```text
src/
  app.ts                 application composition and errors
  config.ts              environment validation
  database.ts            SQLite setup and migrations
  server.ts              process lifecycle
  tasks/                 resource schema, repository, and routes
test/                     unit and HTTP integration tests
```

## Production notes and limitations

This is a starter, not a complete platform. Before exposing it publicly, choose authentication and authorization for your domain, configure trusted proxies and CORS if needed, add rate limiting at the edge or application layer, define backup and restore procedures, and instrument it for your environment.

SQLite is an excellent fit for a small service or single-node deployment, but not a drop-in replacement for a multi-node database. Search uses SQLite `LIKE`, not full-text search. Pagination is offset-based and best suited to modest datasets. The Zod validation and matching Fastify/OpenAPI schemas are kept beside each other; update both whenever the resource contract changes.

## License

MIT. See [LICENSE](LICENSE).
