FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY contracts ./contracts
COPY scripts/deployer.js ./scripts/deployer.js

CMD ["node", "scripts/deployer.js"]
