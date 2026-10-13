# NERDS uc Wild Cam

## Local Development (HTTP)

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

## Production (HTTPS)

### 1. Configure DNS and Firewall

- Point your domain's `A` record to the production VM's public IP.
- Allow inbound TCP ports `80` and `443` through your firewall/router.
- Set `APP_DOMAIN` and `ACME_EMAIL` in `.env`.
- Set `DATABASE_URL` to your production PostgreSQL VM.

Let's Encrypt HTTP validation requires port 80 to be reachable. [Documentation](https://letsencrypt.org/docs/challenge-types/)

### 2. Start the Application

```bash
docker compose up -d --build
```

Open `https://YOUR_DOMAIN`

Traefik automatically obtains and renews the HTTPS certificate.

### 3. Scale to 3 App Containers

```bash
docker compose up -d --build --scale app=3
```

### 4. Check Status and Logs

```bash
docker compose ps
docker compose logs -f app
docker compose logs -f traefik
```

### 5. Stop Production

```bash
docker compose down
```