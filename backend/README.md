# API Radar Backend

Backend API for API Radar - Real-time API key leak monitoring using Fastify, MongoDB, and TruffleHog.

## Prerequisites

- Node.js (v18 or higher)
- Python (v3.8 or higher) - Required for TruffleHog
- MongoDB Atlas account

## Backend Setup Instructions

### 1. Install Node.js Dependencies

```bash
npm install
```

### 2. Set Up Python Virtual Environment for TruffleHog

Create the Python virtual environment:

```bash
python -m venv trufflehog-venv
```

Activate the virtual environment:

**macOS/Linux:**
```bash
source trufflehog-venv/bin/activate
```

**Windows (PowerShell):**
```powershell
.\trufflehog-venv\Scripts\Activate.ps1
```

Install TruffleHog:

```bash
pip install -r requirements.txt
```

### 3. Environment Configuration

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
SCAN_INTERVAL_MINUTES=30
MAX_REPOS_PER_SCAN=10

# Rate Limiting Configuration
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=900000
```

See `ENVIRONMENT_SETUP.md` for detailed variable descriptions.

## Starting the Backend

### Important: Activate TruffleHog Virtual Environment First

**Before starting the backend, ensure the TruffleHog virtual environment is activated:**

**macOS/Linux:**
```bash
source trufflehog-venv/bin/activate
```

**Windows (PowerShell):**
```powershell
.\trufflehog-venv\Scripts\Activate.ps1
```

### Start Development Server

```bash
npm run dev
```

The backend will:
- Validate environment variables
- Check for TruffleHog installation in the virtual environment (as an executable)
- Connect to MongoDB
- Start the Fastify server
- Initialize the leak scanning scheduler

### Production Build

```bash
npm run build
npm start
```

## TruffleHog Usage (Manual)

If you want to test TruffleHog manually from the venv:

**macOS/Linux:**
```bash
./trufflehog-venv/bin/trufflehog --help
```

**Windows:**
```powershell
.\trufflehog-venv\Scripts\trufflehog.exe --help
```

> **Note:** TruffleHog 2.x does not support `--version`. Running with no arguments or `--help` will show usage info.

## API Endpoints

- `GET /api/health` - Health check endpoint
- `GET /api/leaks` - Get discovered API key leaks
- `GET /api/providers` - Get supported API providers
- `GET /api/leaderboard` - Get leaderboard data
- `GET /api/learn` - Get learning resources

## Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier

### Project Structure

```
src/
├── config/          # Configuration files
├── controllers/     # Request handlers
├── models/          # MongoDB models
├── routes/          # API routes
├── scheduler/       # Background job scheduler
├── services/        # Business logic services
├── utils/           # Utility functions
└── server.ts        # Main server file
```

## Troubleshooting

### TruffleHog Not Found Error

If you see the error:
```
[FATAL][TRUFFLEHOG] TruffleHog is not installed or venv not activated
```

1. Ensure the virtual environment is activated:
   - **macOS/Linux:** `source trufflehog-venv/bin/activate`
   - **Windows (PowerShell):** `.\trufflehog-venv\Scripts\Activate.ps1`
2. Verify TruffleHog is installed:
   - **macOS/Linux:** `./trufflehog-venv/bin/trufflehog --help`
   - **Windows:** `.\trufflehog-venv\Scripts\trufflehog.exe --help`
3. If not installed, run:
   ```bash
   pip install -r requirements.txt
   ```

### MongoDB Connection Issues

- Verify your MongoDB URI is correct
- Ensure your IP is whitelisted in MongoDB Atlas
- Check network connectivity

### GitHub API Rate Limiting

- Verify your GitHub token has appropriate permissions
- Monitor rate limit usage in the logs
- Consider using a GitHub App for higher rate limits

## Deployment

### VPS Deployment

1. Clone the repository
2. Follow the setup instructions above
3. Set `NODE_ENV=production` in your environment
4. Use a process manager like PM2:
   ```bash
   npm install -g pm2
   pm2 start dist/server.js --name api-radar-backend
   ```

### Environment Variables

Ensure all required environment variables are set in production:
- `MONGODB_URI`
- `GITHUB_TOKEN`
- `NODE_ENV=production`

## License

MIT 