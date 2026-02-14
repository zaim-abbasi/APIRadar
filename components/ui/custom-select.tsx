"use client";

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  triggerClassName?: string;
  contentClassName?: string;
  placeholder?: string;
  disabled?: boolean;
}

interface CustomSelectItemProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

const CustomSelectContext = React.createContext<{
  value: string;
  onValueChange: (value: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
} | null>(null);

export const CustomSelect = React.forwardRef<HTMLDivElement, CustomSelectProps>(
  ({ value, onValueChange, children, triggerClassName, contentClassName, placeholder, disabled }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Node;
        const portalContent = document.querySelector('[data-custom-select-portal]');
        const isClickInTrigger = containerRef.current?.contains(target);
        const isClickInPortal = portalContent?.contains(target);
        
        if (!isClickInTrigger && !isClickInPortal) {
          setIsOpen(false);
        }
      };

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
      }
    }, [isOpen]);

    useEffect(() => {
      const updatePosition = () => {
        if (isOpen && triggerRef.current) {
          const rect = triggerRef.current.getBoundingClientRect();
          setPosition({
            top: rect.bottom + 4,
            left: rect.left,
            width: rect.width
          });
        }
      };

      if (isOpen) {
        updatePosition();
        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);
        return () => {
          window.removeEventListener('scroll', updatePosition, true);
          window.removeEventListener('resize', updatePosition);
        };
      } else {
        setPosition(null);
      }
    }, [isOpen]);

    useEffect(() => {
      if (!isOpen) return;
      const handleScrollClose = () => setIsOpen(false);
      window.addEventListener('scroll', handleScrollClose, true);
      return () => window.removeEventListener('scroll', handleScrollClose, true);
    }, [isOpen]);

    const contextValue = {
      value,
      onValueChange: (newValue: string) => {
        onValueChange(newValue);
        setIsOpen(false);
      },
      isOpen,
      setIsOpen
    };

    return (
      <CustomSelectContext.Provider value={contextValue}>
        <div ref={containerRef} className="relative" data-custom-select-container>
          {React.Children.map(children, (child) => {
            if (React.isValidElement(child)) {
              if (child.type === CustomSelectTrigger) {
                const existingClassName = (child.props as any)?.className;
                return React.cloneElement(child as React.ReactElement<any>, {
                  ref: triggerRef,
                  disabled,
                  className: cn(
                    'flex h-10 sm:h-9 w-full items-center justify-between rounded-md border border-input bg-background px-2.5 sm:px-2.5 py-2 sm:py-1.5 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 min-h-[40px] sm:min-h-0',
                    triggerClassName,
                    existingClassName
                  ),
                  'data-trigger-width': true
                });
              }
              if (child.type === CustomSelectContent) {
                return React.cloneElement(child as React.ReactElement<any>, {
                  ref: contentRef,
                  className: contentClassName,
                  containerRef,
                  position
                });
              }
            }
            return child;
          })}
        </div>
      </CustomSelectContext.Provider>
    );
  }
);

CustomSelect.displayName = 'CustomSelect';

export const CustomSelectTrigger = React.forwardRef<HTMLButtonElement, {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  'aria-label'?: string;
  tabIndex?: number;
  'data-trigger-width'?: boolean;
}>(({ children, className, disabled, 'aria-label': ariaLabel, tabIndex, 'data-trigger-width': dataTriggerWidth }, ref) => {
  const context = React.useContext(CustomSelectContext);
  if (!context) throw new Error('CustomSelectTrigger must be used within CustomSelect');

  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      onClick={() => !disabled && context.setIsOpen(!context.isOpen)}
      onMouseDown={(e) => {
        // Prevent focus ring when clicking to open dropdown
        if (!context.isOpen) {
          e.preventDefault();
        }
      }}
      aria-label={ariaLabel}
      tabIndex={tabIndex}
      data-trigger-width={dataTriggerWidth}
      className={cn(
        className,
        context.isOpen && 'ring-0 outline-none focus:ring-0 focus:outline-none'
      )}
    >
      <span className="flex-1 flex items-center min-w-0">{children}</span>
      <ChevronDown className={cn('h-4 w-4 opacity-50 shrink-0 ml-2', context.isOpen && 'rotate-180')} />
    </button>
  );
});

CustomSelectTrigger.displayName = 'CustomSelectTrigger';

export const CustomSelectValue = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  const context = React.useContext(CustomSelectContext);
  if (!context) throw new Error('CustomSelectValue must be used within CustomSelect');

  return <span className={className}>{children}</span>;
};

CustomSelectValue.displayName = 'CustomSelectValue';

export const CustomSelectContent = React.forwardRef<HTMLDivElement, {
  children: React.ReactNode;
  className?: string;
  containerRef?: React.RefObject<HTMLDivElement>;
  position?: { top: number; left: number; width: number } | null;
}>(({ children, className, containerRef, position }, ref) => {
  const context = React.useContext(CustomSelectContext);
  if (!context) throw new Error('CustomSelectContent must be used within CustomSelect');

  const [mounted, setMounted] = React.useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!context.isOpen || !mounted || !position) return null;

  const content = (
    <div
      ref={ref}
      data-custom-select-portal
      className={cn(
        'fixed z-[9999] min-w-[8rem] overflow-hidden rounded-md border border-border/60 bg-card text-popover-foreground shadow-sm',
        className
      )}
      style={{ 
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: `${position.width}px`
      }}
    >
      <div className="p-1 sm:p-1" style={{ width: '100%' }}>
        {children}
      </div>
    </div>
  );

  return createPortal(content, document.body);
});

CustomSelectContent.displayName = 'CustomSelectContent';

export const CustomSelectItem = React.forwardRef<HTMLDivElement, CustomSelectItemProps & { 'aria-label'?: string }>(
  ({ value, children, className, 'aria-label': ariaLabel }, ref) => {
    const context = React.useContext(CustomSelectContext);
    if (!context) throw new Error('CustomSelectItem must be used within CustomSelect');

    const isSelected = context.value === value;

    return (
      <div
        ref={ref}
        onClick={() => context.onValueChange(value)}
        aria-label={ariaLabel}
        className={cn(
          'relative flex w-full cursor-pointer select-none items-center rounded-md py-2.5 sm:py-1 pl-8 sm:pl-8 pr-2 text-sm outline-none hover:ring-0 focus:ring-0 focus-visible:ring-0 ring-0 hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 min-h-[44px] sm:min-h-0',
          isSelected && 'bg-accent text-accent-foreground',
          className
        )}
      >
        {isSelected && (
          <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
            <Check className="h-4 w-4" aria-hidden="true" focusable="false" />
          </span>
        )}
        {children}
      </div>
    );
  }
);

CustomSelectItem.displayName = 'CustomSelectItem';

