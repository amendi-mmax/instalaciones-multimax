import { cn } from '@/lib/utils';

/**
 * Avatar — componente nuevo de esta fase. Generaliza el tratamiento visual
 * compartido por `.mx-logo` (header) y `.mx-profava` (perfil del
 * instalador): cuadrado redondeado, degradado `--ice`→`#1fb6bd`, texto
 * oscuro centrado. El prototipo no define un componente Avatar reutilizable
 * como tal (cada uso duplica el mismo bloque de estilos inline en su CSS);
 * aquí se unifica en un único componente parametrizable por tamaño e
 * iniciales, documentado en MIGRATION_STATUS.md.
 */
export interface AvatarProps {
  initials: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASS: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'h-9 w-9 rounded-[10px] text-sm',
  md: 'h-[46px] w-[46px] rounded-[13px] text-lg',
  lg: 'h-[62px] w-[62px] rounded-[18px] text-2xl',
};

export function Avatar({ initials, size = 'md', className }: AvatarProps) {
  return (
    <div
      className={cn(
        'grid place-items-center font-display font-bold text-ink',
        'bg-[linear-gradient(135deg,var(--ice),#1fb6bd)] shadow-[0_0_22px_rgba(52,225,232,0.35)]',
        SIZE_CLASS[size],
        className,
      )}
    >
      {initials}
    </div>
  );
}
