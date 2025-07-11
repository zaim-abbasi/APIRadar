# 🛡️ API Radar

> **Find and track leaked API keys on GitHub.**
>
> Real-time scanning, advanced detection, and a modern dashboard for security teams and developers.

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.3-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Fastify](https://img.shields.io/badge/Fastify-4.29-000000?style=for-the-badge&logo=fastify&logoColor=white)](https://www.fastify.io/)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.0-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

---

## 📚 Contents

- [About](#about)
- [Features](#features)
- [Screenshots](#️-screenshots)
- [Architecture](#architecture)
- [Setup](#setup)
- [Security](#security)
- [Contributing](#contributing)

---

## 📝 About

API Radar is a large, multi-component system. It scans GitHub for secrets, detects leaks, and tracks everything in a database. The frontend lets you explore leaks, see stats, and learn about security. The backend is built for speed, reliability, and scale.

---

## ✨ Features

- Parallel code search queries (multi-token, rate-limited)
- Regex and entropy-based secret detection (OpenAI, Google, Anthropic, Mistral, Cohere, and more)
- Deduplication and scan tracking
- Redacted keys by default; secure full-key endpoint
- Full audit logging
- Modern frontend: real-time explorer, leaderboard
- Built with Fastify, MongoDB, TypeScript, Next.js, Tailwind CSS

---

## 🖼️ Screenshots

### Home Page

![Home Page](public/screenshots/HomePage.png)

---

### Explore Page

![Explore Page](public/screenshots/ExplorePage.png)

---

## 🏗️ Architecture

```mermaid
flowchart TD
  A["GitHub Code Search (REST API)"] --> B["Code Leak Farm Service"]
  B --> C["Regex & Entropy Detection"]
  C --> D{"Secret Found?"}
  D -- "Yes" --> E["Deduplication (scanattempts)"]
  E -- "Not Duplicate" --> F["Store Leak (leaks, redacted & full key)"]
  E -- "Duplicate" --> G["Log Scan Attempt"]
  F --> H["Redacted Key API"]
  F --> I["Full Key API (secure)"]
  H --> J["Frontend: Explore, Leaderboard"]
  I --> K["Frontend: Copy Key Button"]
  G --> L["Comprehensive Logging"]
  F --> L
  B --> L
  C --> L
```

---

## 🚀 Setup

**Prerequisites:**

- Node.js 18+
- MongoDB
- GitHub Personal Access Token (with code search scope)

**Install & Run:**

```bash
# Clone and install
git clone https://github.com/yourusername/api-radar.git
cd api-radar
npm install

# Start frontend
npm run dev

# Start backend
cd backend
npm install
npm run dev
```

**.env Example:**

```env
NODE_ENV=development
PORT=3001
MONGODB_URI=mongodb://localhost:27017/api-radar
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_TOKENS=token1,token2,token3
MAX_REPOS_PER_SCAN=10
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=900000
GITHUB_RATE_LIMIT_DELAY=1000
```

---

## 🔒 Security

- Only redacted keys are shown in the UI and API by default
- Full keys are available only through a secure endpoint (`/api/leaks/:id/fullkey`)
- No secrets are logged or exposed in public APIs
- Every scan and leak is logged for audit

---

## 🤝 Contributing

- PRs, issues, and feature requests are welcome
- See [CONTRIBUTING.md](CONTRIBUTING.md) for details
- All code must pass linting, tests, and review

## SEO Backlinks & Monitoring Checklist

### Backlinks Strategy
- Submit API Radar to developer directories (Product Hunt, Dev.to, Indie Hackers, etc.)
- Write guest posts or tutorials on tech blogs and link back to https://apiradar.live
- Share on social media (Twitter, LinkedIn, Reddit, Hacker News)
- Engage in relevant forums (Stack Overflow, GitHub Discussions) and include your link in your profile or signature
- Ask partners, friends, or satisfied users to link to your site

### Monitoring & Analytics
- Set up Google Search Console for https://apiradar.live
- Submit your sitemap: https://apiradar.live/sitemap.xml
- Set up Google Analytics for traffic monitoring
- Regularly check Google Search Console for crawl errors and performance
- Use Google PageSpeed Insights to monitor and optimize site speed

---
