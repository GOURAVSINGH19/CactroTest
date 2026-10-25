FROM node:22-slim

RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .
ENV NODE_ENV=production
RUN npm run build

EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
