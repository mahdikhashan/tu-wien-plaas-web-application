# tu-wien-plaas-web-application

## Local Development

```bash
npm install
docker compose -f compose.dev.yaml up -d --build
```

Open http://localhost:3000

View logs:

```bash
docker compose -f compose.dev.yaml logs -f app
```

Scale to 3 app containers:

```bash
docker compose -f compose.dev.yaml up -d --build --scale app=3
```

Stop:

```bash
docker compose -f compose.dev.yaml down
```

## Production

Configure `.env` with your domain, email, and PostgreSQL connection string.

Build and start:

```bash
docker compose up -d --build
```

Scale to 3 app containers:

```bash
docker compose up -d --build --scale app=3
```

View logs:

```bash
docker compose logs -f app
docker compose logs -f traefik
```

Check status:

```bash
docker compose ps
```

Stop:

```bash
docker compose down
```