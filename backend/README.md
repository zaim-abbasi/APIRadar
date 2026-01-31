# APIRadar Backend

## GitHub Issue Creation for New Leaks

The backend now automatically creates GitHub issues in repositories where new API key leaks are detected. This feature helps repository owners become aware of potential security issues.

### How It Works

- **Automatic Detection**: When a new leak is detected (not an update to an existing leak), the system creates a GitHub issue
- **Smart Deduplication**: Only creates one issue per repository per provider to avoid spam
- **Friendly Messages**: Uses randomized, human-like messages that mention APIRadar as the detection tool
- **Error Handling**: Gracefully handles cases where issues are disabled, repos are archived, or permissions are denied

### Configuration

Add the following environment variable to your `.env` file:

```bash
# GitHub token for creating issues (different from scanning token)
ISSUE_GITHUB_TOKEN=ghp_your_personal_github_token_here
```

**Important Notes:**
- This should be a **different token** from your main `GITHUB_TOKEN` used for scanning
- Use your **personal GitHub account** token, not a bot account
- The token needs `public_repo` scope for public repositories
- If not set, the feature will be disabled (no issues created)

### Message Templates

The system uses 6 randomized templates to keep messages natural and varied:

1. **Friendly**: "Hey there! 👋 We noticed what looks like a leaked [provider] API key..."
2. **Alert**: "Hi! 🚨 We detected a potential [provider] API key leak..."
3. **Casual**: "Hello! 👀 Quick heads-up: we found what appears to be a [provider] API key..."
4. **Security-focused**: "Hi! 🔍 We spotted a [provider] API key that looks like it might be exposed..."
5. **Warning**: "Hey! ⚠️ Just wanted to let you know we found a [provider] API key..."
6. **Professional**: "Hello there! 🎯 We detected a [provider] API key that looks like it might be accidentally exposed..."

All messages:
- Mention the specific provider (OpenAI, Anthropic, etc.)
- Include the file path if available
- Include the APIRadar website link (https://apiradar.live)
- Provide contact email (zaim.k.abbasi@gmail.com) for questions
- Include the `api-radar-alert` label
- Use friendly, helpful tone without being spammy

### Error Handling

The system gracefully handles various scenarios:
- **Issues Disabled**: Repository has issues disabled → No issue created, no error
- **Archived Repo**: Repository is archived → No issue created, no error  
- **Permission Denied**: No access to create issues → No issue created, no error
- **Private Repos**: Private repositories → No issue created (requires different permissions)
- **Rate Limits**: GitHub API rate limits → Handled automatically

### Database Schema

The `Leak` model remains unchanged - no additional fields were added for this feature:

```typescript
interface ILeak {
  // ... existing fields (no commitHash field)
}
```

### Logging

You'll see these messages in the logs:
- `Created issue in owner/repo for provider` - Issue created successfully
- `Failed to create issue in owner/repo: [error]` - Issue creation failed (logged but doesn't stop scanning)

## Scan State Persistence

The scanning service now automatically saves its progress to the database (`configurations` collection). This ensures that scanning progress is preserved even when the service is stopped with Ctrl+C or crashes.

### How It Works

- **Automatic Saving**: The scan state is saved before each major operation (query processing, page requests, rate limit pauses)
- **Database Storage**: `configurations` collection with key `scan_state`
- **State Information**: 
  - `currentProviderIndex`: Which provider is being processed (0-2 for openai, google, anthropic)
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
        "google": { "queryIndex": 0, "page": 1 },
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
    "google": { "queryIndex": 15, "page": 7 },
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