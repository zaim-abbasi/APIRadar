"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  AlertTriangle, 
  Eye, 
  Lock, 
  FileText, 
  GitBranch,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from '@/components/ui/accordion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

const learningSections = [
  {
    id: 'what-are-leaks',
    title: 'What are API Key Leaks?',
    icon: AlertTriangle,
    content: `API key leaks occur when sensitive authentication credentials are accidentally exposed in public repositories, code snippets, or documentation. These keys can provide unauthorized access to paid services, user data, or system resources.

Common types of leaked keys include:
• OpenAI API keys (sk-...)
• Anthropic API keys (sk-ant-...)
• Google AI API keys (AIzaSy...)
• Cohere API keys`
  },
  {
    id: 'how-leaks-happen',
    title: 'How Do Leaks Happen?',
    icon: Eye,
    content: `API key leaks typically occur through several common scenarios:

1. Direct Code Commits
Developers accidentally commit files containing hardcoded API keys, environment files, or configuration with sensitive credentials.

2. Public Configuration Files
Committing .env files, config.json, or similar files that contain production secrets meant for local development only.

3. Documentation & Comments
Including example API keys in README files, code comments, or documentation that use real credentials instead of placeholder values.

4. Testing & Debugging
Temporary code changes that include real API keys for testing purposes, then forgotten and committed to version control.

5. CI/CD Pipelines
Build logs, deployment scripts, or CI configuration files that inadvertently expose environment variables containing API keys.`
  },
  {
    id: 'best-practices',
    title: 'Best Practices for API Key Security',
    icon: Shield,
    content: `Protect your API keys with these best practices:

<strong>Environment Variables</strong>
• Store all secrets in environment variables, never in code
• Use .env files for local development (add to .gitignore)
• Use secure secret management in production

<strong>Code Review Process</strong>
• Implement mandatory code reviews before merging
• Use automated scanning tools in your CI/CD pipeline
• Train team members to identify potential security issues

<strong>Git Hooks & Tools</strong>
• Set up pre-commit hooks to scan for secrets
• Use tools like git-secrets, detect-secrets, or truffleHog
• Configure your IDE to highlight potential secrets

<strong>Access Controls</strong>
• Rotate API keys regularly
• Use the principle of least privilege
• Implement key scoping when available
• Monitor API key usage and set up alerts`
  },
  {
    id: 'what-to-do',
    title: 'What to Do If You Leak a Key',
    icon: AlertTriangle,
    content: `If you accidentally expose an API key, act quickly:

<strong>Immediate Actions (within minutes):</strong>
1. Revoke the key immediately - Disable it in the service provider's dashboard
2. Generate a new key - Create a replacement with appropriate permissions
3. Update your applications - Deploy the new key to all environments
4. Remove the key from git history - Use git filter-branch or BFG Repo-Cleaner

<strong>Investigation & Monitoring:</strong>
• Check service logs for any unauthorized usage
• Monitor billing/usage for unexpected charges
• Review access logs and audit trails
• Document the incident for future prevention

<strong>Communication:</strong>
• Notify your team and security personnel
• If customer data may be affected, follow disclosure procedures
• Update your incident response playbook

<strong>Long-term Improvements:</strong>
• Analyze how the leak occurred
• Implement additional safeguards
• Provide team training on secure coding practices
• Consider implementing secret scanning tools`
  },
  {
    id: 'secure-storage',
    title: 'Secure Storage Solutions',
    icon: Lock,
    content: `Modern approaches to secure secret management:

<strong>Cloud Secret Managers:</strong>
• AWS Secrets Manager / Parameter Store
• Google Cloud Secret Manager
• Azure Key Vault
• HashiCorp Vault

<strong>Environment-Based Solutions:</strong>
• Docker secrets
• Kubernetes secrets
• Platform-specific environment variables (Vercel, Netlify, etc.)

<strong>Development Tools:</strong>
• direnv for local environment management
• dotenv libraries for application runtime
• Development-specific secret stores

<strong>Best Practices:</strong>
• Encrypt secrets at rest and in transit
• Implement proper access controls and auditing
• Use temporary/scoped credentials when possible
• Regularly rotate all secrets
• Never log or cache secrets in plain text`
  }
].filter(section => section.id !== 'tools-resources');

const goodPractices = [
  {
    title: 'Use Environment Variables',
    description: 'Store all secrets in environment variables, never hardcode in source code',
    example: 'process.env.OPENAI_API_KEY',
    isGood: true
  },
  {
    title: 'Hardcoded API Keys',
    description: 'Never put API keys directly in your source code',
    example: 'const apiKey = "sk-1234567890abcdef"',
    isGood: false
  },
  {
    title: 'Proper .gitignore',
    description: 'Always add .env and config files to .gitignore',
    example: '.env\nconfig.json\nsecrets.yaml',
    isGood: true
  },
  {
    title: 'Committing .env Files',
    description: 'Never commit .env files or configuration with real secrets',
    example: 'git add .env',
    isGood: false
  }
];

const LearnPageComponent = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="mb-8 text-center"
      >
        <h1 className="text-3xl md:text-4xl font-bold mb-4">
          Learn API Security
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Master the art of keeping your API keys secure. Learn from real-world examples 
          and implement bulletproof security practices.
        </p>
      </motion.div>

      {/* Alert */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1, ease: 'easeOut' }}
        className="mb-8"
      >
        <Alert className="border-orange-500/50 bg-orange-500/10">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          <AlertDescription className="text-orange-800 dark:text-orange-200">
            <strong>Security Alert:</strong> Over 4,000 API keys are leaked every week. 
            Don't let yours be next. Learn how to protect your applications.
          </AlertDescription>
        </Alert>
      </motion.div>

      {/* Good vs Bad Practices */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15, ease: 'easeOut' }}
        className="mb-8"
      >
        <h2 className="text-2xl font-bold text-center mb-6">Good vs Bad Practices</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {goodPractices.map((practice, index) => (
            <motion.div
              key={practice.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.05, duration: 0.2, ease: 'easeOut' }}
              className="group"
            >
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm h-full hover:bg-card/80 transition-colors duration-300">
                <CardHeader className="flex flex-row items-center gap-4">
                  {practice.isGood ? 
                    <CheckCircle className="h-6 w-6 text-green-500 shrink-0" /> :
                    <XCircle className="h-6 w-6 text-red-500 shrink-0" />
                  }
                  <CardTitle className="text-lg group-hover:text-primary transition-colors">
                    {practice.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">{practice.description}</p>
                  <pre className="p-3 rounded-md bg-muted/50 text-xs font-mono">
                    <code>{practice.example}</code>
                  </pre>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Learning Sections */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.25, ease: 'easeOut' }}
        className="mt-12"
      >
        <h2 className="text-2xl font-bold text-center mb-8">
          Key Security Concepts
        </h2>
        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="w-full">
            {learningSections.map((section, index) => (
              <AccordionItem key={section.id} value={section.id}>
                <AccordionTrigger className="text-left text-lg hover:text-primary transition-colors">
                  <div className="flex items-center gap-3">
                    <section.icon className="h-5 w-5 text-primary/80" />
                    <span>{section.title}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-base text-muted-foreground leading-relaxed px-2">
                  <div 
                    dangerouslySetInnerHTML={{ __html: section.content }}
                    className="whitespace-pre-wrap"
                  />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </motion.div>
    </div>
  );
}

export default React.memo(LearnPageComponent);