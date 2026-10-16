FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --ignore-scripts --no-audit --no-fund
COPY rooms.mjs server.mjs ./
USER node
EXPOSE 8080
CMD ["node", "server.mjs"]
