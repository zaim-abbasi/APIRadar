'use client';

import { useTheme } from '@/components/ui/theme-provider';
import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'light' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-none group-[.toaster]:rounded-lg group-[.toaster]:px-3 group-[.toaster]:py-1.5 group-[.toaster]:text-sm',
          description: 'group-[.toast]:text-amber-500 group-[.toast]:text-sm',
          actionButton:
            'group-[.toast]:bg-amber-500 group-[.toast]:text-primary-foreground group-[.toast]:rounded-lg',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-lg',
          success: 'group-[.toast]:bg-card group-[.toast]:border-none',
          error: 'group-[.toast]:bg-card group-[.toast]:border-none',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
