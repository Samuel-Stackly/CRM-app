import { Button } from '../../../components/ui/Button'
import { Icon } from '../../../components/ui/Icon'
import { Select } from '../../../components/ui/Select'
import { TextField } from '../../../components/ui/TextField'
import { PRODUCT_CATEGORIES } from '../../../types/models'

interface ProductToolbarProps {
  search: string
  category: string
  onSearchChange: (value: string) => void
  onCategoryChange: (value: string) => void
  onAdd: () => void
  onClear: () => void
  activeCount: number
}

export function ProductToolbar({
  search,
  category,
  onSearchChange,
  onCategoryChange,
  onAdd,
  onClear,
  activeCount,
}: ProductToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <TextField
        label="Search"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search by name"
        leading={<Icon name="search" className="size-4" />}
        className="sm:max-w-xs sm:flex-1"
      />

      <Select
        label="Category"
        value={category}
        onChange={(event) => onCategoryChange(event.target.value)}
        placeholder="All categories"
        options={[
          { value: '', label: 'All categories' },
          ...PRODUCT_CATEGORIES.map((item) => ({ value: item, label: item })),
        ]}
        className="sm:w-48"
      />

      <div className="flex items-center gap-2 sm:ml-auto sm:pb-0">
        {activeCount > 0 && (
          <Button variant="ghost" onClick={onClear}>
            Clear filters
          </Button>
        )}
        <Button variant="primary" onClick={onAdd}>
          Add product
        </Button>
      </div>
    </div>
  )
}
