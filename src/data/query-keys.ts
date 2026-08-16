import type { Period } from '@/domain/period'
import type { SpaceId } from '@/domain/types'

/**
 * As chaves de cache, centralizadas.
 *
 * A chave é o que identifica uma subscription no registry de listeners, então
 * duas chamadas com a mesma chave compartilham UM listener. Espalhar arrays
 * literais pelo código quebraria essa garantia silenciosamente.
 */
export const keys = {
  session: ['session'] as const,

  user: (uid: string) => ['user', uid] as const,

  space: (spaceId: SpaceId | null) => ['space', spaceId] as const,

  members: (spaceId: SpaceId | null) => ['members', spaceId] as const,

  incomeSources: (spaceId: SpaceId | null) =>
    ['incomeSources', spaceId] as const,

  commitments: (spaceId: SpaceId | null) => ['commitments', spaceId] as const,

  categories: (spaceId: SpaceId | null) => ['categories', spaceId] as const,

  entries: (spaceId: SpaceId | null, period: Period) =>
    ['entries', spaceId, period] as const,

  periodPlan: (spaceId: SpaceId | null, period: Period) =>
    ['periodPlan', spaceId, period] as const,

  /** Acumulado de quitações por compromisso, para as metas de reserva. */
  carried: (spaceId: SpaceId | null) => ['carried', spaceId] as const,
} as const
