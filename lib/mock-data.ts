import { LeakedKey, ProviderStats, LeaderboardData } from '@/types';

const generateMockLeaks = (): LeakedKey[] => {
  const providers = ['openai', 'anthropic', 'google-ai', 'cohere'];
  const repoNames = [
    'awesome-chatbot', 'generative-art-api', 'ai-powered-search', 'claude-discord-bot',
    'email-summarizer', 'ai-playground', 'serverless-rag', 'mobile-app-backend',
    'web-scraper', 'data-pipeline', 'microservice-auth', 'notification-system'
  ];
  const authors = [
    'john-dev', 'sarah-codes', 'alex-builds', 'maria-tech', 'dave-scripts',
    'jen-dev', 'mike-codes', 'lisa-builds', 'tom-dev', 'anna-tech'
  ];

  const leaks: LeakedKey[] = [];
  
  for (let i = 0; i < 50; i++) {
    const provider = providers[Math.floor(Math.random() * providers.length)];
    const repoName = repoNames[Math.floor(Math.random() * repoNames.length)];
    const author = authors[Math.floor(Math.random() * authors.length)];
    
    let redactedKey = '';
    switch (provider) {
      case 'openai':
        redactedKey = `sk-****${Math.random().toString(36).substring(7)}`;
        break;
      case 'anthropic':
        redactedKey = `sk-ant-****${Math.random().toString(36).substring(7)}`;
        break;
      case 'google-ai':
        redactedKey = `AIzaSy****${Math.random().toString(36).substring(7)}`;
        break;
      case 'cohere':
        redactedKey = `****${Math.random().toString(36).substring(7)}`;
        break;
      default:
        redactedKey = `****${Math.random().toString(36).substring(7)}`;
    }

    leaks.push({
      id: `leak_${i}`,
      redacted_key: redactedKey,
      provider,
      repo_name: repoName,
      repo_url: `https://github.com/${author}/${repoName}`,
      author_name: author,
      author_url: `https://github.com/${author}`,
      timestamp: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
      file_path: `src/${Math.random() > 0.5 ? 'config' : 'utils'}/keys.${Math.random() > 0.5 ? 'js' : 'py'}`,
      commit_hash: Math.random().toString(36).substring(2, 9)
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