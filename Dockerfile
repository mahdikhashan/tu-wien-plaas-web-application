FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
COPY views ./views

RUN npm run build

# Make the SQL schema available beside the compiled app.
RUN cp src/schema.sql dist/schema.sql

# Remove development dependencies.
RUN npm prune --omit=dev

# Production stage
FROM node:22-alpine AS production

ENV NODE_ENV=production
WORKDIR /app

COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/views ./views

USER node

EXPOSE 3000

CMD ["node", "dist/app.js"]
