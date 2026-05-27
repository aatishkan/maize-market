import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  headline: string;
  subtext?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, headline, subtext, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-4 text-center',
        className
      )}
    >
      {Icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <Icon className="h-7 w-7 text-muted-foreground" />
        </div>
      )}
      <h3 className="text-base font-semibold text-foreground">{headline}</h3>
      {subtext && (
        <p className="mt-1 text-sm text-muted-foreground max-w-sm">{subtext}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
