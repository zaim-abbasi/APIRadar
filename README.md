<h1 align="center">
  <img src="logos/icons/transparent_logo.webp" alt="APIRadar Logo" width="75" valign="middle" style="vertical-align: middle; margin-right: 12px; background: transparent; border: none;" /> APIRadar — Real-Time Leaked API Key Scanner
</h1>

<p align="center">
  Scans public GitHub repositories in real time for leaked API keys using regex pattern matching and entropy filters, displaying redacted findings on a Next.js dashboard.
</p>

<p align="center">
  <a href="https://apiradar.bot.nu/" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/Live_Demo-apiradar.bot.nu-F59E0B?style=for-the-badge&logo=google-chrome&logoColor=white" alt="Live Demo" /></a>
  <a href="https://github.com/zaim-abbasi/APIRadar/stargazers" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/github/stars/zaim-abbasi/APIRadar?style=for-the-badge&logo=github&color=10B981" alt="GitHub Stars" /></a>
  <a href="https://www.producthunt.com/products/api-radar/launches/api-radar-2" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/Product_Hunt-Featured-DA552F?style=for-the-badge&logo=product-hunt&logoColor=white" alt="Product Hunt" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="License: MIT" /></a>
</p>

<p align="center">
  <a href="https://nextjs.org/" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" /></a>
  <a href="https://www.fastify.io/" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/Fastify-000000?style=for-the-badge&logo=fastify&logoColor=white" alt="Fastify" /></a>
  <a href="https://www.typescriptlang.org/" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="https://www.mongodb.com/" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" /></a>
  <a href="https://tailwindcss.com/" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" /></a>
  <a href="https://twitter.com/intent/tweet?text=APIRadar%20%E2%80%94%20Real-time%20leaked%20API%20key%20scanner%20for%20public%20GitHub%20repos.&url=https://github.com/zaim-abbasi/APIRadar&hashtags=opensource,security,nextjs,typescript" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/Share-Tweet_Project-1DA1F2?style=for-the-badge&logo=x&logoColor=white" alt="Tweet Project" /></a>
</p>

<p align="center">
  <i>Note: APIRadar has migrated from <code>apiradar.live</code> to <a href="https://apiradar.bot.nu/" target="_blank" rel="noopener noreferrer">apiradar.bot.nu</a>.</i>
</p>

<br />

<p align="center">
  <img src="public/screenshots/homepage.png" alt="APIRadar Real-Time Threat Radar Homepage" width="100%" />
  <br />
  <sub><i>Note: All dashboard screenshots and telemetry statistics reflect live data as of September 6, 2026.</i></sub>
</p>

---

## Table of Contents

