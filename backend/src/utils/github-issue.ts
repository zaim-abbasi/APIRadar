import axios from 'axios';

const ISSUE_LABEL = 'api-radar-alert';

// Function to format provider names properly
function formatProviderName(provider: string): string {
  const providerMap: { [key: string]: string } = {
    'openai': 'OpenAI',
    'google_gemini': 'Google',
    'anthropic': 'Anthropic'
  };
  
  return providerMap[provider.toLowerCase()] || provider;
}

const templates = [
  ({ provider, filePath }: { provider: string; filePath?: string }) => `
Hey there! 👋

We noticed what looks like a leaked ${formatProviderName(provider)} API key${filePath ? ` in the file \`${filePath}\`` : ''} in your repository. It was likely added recently and might still be active.

This was flagged by [API Radar](https://apiradar.live) — a tool that scans public GitHub repos for accidental key exposure. Just wanted to give you a heads-up so you can revoke/rotate it if needed.

If you have any questions or want to learn more about our security scanning service, feel free to reach out at zaim.k.abbasi@gmail.com.

Hope this helps keep your project secure! 🔒
  `.trim(),
  
  ({ provider, filePath }: { provider: string; filePath?: string }) => `
Hi! 🚨

We detected a potential ${formatProviderName(provider)} API key leak${filePath ? ` in the file \`${filePath}\`` : ''} in your repository. This could be a security concern if the key is still active.

Our tool [API Radar](https://apiradar.live) automatically scans public repos for exposed credentials. You might want to check if this key needs to be rotated or revoked.

For more info about our security scanning service, check out https://apiradar.live or email us at zaim.k.abbasi@gmail.com.

Stay secure! 🔒
  `.trim(),
  
  ({ provider, filePath }: { provider: string; filePath?: string }) => `
Hello! 👀

Quick heads-up: we found what appears to be a ${formatProviderName(provider)} API key exposed${filePath ? ` in \`${filePath}\`` : ''} in your repo.

[API Radar](https://apiradar.live) picked this up during our routine security scans. If this is a real key, you'll probably want to rotate it for safety.

Questions? Reach out at zaim.k.abbasi@gmail.com or visit https://apiradar.live to learn more about our service.

Cheers! ✨
  `.trim(),
  
  ({ provider, filePath }: { provider: string; filePath?: string }) => `
Hi! 🔍

We spotted a ${formatProviderName(provider)} API key${filePath ? ` in \`${filePath}\`` : ''} that looks like it might be exposed in your repository.

This was detected by [API Radar](https://apiradar.live), our security scanning tool. If this is a real API key, you'll want to rotate it ASAP to keep your project secure.

Want to learn more about our security scanning service? Check out https://apiradar.live or drop us a line at zaim.k.abbasi@gmail.com.

Stay safe! 🛡️
  `.trim(),
  
  ({ provider, filePath }: { provider: string; filePath?: string }) => `
Hey! ⚠️

Just wanted to let you know we found a ${formatProviderName(provider)} API key${filePath ? ` in \`${filePath}\`` : ''} that appears to be exposed in your repository.

[API Radar](https://apiradar.live) caught this during our security scans. If it's a real key, definitely worth rotating it to keep things secure.

Curious about our scanning service? Visit https://apiradar.live or email zaim.k.abbasi@gmail.com for more details.

Best regards! 🙏
  `.trim(),
  
  ({ provider, filePath }: { provider: string; filePath?: string }) => `
Hello there! 🎯

We detected a ${formatProviderName(provider)} API key${filePath ? ` in the file \`${filePath}\`` : ''} that looks like it might be accidentally exposed in your repository.

This was flagged by [API Radar](https://apiradar.live), our automated security scanner. If this is an active key, you'll want to revoke and rotate it.

Interested in learning more about our security scanning? Head to https://apiradar.live or contact us at zaim.k.abbasi@gmail.com.

Keep coding safely! 💻
  `.trim(),
];

function getRandomTemplate(data: { provider: string; filePath?: string }) {
  const idx = Math.floor(Math.random() * templates.length);
  const template = templates[idx];
  if (!template) {
    // Fallback to first template if somehow idx is out of bounds
    const fallbackTemplate = templates[0];
    if (!fallbackTemplate) {
      throw new Error('No templates available');
    }
    return fallbackTemplate(data);
  }
  return template(data);
}

export async function createLeakIssue({
  repo,
  provider,
  token,
  filePath,
}: {
  repo: string;
  provider: string;
  token: string;
  filePath?: string;
}) {
  const [owner, repoName] = repo.split('/');
  const apiBase = `https://api.github.com/repos/${owner}/${repoName}`;

  // 1. Check for existing open issues with our label and provider in the title/body
  try {
    const { data: issues } = await axios.get(
      `${apiBase}/issues?labels=${encodeURIComponent(ISSUE_LABEL)}&state=open`,
      { headers: { Authorization: `token ${token}` } }
    );
    const alreadyReported = issues.some(
      (issue: any) =>
        issue.title.includes(provider) ||
        (issue.body && issue.body.includes(provider))
    );
    if (alreadyReported) return; // Don't spam
  } catch (err) {
    // If we can't check, fail silently (don't create issue)
    // This could be due to permissions, archived repo, issues disabled, etc.
    return;
  }

  // 2. Create the issue
  const title = `Potential ${formatProviderName(provider)} API key leak detected`;
  const templateData = { provider };
  if (filePath) {
    (templateData as any).filePath = filePath;
  }
  const body = getRandomTemplate(templateData);

  try {
    await axios.post(
      `${apiBase}/issues`,
      {
        title,
        body,
        labels: [ISSUE_LABEL],
      },
      { headers: { Authorization: `token ${token}` } }
    );
    console.log(`Created issue in ${repo} for ${provider}`);
  } catch (err: any) {
    // Log and swallow errors (e.g., permission denied, archived repo, issues disabled, etc.)
    // This is expected behavior for many repos, so we don't want to spam logs
    if (err?.response?.status === 404) {
      // Repo not found or issues disabled
      return;
    }
    if (err?.response?.status === 403) {
      // Permission denied
      return;
    }
    if (err?.response?.status === 410) {
      // Repository archived
      return;
    }
    // For other errors, log but don't throw
    console.error(`Failed to create issue in ${repo}:`, err?.response?.data || err.message);
  }
} 