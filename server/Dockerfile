FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate

EXPOSE 3001

# Migra, carga seed y arranca el servidor
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node prisma/seed.js && node index.js"]
