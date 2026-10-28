import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Button } from './Button'
import { EmptyState } from './EmptyState'
import { ErrorState } from './ErrorState'
import { Pagination, type PaginationMeta } from './Pagination'
import { Select } from './Select'
import { StatTile } from './StatTile'
import { StatusPill } from './StatusPill'
import { Table, type Column } from './Table'
import { TextField } from './TextField'

describe('Button', () => {
  it('defaults to type=button so it cannot submit a surrounding form', () => {
    render(<Button>Save</Button>)
    expect(screen.getByRole('button')).toHaveProperty('type', 'button')
  })

  it('is disabled and marked busy while loading', () => {
    render(<Button loading>Save</Button>)
    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toHaveProperty('disabled', true)
    expect(button.getAttribute('aria-busy')).toBe('true')
  })
})

describe('TextField', () => {
  it('links its label to the input', () => {
    render(<TextField label="Product name" />)
    expect(screen.getByLabelText('Product name')).toBeDefined()
  })

  it('marks itself invalid and describes the input by the error', () => {
    render(<TextField label="Price" error="Price is required" />)
    const input = screen.getByLabelText('Price')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    const describedBy = input.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    expect(document.getElementById(describedBy!)?.textContent).toBe('Price is required')
  })

  it('shows the hint when there is no error', () => {
    render(<TextField label="SKU" hint="Must be unique" />)
    expect(screen.getByText('Must be unique')).toBeDefined()
  })
})

describe('Select', () => {
  it('renders its options and keeps the label accessible when hidden', () => {
    render(
      <Select
        label="Status"
        hideLabel
        options={[
          { value: 'active', label: 'Active' },
          { value: 'draft', label: 'Draft' },
        ]}
      />,
    )
    expect(screen.getByLabelText('Status')).toBeDefined()
    expect(screen.getByRole('option', { name: 'Draft' })).toBeDefined()
  })
})

describe('StatTile', () => {
  it('formats a rise with an explicit plus sign', () => {
    render(<StatTile label="Revenue" value="$72,650" change={11.01} />)
    expect(screen.getByText('+11.01%')).toBeDefined()
  })

  it('formats a fall without inventing a sign', () => {
    render(<StatTile label="Orders" value="3,671" change={-0.03} />)
    expect(screen.getByText('-0.03%')).toBeDefined()
  })
})

describe('StatusPill', () => {
  it('renders its label', () => {
    render(<StatusPill tone="complete">Fulfilled</StatusPill>)
    expect(screen.getByText('Fulfilled')).toBeDefined()
  })
})

interface Row {
  id: string
  name: string
}

const COLUMNS: Column<Row>[] = [
  { key: 'name', header: 'Name', render: (row) => row.name },
]

describe('Table', () => {
  it('renders a header and a row per record', () => {
    render(
      <Table
        columns={COLUMNS}
        rows={[
          { id: '1', name: 'Ada' },
          { id: '2', name: 'Grace' },
        ]}
        rowKey={(row) => row.id}
      />,
    )
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeDefined()
    // Two data rows plus the header row.
    expect(screen.getAllByRole('row')).toHaveLength(3)
  })

  it('shows the empty slot instead of an empty table body', () => {
    render(
      <Table
        columns={COLUMNS}
        rows={[]}
        rowKey={(row) => row.id}
        empty={<EmptyState title="No products" />}
      />,
    )
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.getByText('No products')).toBeDefined()
  })
})

describe('ErrorState', () => {
  it('announces itself and retries on request', async () => {
    const onRetry = vi.fn()
    render(<ErrorState message="Could not load orders" onRetry={onRetry} />)

    expect(screen.getByRole('alert')).toBeDefined()
    screen.getByRole('button', { name: 'Try again' }).click()
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('omits the retry button when no handler is given', () => {
    render(<ErrorState />)
    expect(screen.queryByRole('button')).toBeNull()
  })
})

function meta(overrides: Partial<PaginationMeta> = {}): PaginationMeta {
  return {
    page: 2,
    limit: 10,
    total: 35,
    totalPages: 4,
    hasNextPage: true,
    hasPrevPage: true,
    ...overrides,
  }
}

describe('Pagination', () => {
  it('renders nothing when there is only one page', () => {
    const { container } = render(
      <Pagination meta={meta({ totalPages: 1, total: 5 })} onPageChange={vi.fn()} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('reports the visible range from the server metadata', () => {
    render(<Pagination meta={meta()} onPageChange={vi.fn()} />)
    expect(screen.getByText('11–20 of 35')).toBeDefined()
  })

  it('clamps the final range to the total', () => {
    render(
      <Pagination
        meta={meta({ page: 4, hasNextPage: false })}
        onPageChange={vi.fn()}
      />,
    )
    expect(screen.getByText('31–35 of 35')).toBeDefined()
  })

  it('steps forward and disables the edge', () => {
    const onPageChange = vi.fn()
    render(
      <Pagination meta={meta({ page: 1, hasPrevPage: false })} onPageChange={onPageChange} />,
    )

    expect(screen.getByRole('button', { name: 'Previous page' })).toHaveProperty('disabled', true)
    screen.getByRole('button', { name: 'Next page' }).click()
    expect(onPageChange).toHaveBeenCalledWith(2)
  })
})
