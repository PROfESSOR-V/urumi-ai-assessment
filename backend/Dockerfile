FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src

# Build TypeScript to JavaScript
RUN npm install -g typescript
RUN tsc

EXPOSE 3000

CMD ["node", "dist/server.js"]
