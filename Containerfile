# Podman-friendly: fully qualified image names, rootless-safe non-root user.
# One image; one container runs both apps (land-air :8001, sea :8002).
#   podman build -t wildcam .
FROM docker.io/library/node:26-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
COPY views ./views

RUN npm run build

# Make the SQL schema available beside the compiled apps.
RUN cp src/schema.sql dist/schema.sql

RUN npm prune --omit=dev

FROM docker.io/library/node:26-alpine AS production

ENV NODE_ENV=production
WORKDIR /app

COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/views ./views

USER node

EXPOSE 8001 8002

CMD ["node", "dist/main.js"]
