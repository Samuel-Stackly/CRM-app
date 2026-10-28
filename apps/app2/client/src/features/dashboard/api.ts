import { http } from '../../services/http'
import type { Stats } from '../../types/models'

export const dashboardApi = {
  /** Every figure on the overview comes from this one call. */
  stats: (signal?: AbortSignal) => http.get<Stats>('/stats', { signal }),
}
