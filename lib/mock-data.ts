import { LeakedKey, ProviderStats, LeaderboardData } from '@/types';

const generateMockLeaks = (): LeakedKey[] => {
  const leaks: LeakedKey[] = [];
  const providers = ['openai', 'google-gemini', 'anthropic', 'mistral-ai', 'cohere'];
  const authors = ['john-doe', 'jane-smith', 'dev-team', 'open-source', 'startup-xyz'];
  const repoNames = ['api-client', 'backend-service', 'mobile-app', 'web-dashboard', 'ml-model'];

  for (let i = 0; i < 50; i++) {
    const provider = providers[Math.floor(Math.random() * providers.length)];
    const author = authors[Math.floor(Math.random() * authors.length)];
    const repoName = repoNames[Math.floor(Math.random() * repoNames.length)];
    
    let redactedKey: string;
    switch (provider) {
      case 'openai':
        redactedKey = 'sk-****' + Math.random().toString(36).substring(2, 10);
        break;
      case 'google-gemini':
        redactedKey = 'AIza****' + Math.random().toString(36).substring(2, 10);
        break;
      case 'anthropic':
        redactedKey = 'x-api-key=****' + Math.random().toString(36).substring(2, 10);
        break;
      case 'mistral-ai':
        redactedKey = 'Mistral****' + Math.random().toString(36).substring(2, 10);
        break;
      default:
        redactedKey = 'cohere****' + Math.random().toString(36).substring(2, 10);
    }

    const repoCreatedAt = new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000);
    const leakDetectedAt = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);

    leaks.push({
      id: `leak_${i}`,
      redacted_key: redactedKey,
      provider,
      repo_url: `https://github.com/${author}/${repoName}`,
      file_path: `src/${Math.random() > 0.5 ? 'config' : 'utils'}/keys.${Math.random() > 0.5 ? 'js' : 'py'}`,
      timestamp: leakDetectedAt.toISOString(),
      repo_created_at: repoCreatedAt.toISOString(),
      leak_detected_at: leakDetectedAt.toISOString()
    });
  }

  return leaks.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const mockLeaks = generateMockLeaks();

export const mockLeaderboard: LeaderboardData = {
  topProviders: [
    { provider: 'openai', count: 1247, percentage: 45.3, trend: 'up' },
    { provider: 'anthropic', count: 892, percentage: 32.4, trend: 'up' },
    { provider: 'google-ai', count: 432, percentage: 15.7, trend: 'down' },
    { provider: 'cohere', count: 178, percentage: 6.5, trend: 'stable' },
  ],
  totalLeaks: 2749,
  todayLeaks: 89,
  weeklyGrowth: 12.1
};