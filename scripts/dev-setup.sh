#!/bin/bash

# Orderly Development Setup Script
set -e

echo "🏗️  Setting up Orderly development environment..."

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Build shared types
echo "🔧 Building shared types..."
cd shared/types
npm install
npm run build
cd ../..

# Setup backend services
echo "🖥️  Setting up backend services..."

# API Gateway
cd backend/api-gateway
npm install
cd ../..

# User Service  
cd backend/user-service
npm install
cp .env.example .env
echo "📊 Setting up database..."
npx prisma generate
cd ../..

# Setup frontend
echo "🎨 Setting up frontend..."
cd frontend
npm install
cp .env.example .env
cd ..

# Create logs directory
mkdir -p backend/api-gateway/logs

echo "✅ Development environment setup complete!"
echo ""
echo "🚀 To start the development environment:"
echo "   1. Start services: docker-compose up -d postgres redis"
echo "   2. Run migrations: cd backend/user-service && npx prisma migrate dev"
echo "   3. Start dev servers: npm run dev"
echo ""
echo "🌐 Frontend will be available at: http://localhost:5173"
echo "🔗 API Gateway will be available at: http://localhost:3000"