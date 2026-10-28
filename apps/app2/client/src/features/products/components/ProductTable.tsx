import { Button } from '../../../components/ui/Button'
import { StatusPill } from '../../../components/ui/StatusPill'
import { Table, type Column } from '../../../components/ui/Table'
import { LOW_STOCK_THRESHOLD } from '../constants'
import type { Product } from '../../../types/models'
import { formatCurrency } from '../../dashboard/format'

interface ProductTableProps {
  products: Product[]
  onEdit: (product: Product) => void
  onDelete: (product: Product) => void
}

export function ProductTable({ products, onEdit, onDelete }: ProductTableProps) {
  const columns: Column<Product>[] = [
    {
      key: 'name',
      header: 'Product',
      render: (product) => (
        <div className="flex items-center gap-2.5">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt=""
              loading="lazy"
              className="size-8 shrink-0 rounded-control bg-fill object-cover"
            />
          ) : (
            <span
              aria-hidden="true"
              className="grid size-8 shrink-0 place-items-center rounded-control bg-fill text-xs font-medium text-ink-muted"
            >
              {product.name.charAt(0)}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate font-medium">{product.name}</p>
            <p className="truncate text-xs text-ink-muted sm:hidden">{product.category}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      hideOnMobile: true,
      render: (product) => <span className="text-ink-muted">{product.category}</span>,
    },
    {
      key: 'price',
      header: 'Price',
      numeric: true,
      render: (product) => formatCurrency(product.price),
    },
    {
      key: 'stock',
      header: 'Stock',
      numeric: true,
      hideOnMobile: true,
      // Low stock is called out here because it is the number the dashboard
      // counts, and seeing which products drive it is the obvious next question.
      render: (product) =>
        product.stock <= LOW_STOCK_THRESHOLD ? (
          <StatusPill tone="approved">{`${product.stock} low`}</StatusPill>
        ) : (
          <span>{product.stock}</span>
        ),
    },
    {
      key: 'actions',
      header: 'Actions',
      numeric: true,
      render: (product) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={() => onEdit(product)}>
            Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(product)}
            aria-label={`Delete ${product.name}`}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ]

  return (
    <Table
      caption="Products"
      columns={columns}
      rows={products}
      rowKey={(product) => product.id}
    />
  )
}
