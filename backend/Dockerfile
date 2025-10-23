FROM node:23.8-alpine3.20

WORKDIR /usr/src/app

RUN apk add --no-cache netcat-openbsd

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

RUN chmod +x start.sh

EXPOSE 3000

ENTRYPOINT ["/bin/sh", "./start.sh"]