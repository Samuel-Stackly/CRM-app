import { useCallback, useState } from 'react'

import { Icon } from '../../../components/icons/Icon'
import { useToast } from '../../../components/toast/useToast'
import { Button } from '../../../components/ui/Button'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { ErrorState } from '../../../components/ui/ErrorState'
import { Pagination } from '../../../components/ui/Pagination'
import { useAsync } from '../../../hooks/useAsync'
import type { Deal } from '../../../types/models'
import { dealsApi, type DealBoardColumn, type DealPayload } from '../api'
import { DealBoard } from '../components/DealBoard'
import { DealFormModal } from '../components/DealFormModal'
import { DealTable } from '../components/DealTable'
import { DealToolbar } from '../components/DealToolbar'
import { formatCurrency } from '../format'
import { useDealFilters } from '../useDealFilters'
import styles from './DealsPage.module.css'

type Dialog =
  | { kind: 'none' }
  | { kind: 'create' }
  | { kind: 'edit'; deal: Deal }
  | { kind: 'delete'; deal: Deal }

interface DealsData {
  columns?: DealBoardColumn[]
  list?: Awaited<ReturnType<typeof dealsApi.list>>
}

export function DealsPage() {
  const { view, stage, search, sort, page, setFilters, setPage, reset, activeCount } =
    useDealFilters()
  const { notify } = useToast()

  const [dialog, setDialog] = useState<Dialog>({ kind: 'none' })
  const [deleting, setDeleting] = useState(false)

  // One hook, two shapes: the board and the list are different endpoints.
  const fetcher = useCallback(
    async (signal: AbortSignal): Promise<DealsData> => {
      if (view === 'board') {
        const board = await dealsApi.board({ search, sort }, signal)
        return { columns: board.stages }
      }
      return { list: await dealsApi.list({ stage, search, sort, page }, signal) }
    },
    [view, stage, search, sort, page],
  )

  const { data, status, error, reload } = useAsync(fetcher)

  const closeDialog = () => setDialog({ kind: 'none' })

  async function handleCreate(payload: DealPayload) {
    await dealsApi.create(payload)
    closeDialog()
    notify('Deal Saved')
    reload()
  }

  async function handleUpdate(id: string, payload: DealPayload) {
    await dealsApi.update(id, payload)
    closeDialog()
    notify('Deal Saved')
    reload()
  }

  async function handleDelete(deal: Deal) {
    setDeleting(true)
    try {
      await dealsApi.remove(deal.id)
      closeDialog()
      notify('Deal Deleted', 'deleted')
      reload()
    } catch {
      notify('Could not delete the deal', 'deleted')
    } finally {
      setDeleting(false)
    }
  }

  if (status === 'error') {
    return <ErrorState message={error?.message} onRetry={reload} />
  }

  const loading = status === 'loading'

  const summary = loading
    ? 'Loading deals…'
    : view === 'board'
      ? `Total: ${(data?.columns ?? []).reduce((sum, column) => sum + column.count, 0)} deals · ${formatCurrency(
          (data?.columns ?? []).reduce((sum, column) => sum + column.totalValue, 0),
        )}`
      : `Total: ${data?.list?.pagination.total ?? 0} deals`

  return (
    <div className={styles.page}>
      <div className={styles.actions}>
        <Button onClick={() => setDialog({ kind: 'create' })}>
          Add New Deal
          <Icon name="plus" size={18} />
        </Button>
      </div>

      <DealToolbar
        summary={summary}
        view={view}
        stage={stage}
        search={search}
        sort={sort}
        activeCount={activeCount}
        onFiltersChange={setFilters}
        onReset={reset}
      />

      {view === 'board' ? (
        <DealBoard columns={data?.columns ?? []} loading={loading} />
      ) : (
        <>
          <DealTable
            deals={data?.list?.data ?? []}
            loading={loading}
            onEdit={(deal) => setDialog({ kind: 'edit', deal })}
            onDelete={(deal) => setDialog({ kind: 'delete', deal })}
          />
          {data?.list ? <Pagination pagination={data.list.pagination} onChange={setPage} /> : null}
        </>
      )}

      {dialog.kind === 'create' ? (
        <DealFormModal onSubmit={handleCreate} onClose={closeDialog} />
      ) : null}

      {dialog.kind === 'edit' ? (
        <DealFormModal
          deal={dialog.deal}
          onSubmit={(payload) => handleUpdate(dialog.deal.id, payload)}
          onClose={closeDialog}
        />
      ) : null}

      {dialog.kind === 'delete' ? (
        <ConfirmDialog
          title="Delete deal"
          message={`Delete ${dialog.deal.title}? This cannot be undone.`}
          busy={deleting}
          onConfirm={() => void handleDelete(dialog.deal)}
          onCancel={closeDialog}
        />
      ) : null}
    </div>
  )
}
