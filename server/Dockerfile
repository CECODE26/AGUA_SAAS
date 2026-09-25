FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate

EXPOSE 3001

# Aplica las migraciones pendientes (nunca borra datos), carga el seed y arranca.
# Antes usaba "prisma db push --accept-data-loss", que podía borrar columnas.
CMD ["sh", "-c", "npx prisma migrate deploy && node prisma/seed.js && node index.js"]
