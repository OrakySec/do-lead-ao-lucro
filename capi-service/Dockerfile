FROM node:20-alpine

WORKDIR /app

# Copia e instala dependências primeiro (melhor cache do Docker)
COPY package*.json ./
RUN npm ci --only=production

# Copia o código
COPY . .

EXPOSE 3000

CMD ["node", "index.js"]
