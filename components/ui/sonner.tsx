'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-sm group-[.toaster]:rounded-md group-[.toaster]:px-3 group-[.toaster]:py-1.5 group-[.toaster]:text-sm',
          description: 'group-[.toast]:text-coral group-[.toast]:text-sm',
          actionButton:
            'group-[.toast]:bg-coral group-[.toast]:text-primary-foreground group-[.toast]:rounded-md',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-md',
          success: 'group-[.toast]:bg-card group-[.toast]:border-border',
          error: 'group-[.toast]:bg-card group-[.toast]:border-border',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
