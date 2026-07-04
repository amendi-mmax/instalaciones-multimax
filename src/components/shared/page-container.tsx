import { ChevronLeft } from 'lucide-react';
import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/utils';

/** PageContainer — portado verbatim de `.mx-page`. */
export function PageContainer({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mx-page', className)} {...props} />;
}

export interface PageHeadProps {
  title: ReactNode;
  subtitle?: ReactNode;
  onBack?: () => void;
  backLabel?: string;
  action?: ReactNode;
}

/** Portado verbatim de `.mx-pagehead`/`.mx-pagehead h2`/`.mx-sub`/`.mx-backbtn`. */
export function PageHead({ title, subtitle, onBack, backLabel = 'Volver', action }: PageHeadProps) {
  return (
    <div className="mx-pagehead">
      {onBack ? (
        <button type="button" className="mx-backbtn" onClick={onBack}>
          <ChevronLeft size={15} />
          {backLabel}
        </button>
      ) : null}
      <div>
        <h2>{title}</h2>
        {subtitle ? <div className="mx-sub">{subtitle}</div> : null}
      </div>
      {action}
    </div>
  );
}
