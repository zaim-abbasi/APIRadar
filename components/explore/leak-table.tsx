"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { 
  Copy, 
  ExternalLink, 
  Calendar, 
  User, 
  FileText, 
  GitCommit,
  Check
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LeakedKey, Provider } from '@/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface LeakTableProps {
  leaks: LeakedKey[];
  isLoading?: boolean;
  selectedProvider: Provider;
}

const providerColors: Record<string, string> = {
  'openai': 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  'aws': 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  'stripe': 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
  'github': 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20',
  'google-cloud': 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  'discord': 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20',
  'twilio': 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
  'sendgrid': 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20',
};

export function LeakTable({ leaks, isLoading, selectedProvider }: LeakTableProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = async (text: string, keyId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(keyId);
      toast.success('Redacted key copied to clipboard');
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3">
                    <div className="h-6 w-20 bg-muted rounded-full" />
                    <div className="h-4 w-32 bg-muted rounded" />
                  </div>
                  <div className="h-4 w-3/4 bg-muted rounded" />
                  <div className="flex gap-4">
                    <div className="h-3 w-24 bg-muted rounded" />
                    <div className="h-3 w-32 bg-muted rounded" />
                  </div>
                </div>
                <div className="h-9 w-9 bg-muted rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (leaks.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12"
      >
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No leaks found</h3>
        <p className="text-muted-foreground">
          {selectedProvider === 'all' 
            ? "No leaked keys match your current filters."
            : `No leaked keys found for ${selectedProvider}.`
          }
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <AnimatePresence mode="popLayout">
        {leaks.map((leak, index) => (
          <motion.div
            key={leak.id}
            layout
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            transition={{
              duration: 0.2,
              delay: index * 0.03,
              ease: 'easeOut'
            }}
            whileHover={{ y: -4, scale: 1.02 }}
            className="group"
          >
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm transition-shadow duration-200 ease-out hover:shadow-lg hover:shadow-primary/5">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-3 flex-1 min-w-0">
                    {/* Provider & Key */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge
                        className={cn(
                          "font-mono text-xs font-medium border",
                          providerColors[leak.provider] || providerColors['github']
                        )}
                      >
                        {leak.provider}
                      </Badge>
                      <code className="text-sm font-mono bg-muted px-2 py-1 rounded text-muted-foreground group-hover:text-foreground transition-colors">
                        {leak.redacted_key}
                      </code>
                    </div>

                    {/* Repository Info */}
                    <div className="flex items-center gap-2 text-sm">
                      <a
                        href={leak.repo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-primary hover:underline flex items-center gap-1"
                      >
                        {leak.repo_name}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      <span className="text-muted-foreground">by</span>
                      <a
                        href={leak.author_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary flex items-center gap-1"
                      >
                        <User className="h-3 w-3" />
                        {leak.author_name}
                      </a>
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDistanceToNow(new Date(leak.timestamp), { addSuffix: true })}
                      </div>
                      {leak.file_path && (
                        <div className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          <code className="text-xs">{leak.file_path}</code>
                        </div>
                      )}
                      {leak.commit_hash && (
                        <div className="flex items-center gap-1">
                          <GitCommit className="h-3 w-3" />
                          <code className="text-xs">{leak.commit_hash}</code>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Copy Button */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyToClipboard(leak.redacted_key, leak.id)}
                          className="h-9 w-9 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <motion.div
                            key={copiedKey === leak.id ? 'copied' : 'copy'}
                            initial={{ scale: 0, rotate: -90 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          >
                            {copiedKey === leak.id ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </motion.div>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Copy redacted key</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}