# Plataforma interna DABLIU: build de Angular servido por nginx.
# En Dokploy, app.dabliusoluciones.tech va a este contenedor y app.dabliusoluciones.tech/api al backend
# (dominio con ruta /api en el servicio del backend), así la sesión por cookies queda en el mismo dominio.

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist/dabliu-app/browser /usr/share/nginx/html
EXPOSE 80
