# Two stages: the first builds everything, the second holds only what runs.

# Stage 1: install, build, and drop the development dependencies
FROM node:24-slim AS build
WORKDIR /app

# The package files first, so the install layer is reused until a dependency changes
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci

COPY tsconfig.base.json ./
COPY shared shared
COPY server server
COPY client client
RUN npm run build && npm prune --omit=dev

# Stage 2: the running app, as the unprivileged "node" user the image provides
FROM node:24-slim
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules node_modules
COPY --from=build --chown=node:node /app/shared/package.json shared/package.json
COPY --from=build --chown=node:node /app/shared/dist shared/dist
COPY --from=build --chown=node:node /app/server/package.json server/package.json
COPY --from=build --chown=node:node /app/server/dist server/dist
# The vehicle data, which the server reads at startup
COPY --from=build --chown=node:node /app/server/data server/data
# The built page, which the server serves from client/dist
COPY --from=build --chown=node:node /app/client/dist client/dist

USER node
EXPOSE 3000

# Healthy once the API answers
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD ["node", "-e", "fetch('http://localhost:' + (process.env.PORT || 3000) + '/api/makes').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]

CMD ["node", "server/dist/index.js"]
