# <img src="public/logo/transparent_logo.webp" alt="APIRadar Logo" width="40" valign="middle" /> APIRadar

Scans public GitHub repos in real time for leaked API keys using regex pattern matching and entropy filters. APIRadar monitors code search queries and live commit diffs, encrypts confirmed secrets with AES-256-GCM, and displays redacted findings on a Next.js dashboard.

_Note: APIRadar has migrated from `apiradar.live` to [`apiradar.bot.nu`](https://apiradar.bot.nu)._

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-16.1-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Fastify](https://img.shields.io/badge/Fastify-4.29-000000?style=for-the-badge&logo=fastify&logoColor=white)](https://www.fastify.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.0-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.3-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

---

## Table of Contents

- [How Secret Detection Works](#how-secret-detection-works)
- [Supported Providers](#supported-providers)
- [Getting Started](#getting-started)
- [Adding a New Provider](#adding-a-new-provider)
- [Security & Data Encryption](#security--data-encryption)
- [Contributing](#contributing)
- [Disclaimer](#disclaimer)
- [License](#license)

---

## How Secret Detection Works

APIRadar filters candidate strings through a 6-stage validation pipeline: **RegEx trigger matching**, **prefix/suffix sanitization**, **placeholder keyword filtering**, **[Shannon Entropy](<https://en.wikipedia.org/wiki/Entropy_(information_theory)>) calculation ($H \ge 2.5$)**, and **[trigram Markov model](https://en.wikipedia.org/wiki/Markov_chain) scoring**.

The trigram Markov model (`model.json`) was custom-trained on the [Google 10,000 English Corpus](https://github.com/first20hours/google-10000-english) to calculate letter transition probabilities and eliminate natural language false positives.

---

## Supported Providers

APIRadar monitors leaked secrets across **OpenAI**, **Anthropic**, **Google Gemini**, **OpenRouter**, **xAI (Grok)**, **Groq**, **Cerebras**, **Slack Tokens & Webhooks**, **Discord Tokens & Webhooks**, and **Telegram Bot Tokens** _(stats as of September 6, 2026)_.

![APIRadar Supported Providers Dashboard](public/screenshots/providers.png)

---

## Getting Started

### Prerequisites

- **[Node.js](https://nodejs.org/)**: v18.0.0 or higher
- **[MongoDB](https://www.mongodb.com/)**: v6.0 or higher
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
   git clone https://github.com/zaim-abbasi/API-Radar.git
   cd API-Radar
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

1. **Add matching rule** in [backend/src/services/RegexRouter.ts](file:///d:/Projects/Summers/APIRadar/backend/src/services/RegexRouter.ts):

```typescript
{
  name: 'cohere',
  label: 'Cohere',
  regex: /\b(cohere_[a-zA-Z0-9]{32,64})\b/,
  prefixes: ['cohere_']
}
```

2. **Strip static prefixes** in [backend/src/services/apiKeyValidator.ts](file:///d:/Projects/Summers/APIRadar/backend/src/services/apiKeyValidator.ts):

```typescript
secretPart = secretPart.replace(/^cohere_/, "");
```

3. **Register UI constants** in [lib/constants.ts](file:///d:/Projects/Summers/APIRadar/lib/constants.ts):

```typescript
export const PROVIDER_NAMES = ['cohere', ...] as const;
export const PROVIDER_LABELS = [{ value: 'cohere', label: 'Cohere' }, ...] as const;
```

Run `cd backend && npm run build && npm run test` to verify your changes.

---

## Security & Data Encryption

- **[AES-256-GCM](https://nodejs.org/api/crypto.html#crypto_crypto_createcipheriv_algorithm_key_iv_options)**: Full keys are encrypted at rest using AES-256-GCM with a unique IV and auth tag (`iv:authTag:ciphertext`).
- **Decoupled schema**:
  - `Secret` collection stores the SHA-256 `keyHash` and `encryptedKey`.
  - `Leak` collection stores public repository metadata and references `secretId`.

---

## Contributing

To contribute a new provider, bug fix, or feature:

1. Fork the repo and create a feature branch (`git checkout -b feature/my-changes`).
2. Format (`npm run format`) and lint (`npm run lint`).
3. Confirm the backend builds (`cd backend && npm run build`).
4. Submit a Pull Request.

---

## Disclaimer

This software is intended solely for security research, defensive monitoring, and educational purposes. The authors and maintainers assume no responsibility or liability for how this software is deployed or used, nor for any damages, security incidents, unauthorized access, API billing charges, or data breaches resulting from its operation.

Users are solely responsible for ensuring compliance with applicable laws, third-party terms of service (including GitHub API policies), and security regulations when hosting or executing APIRadar.

---

## License

Distributed under the MIT License. See [LICENSE](file:///d:/Projects/Summers/APIRadar/LICENSE) for details.
