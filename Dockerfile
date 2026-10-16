# Imagen de producción de Handyman (sirve para Render, Railway, Fly.io o cualquier host con Docker).
FROM node:20-slim

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci --include=dev --no-audit --no-fund

COPY . .
RUN npm run build

ENV NODE_ENV=production
# Base PGlite y archivos subidos. Monta aquí un volumen persistente si el host lo permite;
# sin volumen, los datos vuelven al estado demo inicial cada vez que el servicio se reinicia.
ENV HANDYMAN_DATA_DIR=/data
RUN mkdir -p /data

EXPOSE 3000
CMD ["sh", "-c", "npx next start -H 0.0.0.0 -p ${PORT:-3000}"]
