FROM node:23.8-slim

WORKDIR /usr/src/app

RUN apt-get update && apt-get install -y --no-install-recommends \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

RUN chmod +x start.sh

EXPOSE 3000

ENTRYPOINT ["/bin/sh", "./start.sh"]