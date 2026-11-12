# NERDS uc Wild Cam

Logs wildlife sightings from live streams (animal, time, stream) in PostgreSQL.
Stateless: run any number of replicas behind a load balancer against one database.

## Image

Built by GitHub Actions on every push to `main` and published as
`ghcr.io/mahdikhashan/tu-wien-plaas-web-application:latest` (linux/amd64).

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

## Run

```bash
docker run -d --name wildcam --restart unless-stopped -p 8000:8000 \
  -e DB_HOST=192.168.100.10 -e DB_PORT=5432 \
  -e DB_NAME=wildcam -e DB_USER=wildcam -e DB_PASSWORD=... \
  ghcr.io/mahdikhashan/tu-wien-plaas-web-application:latest
```

## Local test

```bash
docker network create wildcam-net

docker run -d --name wildcam-db --network wildcam-net \
  -e POSTGRES_DB=wildcam -e POSTGRES_USER=wildcam -e POSTGRES_PASSWORD=secret \
  postgres:16

docker build -t wildcam .
docker run -d --name wildcam-app --network wildcam-net -p 8000:8000 \
  -e DB_HOST=wildcam-db -e DB_NAME=wildcam -e DB_USER=wildcam -e DB_PASSWORD=secret \
  wildcam

curl -i http://localhost:8000/                                   # 200
curl -i -d animal=Fox -d stream=cam1 -d observed_at=2026-01-01T12:00 \
  http://localhost:8000/observations                             # 303 Location: /
curl -s http://localhost:8000/ | grep -E 'Fox|Served by'         # entry + hostname

docker rm -f wildcam-app wildcam-db && docker network rm wildcam-net
```
