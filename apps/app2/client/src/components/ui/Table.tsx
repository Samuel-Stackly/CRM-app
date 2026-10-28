import type { ReactNode } from 'react'

export interface Column<Row> {
  key: string
  header: string
  /** Cell renderer. Returning a node rather than a string allows pills, avatars. */
  render: (row: Row) => ReactNode
  /** Right-aligns the column, for money and counts. */
  numeric?: boolean
  /** Hidden below the `sm` breakpoint, so a phone shows only the essentials. */
  hideOnMobile?: boolean
}

interface TableProps<Row> {
  columns: Column<Row>[]
  rows: Row[]
  rowKey: (row: Row) => string
  caption?: string
  /** Replaces the body when there are no rows — an EmptyState, usually. */
  empty?: ReactNode
}

/**
 * Data table.
 *
 * A real <table> rather than a grid of divs: the export's table is tabular
 * data, and the native element gives row and column semantics, header
 * association and keyboard navigation for free.
 */
export function Table<Row>({ columns, rows, rowKey, caption, empty }: TableProps<Row>) {
  if (rows.length === 0 && empty) {
    return <>{empty}</>
  }

  return (
    // Horizontal scroll is the fallback for a table too wide to fit; the
    // hideOnMobile columns are what usually prevents it being needed.
    <div className="-mx-2 overflow-x-auto px-2">
      <table className="w-full border-collapse text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}

        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={[
                  'px-3 py-2 text-xs font-medium text-ink-muted',
                  column.numeric ? 'text-right' : 'text-left',
                  column.hideOnMobile ? 'hidden sm:table-cell' : '',
                ].join(' ')}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="rounded-control hover:bg-surface-muted">
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={[
                    'px-3 py-3 align-middle',
                    column.numeric ? 'text-right tabular-nums' : 'text-left',
                    column.hideOnMobile ? 'hidden sm:table-cell' : '',
                  ].join(' ')}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
