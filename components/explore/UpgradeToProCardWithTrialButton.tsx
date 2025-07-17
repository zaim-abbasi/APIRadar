import React from 'react';
import { usePlanCheck } from '@/hooks/use-plan-check';

interface UpgradeToProCardWithTrialButtonProps {
  session: any;
  onlyButton?: boolean;
  buttonClassName?: string;
}

export default function UpgradeToProCardWithTrialButton({ session, onlyButton = false, buttonClassName }: UpgradeToProCardWithTrialButtonProps) {
  const { plan, requestedTrial: hookRequestedTrial, refresh } = usePlanCheck();
  const [requestedTrial, setRequestedTrial] = React.useState<boolean>(!!session?.user?.requestedTrial);
  const isBasic = plan === 'basic';
  const [status, setStatus] = React.useState<'idle'|'submitting'|'success'|'error'>('idle');

  React.useEffect(() => {
    setRequestedTrial(!!hookRequestedTrial);
  }, [hookRequestedTrial]);

  async function handleRequest() {
    try {
      setStatus('submitting');
      const res = await fetch('/api/user/request-trial', { method: 'POST' });
      if (res.ok) {
        setStatus('success');
        setRequestedTrial(true);
        await refresh(); // refresh plan after upgrade
        // Immediately refresh status from API to ensure UI is up to date
        const statusRes = await fetch('/api/user/trial-status');
        if (statusRes.ok) {
          const data = await statusRes.json();
          setRequestedTrial(!!data.requestedTrial);
        }
      } else {
        throw new Error(`Request failed: ${res.status}`);
      }
    } catch (error) {
      console.error('Trial request failed:', error);
      setStatus('error');
    }
  }

  const button = isBasic && !requestedTrial ? (
    <button
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded bg-primary text-primary-foreground font-semibold shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-75 hover:bg-primary/90 ${buttonClassName}`}
      onClick={handleRequest}
      disabled={status === 'submitting'}
    >
      {status === 'submitting' ? 'Requesting...' : 'Request Pro Trial'}
    </button>
  ) : requestedTrial || status === 'success' ? (
    <span className="inline-block px-3 py-1 rounded bg-muted text-muted-foreground font-medium text-xs sm:text-sm">Pro trial request sent</span>
  ) : null;

  if (onlyButton) return button;

  return (
    <div className="group animate-fade-in-up opacity-0" style={{ animationDelay: `100ms` }}>
      <div className="border border-border/50 bg-card/50 backdrop-blur-sm rounded-lg">
        <div className="p-4 sm:p-6 flex items-center justify-between gap-3 sm:gap-4 min-h-[80px]">
          <div className="flex flex-col gap-1 flex-1 min-w-0 text-left">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-base sm:text-lg">Request a Free Pro Trial</span>
            </div>
            <span className="text-muted-foreground text-xs sm:text-sm">Get Full Access to All API Key Leaks and Advanced Features for a Limited Time.</span>
          </div>
          <div className="flex-shrink-0 flex flex-col items-end">
            {button}
          </div>
        </div>
      </div>
    </div>
  );
} 