# NERDS uc Wild Cam

Two apps (land & air animals, sea animals) that log wildlife sightings from live streams (animal, time, stream) in PostgreSQL.
Stateless: run any number of replicas behind a load balancer against one database.

## Image

One image, built by GitHub Actions on every push to `main` and published as
`ghcr.io/mahdikhashan/tu-wien-plaas-web-application:latest` (linux/amd64).
A single container runs both apps: land & air animals on port `8001`, sea animals
on port `8002`. They share one database, each with its own table
(`observations_land_air`, `observations_sea`).

## Environment variables

| Variable      | Required | Default | Description            |
|---------------|----------|---------|------------------------|
| `DB_HOST`     | yes      |         | PostgreSQL host        |
| `DB_PORT`     | no       | `5432`  | PostgreSQL port        |
| `DB_NAME`     | yes      |         | Database name          |
| `DB_USER`     | yes      |         | Database user          |
| `DB_PASSWORD` | yes      |         | Database password      |
| `LAND_AIR_PORT` | no     | `8001`  | Port of the land & air app |
| `SEA_PORT`    | no       | `8002`  | Port of the sea app    |

The table is created on startup. If the database is unreachable, the app retries
with backoff (up to 30s between attempts).

## Run (Podman, rootless)

```bash
podman run -d --name wildcam --restart unless-stopped -p 8001:8001 -p 8002:8002 \
  --env-file .env \
  ghcr.io/mahdikhashan/tu-wien-plaas-web-application:latest
```

Route in Traefik by host (or path prefix with strip-prefix): one router to container
port 8001, one to 8002. Both expose `/heartbeat`.

## Local test

```bash
podman network create wildcam-net
podman run -d --name wildcam-db --network wildcam-net \
  -e POSTGRES_DB=wildcam -e POSTGRES_USER=wildcam -e POSTGRES_PASSWORD=secret \
  docker.io/library/postgres:16

podman build -t wildcam -f Containerfile .
podman run -d --name wildcam-app --network wildcam-net -p 8001:8001 -p 8002:8002 \
  -e DB_HOST=wildcam-db -e DB_NAME=wildcam -e DB_USER=wildcam -e DB_PASSWORD=secret wildcam

curl -i -d animal=Fox -d stream=cam1 -d observed_at=2026-01-01T12:00 http://localhost:8001/observations
curl -i -d animal=Orca -d stream=cam2 -d observed_at=2026-01-01T12:00 http://localhost:8002/observations

podman rm -f wildcam-app wildcam-db && podman network rm wildcam-net
```
