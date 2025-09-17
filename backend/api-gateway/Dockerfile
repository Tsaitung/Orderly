FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY ../../shared/types/package.json ../../shared/types/

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Create logs directory
RUN mkdir -p logs

EXPOSE 3000

CMD ["npm", "start"]