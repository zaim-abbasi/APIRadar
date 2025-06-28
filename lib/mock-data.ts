import { LeakedKey, ProviderStats, LeaderboardData } from '@/types';

const generateMockLeaks = (): LeakedKey[] => {
  const leaks: LeakedKey[] = [];
  const providers = ['openai', 'anthropic', 'google'];
  const providerRepos: Record<string, string[]> = {
    openai: [
      'openai/openai-python',
      'openai/openai-cookbook',
      'openai/openai-node',
      'openai/gym',
      'openai/whisper',
    ],
    anthropic: [
      'anthropics/anthropic-sdk-python',
      'anthropics/anthropic-sdk-js',
      'anthropics/anthropic-examples',
      'anthropics/claude-api',
      'anthropics/anthropic-docs',
    ],
    google: [
      'googleapis/google-api-python-client',
      'googleapis/google-api-nodejs-client',
      'google/gemini-api',
      'googleapis/google-cloud-go',
      'googleapis/google-cloud-java',
    ],
  };

  // Use recent timestamps (within last 30 days)
  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000;
  const baseTime = now.getTime() - (30 * oneDay); // Start from 30 days ago

  for (let i = 0; i < 50; i++) {
    const provider = providers[i % providers.length];
    const repoList = providerRepos[provider];
    const repoFullName = repoList[i % repoList.length];
    
    let redactedKey: string;
    switch (provider) {
      case 'openai':
        redactedKey = `sk-****${i.toString().padStart(8, '0')}`;
        break;
      case 'google':
        redactedKey = `AIza****${i.toString().padStart(8, '0')}`;
        break;
      case 'anthropic':
        redactedKey = `x-api-key=****${i.toString().padStart(8, '0')}`;
        break;
      default:
        redactedKey = `unknown****${i.toString().padStart(8, '0')}`;
    }

    // Distribute leaks over the last 30 days
    const leakDetectedAt = new Date(baseTime + (i * (30 * oneDay / 50)));
    const repoCreatedAt = new Date(leakDetectedAt.getTime() - ((i + 1) * 7 * oneDay)); // Repo created 1-7 weeks before leak

    const leak = {
      id: `leak_${i}`,
      redacted_key: redactedKey,
      provider,
      repo_url: `https://github.com/${repoFullName}`,
      file_path: `src/${i % 2 === 0 ? 'config' : 'utils'}/keys.${i % 2 === 0 ? 'js' : 'py'}`,
      timestamp: leakDetectedAt.toISOString(),
      repo_created_at: repoCreatedAt.toISOString(),
      leak_detected_at: leakDetectedAt.toISOString()
    };

    leaks.push(leak);
  }

  return leaks.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const mockLeaks = generateMockLeaks();

export const mockLeaderboard: LeaderboardData = {
  topProviders: [
    { provider: 'openai', count: 1247, percentage: 45.3, trend: 'up' },
    { provider: 'anthropic', count: 892, percentage: 32.4, trend: 'up' },
    { provider: 'google', count: 432, percentage: 15.7, trend: 'down' },
  ],
  totalLeaks: 2571,
  todayLeaks: 89,
  weeklyGrowth: 12.1
};