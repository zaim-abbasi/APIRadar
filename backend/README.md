# API Radar Backend

## Scan State Persistence

The scanning service now automatically saves its progress to a file (`scan-state.json`) in the backend directory. This ensures that scanning progress is preserved even when the service is stopped with Ctrl+C or crashes.

### How It Works

- **Automatic Saving**: The scan state is saved before each major operation (query processing, page requests, rate limit pauses)
- **File Location**: `backend/scan-state.json`
- **State Information**: 
  - `currentQueryIndex`: Which search query is being processed (0-49, etc.)
  - `currentPage`: Which page of results is being processed (1, 2, 3, etc.)
  - `lastProcessedTime`: Timestamp of last activity
  - `savedAt`: When the state was last saved

### Benefits

- ✅ **Survives Ctrl+C**: Progress is preserved when you stop the service
- ✅ **Survives crashes**: State is saved before each operation
- ✅ **Survives restarts**: Automatically resumes from where it left off
- ✅ **Rate limit resilience**: State is saved before rate limit pauses

### Manual Management

#### Clear Scan State (Reset to Beginning)
```bash
# Manually delete the state file
rm backend/scan-state.json
```

#### View Current State
```bash
# Check the state file
cat backend/scan-state.json
```

### Log Messages

You'll see these messages in the logs:

- `[FARM] Scan state saved to file: query 15, page 7` - State saved
- `[FARM] Resuming scan from file: query 15, page 7` - Resuming from file
- `[FARM] Resuming scan from memory: query 15, page 7` - Fallback to memory
- `[FARM] Scan state cleared, will start from beginning on next restart` - State cleared

### File Format

The `scan-state.json` file contains:
```json
{
  "currentQueryIndex": 15,
  "currentPage": 7,
  "lastProcessedTime": 1703123456789,
  "savedAt": "2023-12-21T10:30:56.789Z"
}
```

### Notes

- The state file is automatically ignored by git (added to `.gitignore`)
- If the state file is corrupted or invalid, the system will reset to the beginning
- The system falls back to memory state if the file doesn't exist
- State is saved both to file and memory for redundancy
- This is an internal tool - no external API endpoints are exposed for state management 