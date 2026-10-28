/** Metadata accompanying every list response. */
export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number,
): PaginationMeta {
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit)

  return {
    page,
    limit,
    total,
    totalPages,
    // Derived server-side so the client never recomputes them.
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1 && total > 0,
  }
}
