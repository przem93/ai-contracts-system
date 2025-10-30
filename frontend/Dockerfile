FROM node:23.8-alpine3.20

WORKDIR /usr/src/app

# Copy package files only - npm install will happen at runtime
COPY package*.json ./
COPY start.sh ./

# Make start.sh executable
RUN chmod +x start.sh

EXPOSE 80

CMD ["sh", "./start.sh"]