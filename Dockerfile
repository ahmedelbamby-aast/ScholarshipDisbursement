FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 3300

HEALTHCHECK --interval=10s --timeout=3s --retries=5 --start-period=10s \
  CMD wget -qO- "http://localhost:3300/health" || exit 1

CMD ["npm", "run", "start"]
