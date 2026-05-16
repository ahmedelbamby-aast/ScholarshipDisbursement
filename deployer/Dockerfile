FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY contracts ./contracts
COPY config ./config
COPY scripts/deployer.js ./scripts/deployer.js

CMD ["node", "scripts/deployer.js"]
