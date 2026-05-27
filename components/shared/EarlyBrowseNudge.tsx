'use client';

import { useState } from 'react';
import { X, Calendar, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NudgeConfig } from '@/lib/nudge';

interface EarlyBrowseNudgeProps {
  config: NudgeConfig;
  onSetDate?: () => void;
  className?: string;
}

const toneStyles = {
  info: {
    wrapper: 'bg-um-blue-muted border-um-blue/20',
    icon: 'text-um-blue',
    headline: 'text-um-blue',
    subtext: 'text-um-blue/80',
    dismiss: 'text-um-blue/60 hover:text-um-blue',
    cta: 'bg-um-blue text-white hover:bg-um-blue-light',
    IconComponent: Calendar,
  },
  warm: {
    wrapper: 'bg-amber-50 border-amber-200',
    icon: 'text-amber-600',
    headline: 'text-amber-900',
    subtext: 'text-amber-800/80',
    dismiss: 'text-amber-600/60 hover:text-amber-600',
    cta: 'bg-amber-600 text-white hover:bg-amber-700',
    IconComponent: Clock,
  },
  urgent: {
    wrapper: 'bg-maize/20 border-maize',
    icon: 'text-um-blue',
    headline: 'text-um-blue',
    subtext: 'text-um-blue/80',
    dismiss: 'text-um-blue/60 hover:text-um-blue',
    cta: 'bg-maize text-um-blue hover:bg-maize-dark font-semibold',
    IconComponent: AlertCircle,
  },
};

export function EarlyBrowseNudge({ config, onSetDate, className }: EarlyBrowseNudgeProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const styles = toneStyles[config.tone];
  const { IconComponent } = styles;

  return (
    <div
      className={cn(
        'border-b',
        styles.wrapper,
        className
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-start gap-3">
          <IconComponent className={cn('h-5 w-5 shrink-0 mt-0.5', styles.icon)} />

          <div className="flex-1 min-w-0">
            <p className={cn('text-sm font-semibold', styles.headline)}>
              {config.headline}
            </p>
            <p className={cn('text-sm mt-0.5', styles.subtext)}>
              {config.subtext}
            </p>
            {config.variant === 'set_date' && onSetDate && (
              <button
                onClick={onSetDate}
                className={cn(
                  'mt-2 inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition-colors',
                  styles.cta
                )}
              >
                <Calendar className="h-3.5 w-3.5" />
                Set my move-in date
              </button>
            )}
          </div>

          {/* Days countdown pill */}
          {config.daysUntilMoveIn !== undefined && (
            <div
              className={cn(
                'hidden sm:flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
                config.tone === 'urgent'
                  ? 'bg-maize text-um-blue'
                  : config.tone === 'warm'
                  ? 'bg-amber-200 text-amber-900'
                  : 'bg-um-blue text-white'
              )}
            >
              <Clock className="h-3 w-3" />
              {config.daysUntilMoveIn}d
            </div>
          )}

          {/* Dismiss */}
          <button
            onClick={() => setDismissed(true)}
            className={cn('shrink-0 p-1 rounded transition-colors', styles.dismiss)}
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
