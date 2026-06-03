FROM node:20-alpine

WORKDIR /app

# Install dependencies from package.json only
COPY package*.json ./
RUN npm ci --only=production

# Copy source files
COPY . .

EXPOSE 5000

CMD ["npm", "start"]
