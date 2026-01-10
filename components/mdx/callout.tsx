import { ReactNode } from 'react';
import { AlertTriangle, Info, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type CalloutType = 'info' | 'warn' | 'error' | 'success';

const icons = {
  info: Info,
  warn: AlertTriangle,
  error: XCircle,
  success: CheckCircle2,
};

const styles = {
  info: 'border-blue-500/20 bg-blue-500/5 text-blue-500',
  warn: 'border-yellow-500/20 bg-yellow-500/5 text-yellow-500',
  error: 'border-red-500/20 bg-red-500/5 text-red-500',
  success: 'border-green-500/20 bg-green-500/5 text-green-500',
};

export function Callout({
  type = 'info',
  children,
}: {
  type?: CalloutType;
  children: ReactNode;
}) {
  const Icon = icons[type];

  return (
    <div className={cn('p-6 rounded-lg border', styles[type])}>
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1 text-foreground/90 [&>h2]:mt-0 [&>h2]:mb-2 [&>h2]:font-semibold [&>ul]:mt-2">
          {children}
        </div>
      </div>
    </div>
  );
}
