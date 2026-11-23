# Landing DABLIU: build de Angular (prerender estático) servido por nginx.
# Pensado para Dokploy en el VPS: Traefik pone el HTTPS delante y reenvía al puerto 80.

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist/dabliu-web/browser /usr/share/nginx/html
EXPOSE 80
