import { Search } from 'lucide-react';
import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

/**
 * SearchBox — componente nuevo de esta fase. El prototipo no tiene un campo
 * de búsqueda en ninguna pantalla capturada; se agrega reutilizando la
 * misma clase visual `.mx-input` (ver globals.css) con un ícono de lupa
 * (Lucide `Search`) para uso futuro en listados (ej. tabla de instaladores
 * en Admin). Documentado en MIGRATION_STATUS.md.
 */
export const SearchBox = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative">
      <Search
        size={15}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
      />
      <input ref={ref} type="search" className={cn('mx-input w-full pl-9', className)} {...props} />
    </div>
  ),
);
SearchBox.displayName = 'SearchBox';
