import { useCallback, useEffect, useState } from 'react'

import { Card } from '../../../components/ui/Card'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { EmptyState } from '../../../components/ui/EmptyState'
import { ErrorState } from '../../../components/ui/ErrorState'
import { Pagination } from '../../../components/ui/Pagination'
import { Skeleton } from '../../../components/ui/Skeleton'
import { useToast } from '../../../components/toast/useToast'
import { useAsync } from '../../../hooks/useAsync'
import { useDebouncedValue } from '../../../hooks/useDebouncedValue'
import { useUrlFilters } from '../../../hooks/useUrlFilters'
import { ApiError } from '../../../services/http'
import type { Product } from '../../../types/models'
import { productsApi, type ProductPayload } from '../api'
import { ProductFormModal } from '../components/ProductFormModal'
import { ProductTable } from '../components/ProductTable'
import { ProductToolbar } from '../components/ProductToolbar'

/** The axes this list filters on. Constant so the hook's memo stays stable. */
const FILTER_KEYS = ['search', 'category'] as const

type Dialog =
  | { kind: 'create' }
  | { kind: 'edit'; product: Product }
  | { kind: 'delete'; product: Product }

function message(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback
}

export function ProductsPage() {
  const toast = useToast()
  const { values, page, setFilters, setPage, reset, activeCount } = useUrlFilters(FILTER_KEYS)

  // The input is local so typing stays responsive; the URL is updated only once
  // the value settles, which also keeps the back button free of one entry per
  // keystroke.
  const [searchInput, setSearchInput] = useState(values.search)
  const debouncedSearch = useDebouncedValue(searchInput, 350)

  // Keeps the box in step when the URL changes from elsewhere — a back
  // navigation, or Clear filters — without fighting the user mid-type.
  useEffect(() => {
    setSearchInput((current) => (current === values.search ? current : values.search))
  }, [values.search])

  useEffect(() => {
    if (debouncedSearch !== values.search) {
      setFilters({ search: debouncedSearch })
    }
  }, [debouncedSearch, values.search, setFilters])

  const [dialog, setDialog] = useState<Dialog>()
  const [deleting, setDeleting] = useState(false)

  const fetcher = useCallback(
    (signal: AbortSignal) =>
      productsApi.list(
        { search: values.search, category: values.category, page },
        signal,
      ),
    [values.search, values.category, page],
  )

  const { status, data, error, reload } = useAsync(fetcher)

  const closeDialog = useCallback(() => setDialog(undefined), [])

  async function handleCreate(payload: ProductPayload) {
    await productsApi.create(payload)
    closeDialog()
    toast.success(`${payload.name} added`)
    reload()
  }

  async function handleUpdate(id: string, payload: ProductPayload) {
    await productsApi.update(id, payload)
    closeDialog()
    toast.success(`${payload.name} updated`)
    reload()
  }

  async function handleDelete(product: Product) {
    setDeleting(true)
    try {
      await productsApi.remove(product.id)
      closeDialog()
      toast.success(`${product.name} deleted`)

      // Deleting the last row of a page would leave the user on an empty one.
      const remaining = (data?.data.length ?? 1) - 1
      if (remaining === 0 && page > 1) setPage(page - 1)
      else reload()
    } catch (caught) {
      toast.error(message(caught, 'Could not delete this product.'))
    } finally {
      setDeleting(false)
    }
  }

  const products = data?.data ?? []
  const isFiltered = activeCount > 0

  return (
    <div className="flex flex-col gap-5 py-2">
      <h1 className="text-xl font-semibold tracking-tight">Products</h1>

      <ProductToolbar
        search={searchInput}
        category={values.category}
        onSearchChange={setSearchInput}
        onCategoryChange={(category) => setFilters({ category })}
        onAdd={() => setDialog({ kind: 'create' })}
        onClear={() => {
          setSearchInput('')
          reset()
        }}
        activeCount={activeCount}
      />

      <Card>
        {status === 'loading' && (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-11" />
            ))}
          </div>
        )}

        {status === 'error' && (
          <ErrorState
            message={error?.message ?? 'Could not load your products.'}
            onRetry={reload}
          />
        )}

        {status === 'success' && products.length === 0 && (
          <EmptyState
            title={isFiltered ? 'No matching products' : 'No products yet'}
            description={
              isFiltered
                ? 'Try a different search or category.'
                : 'Add your first product to get started.'
            }
          />
        )}

        {status === 'success' && products.length > 0 && (
          <>
            <ProductTable
              products={products}
              onEdit={(product) => setDialog({ kind: 'edit', product })}
              onDelete={(product) => setDialog({ kind: 'delete', product })}
            />
            {data && <Pagination meta={data.pagination} onPageChange={setPage} />}
          </>
        )}
      </Card>

      {dialog?.kind === 'create' && (
        <ProductFormModal onSubmit={handleCreate} onClose={closeDialog} />
      )}

      {dialog?.kind === 'edit' && (
        <ProductFormModal
          product={dialog.product}
          onSubmit={(payload) => handleUpdate(dialog.product.id, payload)}
          onClose={closeDialog}
        />
      )}

      {dialog?.kind === 'delete' && (
        <ConfirmDialog
          title="Delete product"
          message={`${dialog.product.name} will be permanently removed. This cannot be undone.`}
          confirmLabel="Delete"
          destructive
          busy={deleting}
          onConfirm={() => void handleDelete(dialog.product)}
          onCancel={closeDialog}
        />
      )}
    </div>
  )
}
