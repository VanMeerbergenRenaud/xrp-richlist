FROM node:20-alpine

# Installe les dépendances système nécessaires
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++ \
    linux-headers

WORKDIR /app

# Variables d'environnement
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_SHARP=0

# Copie et installe les dépendances
COPY package.json package-lock.json* ./
# Utilise npm ci si le lockfile est présent, sinon fallback npm install
# (npm ci échouera s'il n'y a pas de lockfile, ce qui est OK en dev)
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copie le code source
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]