- [How Secret Detection Works](#how-secret-detection-works)
- [Supported Providers](#supported-providers)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Setup](#environment-setup)
  - [Installation & Running](#installation--running)
- [Adding a New Provider](#adding-a-new-provider)
- [Contributing](#contributing)
- [Disclaimer](#disclaimer)
- [License](#license)

---

## How Secret Detection Works

APIRadar candidate strings are validated through a 6-stage pipeline: **RegEx trigger matching** ([RegexRouter.ts](backend/src/services/RegexRouter.ts)), **prefix/suffix sanitization**, **placeholder keyword filtering**, **[Shannon Entropy](https://en.wikipedia.org/wiki/Entropy_(information_theory)) calculation ($H \ge 2.5$)**, and **[trigram Markov model](https://en.wikipedia.org/wiki/Markov_chain) scoring** ([apiKeyValidator.ts](backend/src/services/apiKeyValidator.ts)).

The trigram Markov model (`model.json`) was custom-trained on the [Google 10,000 English Corpus](https://github.com/first20hours/google-10000-english) to calculate letter transition probabilities and eliminate natural language false positives.

---

## Supported Providers

APIRadar monitors leaked secrets across **OpenAI**, **Anthropic**, **Google Gemini**, **OpenRouter**, **xAI (Grok)**, **Groq**, **Cerebras**, **Slack Tokens & Webhooks**, **Discord Tokens & Webhooks**, and **Telegram Bot Tokens**.

<p align="center">
  <img src="public/screenshots/explore.png" alt="APIRadar Credential Exposures & Supported Providers Dashboard" width="100%" />
</p>

> [!TIP]
> **Want to monitor a custom secret format?** APIRadar is fully extensible. See [Adding a New Provider](#adding-a-new-provider) below to register custom regex rules in 3 simple steps.

---

## Getting Started

### Prerequisites

- **[Node.js](https://nodejs.org/)**: v18.0.0 or higher
- **[MongoDB](https://www.mongodb.com/docs/manual/installation/)**: v6.0 or higher
- **GitHub App**: App ID & RSA Private Key. See [GitHub Docs: Registering a GitHub App](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app) to create one.

---

### Environment Setup

Create `.env` files in the root and `backend/` directories:

#### Root `.env`

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here
```

#### Backend `backend/.env`

```env
PORT=3001
NODE_ENV=development

MONGODB_URI=mongodb://localhost:27017/apiradar

NEXTAUTH_SECRET=your_nextauth_secret_here
ENCRYPTION_KEY=your_32_character_encryption_key

RATE_LIMIT_MAX=300
RATE_LIMIT_WINDOW=60000
CORS_ORIGINS=http://localhost:3000

GITHUB_APP_ID=your_github_app_id
GITHUB_APP_CLIENT_ID=your_github_app_client_id
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n"
# GITHUB_APP_PRIVATE_KEY_PATH=keys/github-app.private-key.pem
```

---

### Installation & Running

1. **Clone the repository**:

   ```bash
   git clone https://github.com/zaim-abbasi/APIRadar.git
   cd APIRadar
   ```

2. **Install dependencies**:

   ```bash
   npm install
   cd backend && npm install && cd ..
   ```

3. **Start development server (Frontend + Backend)**:

   ```bash
   npm run dev:all
   ```

   - Frontend UI: `http://localhost:3000`
   - Backend API: `http://localhost:3001`

---

## Adding a New Provider

To add a provider, update three files:

1. **Add matching rule** in [backend/src/services/RegexRouter.ts](backend/src/services/RegexRouter.ts):

```typescript
{
  name: 'cohere',                         // Unique provider ID (lowercase)
  label: 'Cohere',                       // UI display label
  regex: /\b(cohere_[a-zA-Z0-9]{32,64})\b/, // Use \b word boundaries to prevent false positives
  prefixes: ['cohere_']                  // Static search prefix strings for Code Search
}
```

2. **Strip static prefixes** in [backend/src/services/apiKeyValidator.ts](backend/src/services/apiKeyValidator.ts):

```typescript
secretPart = secretPart.replace(/^cohere_/, ""); // Strips fixed prefix so entropy & Markov scoring evaluate raw key randomness
```

3. **Register UI constants** in [lib/constants.ts](lib/constants.ts):

```typescript
export const PROVIDER_NAMES = ['cohere', ...] as const;
export const PROVIDER_LABELS = [{ value: 'cohere', label: 'Cohere' }, ...] as const;
```

Run `cd backend && npm run build && npm run test` to verify your changes.

---

## Contributing

Contributions are welcome! Whether you are adding new API provider regex patterns, improving detection algorithms, or submitting UI enhancements:

1. Browse open issues or look for tags like [`good first issue`](https://github.com/zaim-abbasi/APIRadar/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) and [`help wanted`](https://github.com/zaim-abbasi/APIRadar/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22).
2. Fork the repo and create a feature branch (`git checkout -b feature/my-changes`).
3. Format (`npm run format`) and lint (`npm run lint`).
4. Confirm the backend builds (`cd backend && npm run build`).
5. Submit a [Pull Request](https://github.com/zaim-abbasi/APIRadar/pulls).

If you find APIRadar useful, consider starring the repository to help other security researchers and developers discover it.

---

## Disclaimer

This software is intended solely for security research, defensive monitoring, and educational purposes. The authors and maintainers assume no responsibility or liability for how this software is deployed or used, nor for any damages, security incidents, unauthorized access, API billing charges, or data breaches resulting from its operation.

Users are solely responsible for ensuring compliance with applicable laws, third-party terms of service (including GitHub API policies), and security regulations when hosting or executing APIRadar.

---

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.
