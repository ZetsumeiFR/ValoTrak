# Deploying the ValoTrak backend with Dokploy

The Hono backend (`apps/server`) ships as a multi-stage [`Dockerfile`](./Dockerfile)
that compiles the server into a single self-contained Bun binary. The runtime
image carries no `node_modules` and no source — just the binary.

## 1. Prerequisites

- A [Dokploy](https://dokploy.com/) instance running on your VPS.
- A Neon Postgres database (connection string).
- A domain (or subdomain) pointed at your VPS, e.g. `api.your-domain.com`.

## 2. Run the database migrations (once)

The container does **not** run migrations. Apply the schema to your Neon DB
from your machine before the first deploy (and again whenever the schema changes):

```bash
# from the repo root, with DATABASE_URL pointing at your production Neon DB
DATABASE_URL="postgresql://...@...neon.tech/...?sslmode=require" bun run db:push
```

## 3. Create the application in Dokploy

1. **Create → Application**, then in the **General / Source** tab:
   - **Source**: GitHub → select `ZetsumeiFR/ValoTrak`, branch `main`.
2. In the **Build** tab:
   - **Build Type**: `Dockerfile`
   - **Docker File**: `apps/server/Dockerfile`
   - **Docker Context Path**: `.`  *(the repo root — required for the workspace deps)*

## 4. Environment variables

In the **Environment** tab, add (see [`.env.example`](./.env.example)):

| Variable             | Example                                             | Notes                                            |
| -------------------- | --------------------------------------------------- | ------------------------------------------------ |
| `DATABASE_URL`       | `postgresql://…@…neon.tech/…?sslmode=require`        | Neon connection string                           |
| `BETTER_AUTH_SECRET` | output of `openssl rand -base64 32`                 | **≥ 32 chars**                                   |
| `BETTER_AUTH_URL`    | `https://api.your-domain.com`                        | Public URL of this backend                       |
| `CORS_ORIGIN`        | `https://app.your-domain.com`                        | Your web frontend origin                         |
| `NODE_ENV`           | `production`                                         | already defaulted in the image                   |
| `PORT`               | `3000`                                               | already defaulted in the image                   |

> The server validates these at startup and **exits immediately** if any is
> missing or invalid — check the deploy logs if the container won't stay up.

## 5. Domain & port

In the **Domains** tab:

- **Add Domain**: `api.your-domain.com`
- **Container Port**: `3000`
- **HTTPS**: enabled (Let's Encrypt).

HTTPS is **required**: Better-Auth issues cookies with `SameSite=None; Secure`,
which browsers only accept over TLS. Dokploy's Traefik handles the certificate.

## 6. Deploy

Click **Deploy**. When it's up:

```bash
curl https://api.your-domain.com/        # -> OK
```

Auth lives under `/api/auth/*` and the tRPC API under `/trpc/*`.

## Notes

- **Auto-deploy**: enable the Dokploy GitHub webhook to redeploy on push to `main`.
- **Frontend wiring**: point the web/desktop client's API base URL at
  `https://api.your-domain.com` (and make sure that origin is your `CORS_ORIGIN`).
- **Local image test**:
  ```bash
  docker build -f apps/server/Dockerfile -t valotrak-server .
  docker run --rm -p 3000:3000 --env-file apps/server/.env valotrak-server
  ```
