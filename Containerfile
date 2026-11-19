# Podman-friendly: fully qualified image names, rootless-safe non-root user.
# Build one image per app:
#   podman build --build-arg APP=land-air -t wildcam-land-air .
#   podman build --build-arg APP=sea      -t wildcam-sea .
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

ARG APP=land-air
ENV NODE_ENV=production \
    APP=${APP}
WORKDIR /app

COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/views ./views

USER node

EXPOSE 8000

# Shell form so $APP expands; exec keeps node as PID 1 for signal handling.
CMD ["sh", "-c", "exec node dist/${APP}.js"]
