# API Radar Backend

## Scan State Persistence

The scanning service now automatically saves its progress to the database (`configurations` collection). This ensures that scanning progress is preserved even when the service is stopped with Ctrl+C or crashes.

### How It Works

- **Automatic Saving**: The scan state is saved before each major operation (query processing, page requests, rate limit pauses)
- **Database Storage**: `configurations` collection with key `scan_state`
- **State Information**: 
  - `currentProviderIndex`: Which provider is being processed (0-2 for openai, google_gemini, anthropic)
  - `currentQueryIndex`: Which search query is being processed (0-49, etc.)
  - `currentPage`: Which page of results is being processed (1, 2, 3, etc.)
  - `lastProcessedTime`: Timestamp of last activity
  - `providerStates`: Individual state for each provider
  - `scanStatus`: Current status of the scan

### Benefits

- ✅ **Survives Ctrl+C**: Progress is preserved when you stop the service
- ✅ **Survives crashes**: State is saved before each operation
- ✅ **Survives restarts**: Automatically resumes from where it left off
- ✅ **Rate limit resilience**: State is saved before rate limit pauses
- ✅ **Database persistence**: More reliable than file-based storage
- ✅ **Multi-provider support**: Tracks state for each AI provider separately

### Manual Management

#### Clear Scan State (Reset to Beginning)
```bash
# Use the API endpoint to clear state
curl -X POST http://localhost:3001/api/config/scan-state \
  -H "Content-Type: application/json" \
  -d '{
    "scanState": {
      "currentProviderIndex": 0,
      "currentQueryIndex": 0,
      "currentPage": 1,
      "lastProcessedTime": 1703123456789,
      "providerStates": {
        "openai": { "queryIndex": 0, "page": 1 },
        "google_gemini": { "queryIndex": 0, "page": 1 },
        "anthropic": { "queryIndex": 0, "page": 1 }
      },
      "scanStatus": "idle"
    }
  }'
```

#### View Current State
```bash
# Check the current state via API
curl http://localhost:3001/api/config/scan-state
```

#### Force Reinitialize Configurations
```bash
# Force reinitialize all configurations with fresh defaults
curl -X POST http://localhost:3001/api/config/reinitialize
```

### Automatic Recovery

The backend automatically detects when configurations are missing and recreates them:

- **Periodic Check**: Every 30 seconds, the system checks if configurations exist
- **Auto-Recovery**: If configurations are missing, they are automatically recreated with:
  - Cutoff date = one month before today
  - Scan state = start from page 1 for all providers
- **Logging**: You'll see `[FARM] Configuration was missing and has been reinitialized` in the logs
- **Seamless Operation**: The scanning continues normally after recovery

### Log Messages

You'll see these messages in the logs:

- `[FARM] Scan state saved: provider 1, query 15, page 7` - State saved
- `[FARM] Resuming scan: provider 1, query 15, page 7` - Resuming from database
- `[FARM] Scan state cleared from database` - State cleared
- `[FARM] Invalid state format in database, resetting to beginning` - Fallback to defaults

### Database Schema

The `scan_state` configuration contains:
```json
{
  "currentProviderIndex": 1,
  "currentQueryIndex": 15,
  "currentPage": 7,
  "lastProcessedTime": 1703123456789,
  "providerStates": {
    "openai": { "queryIndex": 0, "page": 1 },
    "google_gemini": { "queryIndex": 15, "page": 7 },
    "anthropic": { "queryIndex": 0, "page": 1 }
  },
  "scanStatus": "scanning"
}
```

### Notes

- The state is automatically initialized on first startup with default values
- If the database is unavailable, the system will use default values
- The system validates state format and resets if invalid
- State is saved both to database and memory for redundancy
- API endpoints are available for state management at `/api/config/scan-state` 