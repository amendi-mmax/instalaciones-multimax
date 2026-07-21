/**
 * index.ts — barrel de la capa de repositorios (Sprint 4.1.1, Fase 6).
 *
 * Cubre las 8 tablas reales de Producción (`docs/database/DATABASE_INVENTORY.md`
 * §1) -- el brief de este Sprint listaba 5 como ejemplo ("Ejemplo:
 * admins/coordinadores/empresas/instaladores/trabajos"); se interpreta
 * "Ejemplo" como no-exhaustivo (mismo criterio ya aplicado y confirmado en
 * Sprint 4.0.2) y se agregan también `tiendas`, `trabajo_instaladores` y
 * `ofertas` -- documentado explícitamente en el informe de este Sprint para
 * que la decisión quede visible, no asumida en silencio.
 */
export { type Repository } from '@/repositories/base.repository';
export { adminsRepository } from '@/repositories/admins.repository';
export { coordinadoresRepository } from '@/repositories/coordinadores.repository';
export { empresasRepository } from '@/repositories/empresas.repository';
export { instaladoresRepository } from '@/repositories/instaladores.repository';
export { tiendasRepository } from '@/repositories/tiendas.repository';
export { trabajosRepository } from '@/repositories/trabajos.repository';
export { trabajoInstaladoresRepository } from '@/repositories/trabajo-instaladores.repository';
export { ofertasRepository } from '@/repositories/ofertas.repository';
