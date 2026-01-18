export const FARM_CONSTANTS = {
  SEARCH: {
    PER_PAGE: 10,
    MAX_PAGE: 100,
    PAGE_CONCURRENCY: 5,
    RETRY_BASE_DELAY: 2000,
    RETRY_MAX_DELAY: 30000,
    JITTER_FACTOR: 0.3
  },
  SCAN: {
    IDLE_LOG_INTERVAL: 60000,
    TOKEN_REFRESH_INTERVAL: 300000,
    TOKEN_STATE_LOG_INTERVAL: 60000,
    RECENT_SCAN_THRESHOLD: 604800000,
    CONFIG_CHECK_INTERVAL: 30000
  },
  LIMITS: {
    MAX_FILE_SIZE_BYTES: 1048576,
    ABUSE_WAIT_TIME: 60000,
    RATE_LIMIT_BUFFER: 1000,
    FATAL_ERROR_WINDOW: 3600000,
    MAX_FATAL_ERRORS: 10,
    RECOVERY_WAIT: 5000,
    REQUEST_ABORT: 30000,
    DB_WRITE: 30000,
    DB_READ: 10000,
    REQUEST: 15000
  },
  CACHE: {
    TTL_SCANNED: 86400000,
    TTL_COMMIT: 86400000,
    SIZE_SCANNED: 10000,
    SIZE_COMMIT: 5000,
    CLEANUP_INTERVAL: 30000
  },
  CONCURRENCY: {
    FILE_MIN: 5,
    FILE_MAX: 30,
    REPO_MIN: 3,
    REPO_MAX: 10
  },
  PATTERNS: {
    IGNORED_DIRS: ['.git', 'node_modules', 'vendor', 'dist', 'build'],
    HIGH_RISK_FILES: [
      '.env', '.env.local', '.env.development', '.env.production', '.env.test',
      'config.json', 'config.yaml', 'config.yml', 'secrets.json', 'secrets.yaml', 'secrets.yml',
      'appsettings.json', 'application.yml', 'application.yaml', 'database.yml',
      'secret.json', 'secret.yaml', 'secret.yml', 'credentials.json', 'credentials.yaml', 'credentials.yml',
      'docker-compose.yml', 'docker-compose.yaml', 'Dockerfile',
      '.gitlab-ci.yml', 'Jenkinsfile', '.circleci/config.yml',
      'deployment.yml', 'deployment.yaml', 'k8s.yml', 'k8s.yaml',
      'main.tf', 'variables.tf', 'terraform.tfvars',
      'config.js', 'config.ts', 'next.config.js', 'next.config.ts', 'vite.config.js', 'vite.config.ts',
      'nuxt.config.js', 'nuxt.config.ts', 'settings.py', 'config.py', 'wp-config.php'
    ]
  }
};
