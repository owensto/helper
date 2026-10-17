FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
# Deliberately fails closed until a real npm-generated lockfile is committed.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --omit=optional --ignore-scripts --no-audit --no-fund
COPY rooms.mjs server.mjs ./
COPY shared ./shared
USER node
EXPOSE 8080
CMD ["node", "server.mjs"]
