# syntax=docker/dockerfile:1
#
# Frontend de IT Service & Demand Manager:
#   1. build:   compila la SPA con Node (tsc + vite build) → dist/
#   2. runtime: nginx sirve dist/ y hace de proxy inverso hacia los dos servicios.

# ---------- Etapa 1: compilación ----------
FROM node:22-alpine AS build
WORKDIR /app

# Dependencias primero: capa en caché mientras no cambie el lockfile.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------- Etapa 2: servidor ----------
FROM nginx:1.27-alpine

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
