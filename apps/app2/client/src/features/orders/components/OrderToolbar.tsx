import { Button } from '../../../components/ui/Button'
import { Select } from '../../../components/ui/Select'
import { ORDER_STATUSES } from '../../../types/models'

interface OrderToolbarProps {
  status: string
  onStatusChange: (value: string) => void
  onClear: () => void
  activeCount: number
}

export function OrderToolbar({
  status,
  onStatusChange,
  onClear,
  activeCount,
}: OrderToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <Select
        label="Status"
        value={status}
        onChange={(event) => onStatusChange(event.target.value)}
        options={[
          { value: '', label: 'All statuses' },
          ...ORDER_STATUSES.map((item) => ({ value: item, label: item })),
        ]}
        className="sm:w-48"
      />

      {activeCount > 0 && (
        <Button variant="ghost" onClick={onClear} className="sm:ml-auto">
          Clear filter
        </Button>
      )}
    </div>
  )
}
