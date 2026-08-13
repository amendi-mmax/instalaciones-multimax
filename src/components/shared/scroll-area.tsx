import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

/**
 * ScrollArea — corresponde al ítem "Scroll Containers" del listado de
 * Layout de esta fase. El prototipo no define una clase `mx-*` reutilizable
 * para scroll (usa `overflow-y:auto` puntual en `.mx-myjobs`/
 * `.mx-profscreen`/`.mx-cal-body`, todas específicas de pantallas fuera de
 * alcance), así que se generaliza aquí un contenedor de scroll vertical
 * simple. Se decidió NO usar `@radix-ui/react-scroll-area` para mantener el
 * paquete de dependencias mínimo — no se requiere scrollbar custom
 * multiplataforma, solo `overflow-y: auto` con el mismo tratamiento visual
 * del resto del sistema.
 */
export function ScrollArea({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('overflow-y-auto', className)} {...props} />;
}
