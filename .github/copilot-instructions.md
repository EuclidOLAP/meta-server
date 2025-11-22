## Quick Orientation

- **Purpose:** This repo is the OLAP metadata service (HTTP + gRPC) that exposes metadata about cubes, dimensions, members and calculated metrics to other Euclid components.
- **Main runtimes:** Node.js (TypeScript + some legacy JavaScript). Key runtime files live under `src/` and `index.ts`/`index.js` entry points.

**Architecture & data flow**

- **HTTP API layer:** `src/startup-service.ts` boots an Express app and mounts route modules from `src/routes/*`.
  - HTTP server default port: `8763` (see `app.listen` in `src/startup-service.ts`).
- **gRPC meta service:** implemented in `src/meta-grpc/olap-meta-grpc-server.ts` and loaded from `.proto` files under `proto/`.
  - gRPC server binds to `50051` and exposes the `OlapMetaService` defined in `proto/olapmeta.proto`.
- **Database layer:** Sequelize models live in two places:
  - TypeScript Sequelize models: `src/database/*.ts` (preferred for new work, e.g. `Cube.ts`, `Member.ts`).
  - Legacy JS models: `src/models/*.js` (used by some route modules; watch for mixed imports).
- **External integrations:**
  - MySQL (via `sequelize` / `mysql2`) — DB connection configured in `src/config/database.js` using env vars `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_DIALECT`.
  - OSS upload helpers in `src/oss-wrapper.js` and ali-oss dependency.
  - Internal NPM package `@euclidolap/olap-model` provides types, `ResponseResult`, and helpers like `OlapModelUtil` used by models.

**Where to look for patterns/examples**

- Route layering and AOP-like hooks: `src/routes/meta-restful-api.ts` — shows `before_request` intercept, `res.json` interception and `filterDataByUser` usage.
- gRPC handlers: `src/meta-grpc/olap-meta-grpc-server.ts` — examples of mapping DB queries to proto responses and how binary `fullPath` is handled (`Member.getGidFullPathInUint64`).
- Model conventions: `src/database/Member.ts` — binary `fullPath` stored as BLOB, `timestamps: true`, `underscored: true` (DB columns use snake_case).
- Admin/permissions bootstrap: `src/permission/permission.ts` — `initAdminUsers()` is invoked at startup to create default admin when DB empty; `filterDataByUser()` demonstrates how data is filtered per request.
- Startup: `src/startup-service.ts` wires CORS, cookie parser, routes, and starts the gRPC server via `startMetaGrpcServer()`.

**Developer workflows & commands**

- Development (hot-reload):
  - `npm run dev` — launches `ts-node-dev --respawn index.ts`. Requires environment variables (DB_*, ACCESS_TOKEN_SECRET, etc.).
- Build & run production:
  - `npm run build` — runs `tsc` then copies `./proto` into `./dist`.
  - `npm start` — runs `node dist/index.js` (expects env and a built dist).
- Tests: none provided. `npm test` is a placeholder.

Environment notes

- Required env vars (at minimum): `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_DIALECT`. JWT secrets in `src/config/jwt.ts` may be overridden with `ACCESS_TOKEN_SECRET` / `REFRESH_TOKEN_SECRET`.
- DB dialect often is `mysql` and models assume `BIGINT.UNSIGNED` ids; be mindful when seeding test data.

Project-specific conventions / gotchas

- Mixed JS/TS model layers: prefer `src/database/*.ts` for new code. Some older route modules still import models from `src/models/*.js` — keep imports consistent when refactoring.
- Response shaping: many routes use `ResponseResult` from `@euclidolap/olap-model`. The `meta-restful-api` installs a `before_request` hook that intercepts `res.json` and calls `filterDataByUser` asynchronously — modifying this hook requires understanding `filterDataByUser` semantics.
- Binary `fullPath` handling: `Member.fullPath` is stored as a binary buffer. Use `Member.getGidFullPathInUint64()` (or `OlapModelUtil` helpers) to convert to numeric arrays.
- AsyncLocalStorage: some creation helpers use `AsyncLocalStorage` to pass contextual state during nested creations (`createMembersTree` / `createChildMember`). Preserve this pattern when implementing tree operations.
- BigInt usage: code computes cube capacity with BigInt. Take care when serializing/deserializing (callers expect `string` for very large values).
- gRPC <-> HTTP parity: gRPC handlers mirror many HTTP endpoints but return protobuf-shaped messages. When changing DB fields, update both the proto and server code.

Files to inspect first for a given change

- `src/startup-service.ts` — service entry wiring
- `src/meta-grpc/olap-meta-grpc-server.ts` — gRPC handlers and proto usage
- `proto/olapmeta.proto` — proto schema for meta APIs
- `src/routes/meta-restful-api.ts` — primary HTTP API example and permission filtering
- `src/database/*` — canonical Sequelize models
- `src/config/database.js` and `src/config/jwt.ts` — environment and secrets

If you edit code, remember

- Keep DB column naming: models use `underscored: true` (snake_case in DB).
- Preserve `fullPath` binary layout when modifying member creation code: 8-byte GID chunks.
- If adding a new gRPC method, update `proto/*.proto` first, regenerate or ensure server loads the new RPC, and keep `dist/proto` in sync with `npm run build`.

What I couldn't infer (ask me)

- Intended production deployment layout (systemd, container, or k8s) — there are scripts but no Dockerfile or k8s manifests.
- Any required seed data beyond `initAdminUsers()` (e.g., sample cubes or dimensions) — tell me if you want a seed script.

Feedback requested

Please tell me if you'd like me to:
- Add a small runnable README section with example env vars and a `curl` + `grpcurl` example.
- Generate a seed script to create a demo cube and dimension data.
- Merge or preserve any local `.github/copilot-instructions.md` content you currently have (none found in repo scan).
