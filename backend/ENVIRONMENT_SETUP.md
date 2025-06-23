# Environment Setup

This document describes the required environment variables for the API Radar backend.

## Required Environment Variables

Create a `.env` file in the backend directory with the following variables:

```env
# Environment Configuration
NODE_ENV=development

# Server Configuration
PORT=3001

# MongoDB Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority

# GitHub API Configuration
GITHUB_TOKEN=ghp_your_github_token_here

# Scanning Configuration
TRUFFLEHOG_PATH=trufflehog
SCAN_INTERVAL_MINUTES=30
MAX_REPOS_PER_SCAN=10

# Redis Configuration (Optional)
# REDIS_URL=redis://localhost:6379

# Rate Limiting Configuration
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=900000
```

## Variable Descriptions

### Required Variables

- **NODE_ENV**: Environment mode (`development`, `production`, or `test`)
- **PORT**: Server port number (1-65535)
- **MONGODB_URI**: MongoDB Atlas connection string
- **GITHUB_TOKEN**: GitHub Personal Access Token (must start with `ghp_` or `github_pat_`)

### Optional Variables

- **TRUFFLEHOG_PATH**: Path to trufflehog binary (default: `trufflehog`)
- **SCAN_INTERVAL_MINUTES**: Minutes between scans (1-1440, default: 30)
- **MAX_REPOS_PER_SCAN**: Maximum repositories per scan (1-1000, default: 10)
- **REDIS_URL**: Redis connection URL (optional)
- **RATE_LIMIT_MAX**: Maximum requests per window (default: 100)
- **RATE_LIMIT_WINDOW**: Rate limit window in milliseconds (default: 900000)

## Validation

The application validates all environment variables on startup and will exit with helpful error messages if any required variables are missing or invalid.

## Getting Started

1. Copy the environment variables above
2. Create a `.env` file in the backend directory
3. Fill in your actual values for MongoDB URI and GitHub token
4. Run `npm run dev` to start the development server

## Health Check

Once running, you can verify the setup by calling the health endpoint:

```bash
curl http://localhost:3001/api/health
```

Expected response:
```json
{
  "status": "ok",
  "uptime": 123,
  "timestamp": "2024-01-01T12:00:00.000Z",
  "services": {
    "mongodb": "connected"
  }
}
``` 