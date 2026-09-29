# Build the static bundle.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run check && npm run build

# Serve it with nginx, which also proxies /api/ to local_printer_api.
FROM nginxinc/nginx-unprivileged:1.29-alpine
ENV PRINTER_API_UPSTREAM=http://192.168.100.99:8000
COPY deploy/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
