/**
 * Mirrors LOW_STOCK_THRESHOLD in the server's Product model.
 *
 * Duplicated rather than imported because the two apps are independent; if the
 * server's threshold changes, this must change with it.
 */
export const LOW_STOCK_THRESHOLD = 10
