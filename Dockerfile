# Base Node image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install openssl (required by Prisma)
RUN apk add --no-cache openssl

# Copy package.json and Prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY . .

# Build TypeScript code
RUN npm run build

# Expose API port
EXPOSE 3000

# Start command
CMD ["npm", "start"]
