# --- Build stage ---
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

# --- Runtime stage ---
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
# If you kept the Postgres driver, add: RUN npx prisma generate --schema=src/shared/db/postgres/schema.prisma
RUN npm ci --omit=dev --legacy-peer-deps
COPY --from=build /app/dist ./dist
EXPOSE 5000
USER node
CMD ["node", "dist/server.js"]
