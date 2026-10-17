# Build context MUST be atlas_multiplayer, not standalone/ or repository root.
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --omit=optional --ignore-scripts --no-audit --no-fund
COPY rooms.mjs server.mjs ./
COPY shared ./shared
COPY client ./client
COPY standalone/server.mjs standalone/http.mjs standalone/world.mjs standalone/controller.mjs standalone/host.mjs ./standalone/
COPY standalone/public ./standalone/public
USER node
EXPOSE 8080
CMD ["node", "standalone/server.mjs"]
