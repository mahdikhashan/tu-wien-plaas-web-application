# NERDS uc Wild Cam

Two apps (land & air animals, sea animals) that log wildlife sightings from live streams (animal, time, stream) in PostgreSQL.
Stateless: run any number of replicas behind a load balancer against one database.

## Images

One `Containerfile`, built per app via `--build-arg APP=land-air|sea`. GitHub Actions
publishes on every push to `main` (linux/amd64):

- `ghcr.io/mahdikhashan/tu-wien-plaas-web-application-land-air:latest`
- `ghcr.io/mahdikhashan/tu-wien-plaas-web-application-sea:latest`

Both share one database; each uses its own table (`observations_land_air`, `observations_sea`).

## Environment variables

| Variable      | Required | Default | Description            |
|---------------|----------|---------|------------------------|
| `DB_HOST`     | yes      |         | PostgreSQL host        |
| `DB_PORT`     | no       | `5432`  | PostgreSQL port        |
| `DB_NAME`     | yes      |         | Database name          |
| `DB_USER`     | yes      |         | Database user          |
| `DB_PASSWORD` | yes      |         | Database password      |
| `PORT`        | no       | `8000`  | HTTP port the app uses |

The table is created on startup. If the database is unreachable, the app retries
with backoff (up to 30s between attempts).

## Run (Podman, rootless)

```bash
podman run -d --name wildcam-land-air --restart unless-stopped -p 8001:8000 \
  --env-file .env \
  ghcr.io/mahdikhashan/tu-wien-plaas-web-application-land-air:latest

podman run -d --name wildcam-sea --restart unless-stopped -p 8002:8000 \
  --env-file .env \
  ghcr.io/mahdikhashan/tu-wien-plaas-web-application-sea:latest
```

Route each app in Traefik by host (or path prefix with strip-prefix); both expose `/heartbeat`.

## Local test

```bash
podman network create wildcam-net
podman run -d --name wildcam-db --network wildcam-net \
  -e POSTGRES_DB=wildcam -e POSTGRES_USER=wildcam -e POSTGRES_PASSWORD=secret \
  docker.io/library/postgres:16

for app in land-air sea; do
  podman build --build-arg APP=$app -t wildcam-$app -f Containerfile .
done
podman run -d --name wc-land-air --network wildcam-net -p 8001:8000 \
  -e DB_HOST=wildcam-db -e DB_NAME=wildcam -e DB_USER=wildcam -e DB_PASSWORD=secret wildcam-land-air
podman run -d --name wc-sea --network wildcam-net -p 8002:8000 \
  -e DB_HOST=wildcam-db -e DB_NAME=wildcam -e DB_USER=wildcam -e DB_PASSWORD=secret wildcam-sea

curl -i -d animal=Fox -d stream=cam1 -d observed_at=2026-01-01T12:00 http://localhost:8001/observations
curl -i -d animal=Orca -d stream=cam2 -d observed_at=2026-01-01T12:00 http://localhost:8002/observations

podman rm -f wc-land-air wc-sea wildcam-db && podman network rm wildcam-net
```
