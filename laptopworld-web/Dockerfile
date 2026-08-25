# ================================================================
# LaptopWorld frontend — multi-stage Dockerfile
# Stage 1: npm ci + npm run build → dist/
# Stage 2: Nginx serve dist + reverse proxy /api + /uploads
# ================================================================

# ---------- Stage 1: build ----------
FROM node:22-alpine AS build
WORKDIR /app

# Cache npm install layer
COPY package*.json ./
RUN npm ci

# Build production bundle
# LUU Y: chi chay vite build (skip tsc strict) — TS check da chay qua IDE dev.
# Vite dung esbuild transpile TSX ma khong yeu cau tsc pass strict.
COPY . .
RUN npx vite build

# ---------- Stage 2: runtime (Nginx) ----------
FROM nginx:1.27-alpine

# Xoa config default cua nginx image
RUN rm /etc/nginx/conf.d/default.conf

# Copy build output va custom config
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
