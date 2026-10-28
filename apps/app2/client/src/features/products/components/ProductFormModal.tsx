import { useState, type FormEvent } from 'react'

import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { Select } from '../../../components/ui/Select'
import { TextField } from '../../../components/ui/TextField'
import { ApiError } from '../../../services/http'
import { PRODUCT_CATEGORIES, type Product, type ProductCategory } from '../../../types/models'
import type { ProductPayload } from '../api'

type Errors = Partial<Record<'name' | 'category' | 'price' | 'stock' | 'imageUrl', string>>

interface ProductFormModalProps {
  /** Absent when adding. */
  product?: Product
  onSubmit: (payload: ProductPayload) => Promise<void>
  onClose: () => void
}

/**
 * Validates the form.
 *
 * Mirrors the server's rules so the user is told immediately rather than after
 * a round trip. The server still validates — this is a convenience, not the
 * enforcement point.
 */
function validate(values: {
  name: string
  category: string
  price: string
  stock: string
  imageUrl: string
}): Errors {
  const errors: Errors = {}

  if (!values.name.trim()) errors.name = 'Name is required'

  if (!values.category) errors.category = 'Category is required'

  const price = Number(values.price)
  if (!values.price.trim()) errors.price = 'Price is required'
  else if (!Number.isFinite(price)) errors.price = 'Price must be a number'
  else if (price <= 0) errors.price = 'Price must be greater than zero'

  const stock = Number(values.stock)
  if (!values.stock.trim()) errors.stock = 'Stock is required'
  else if (!Number.isFinite(stock)) errors.stock = 'Stock must be a number'
  else if (!Number.isInteger(stock)) errors.stock = 'Stock must be a whole number'
  else if (stock < 0) errors.stock = 'Stock cannot be negative'

  if (values.imageUrl.trim()) {
    try {
      new URL(values.imageUrl.trim())
    } catch {
      errors.imageUrl = 'Enter a valid image URL'
    }
  }

  return errors
}

export function ProductFormModal({ product, onSubmit, onClose }: ProductFormModalProps) {
  const editing = product !== undefined

  const [values, setValues] = useState({
    name: product?.name ?? '',
    category: product?.category ?? '',
    price: product ? String(product.price) : '',
    stock: product ? String(product.stock) : '',
    imageUrl: product?.imageUrl ?? '',
  })
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState<string>()
  const [saving, setSaving] = useState(false)

  function set(key: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    const found = validate(values)
    setErrors(found)
    setFormError(undefined)
    if (Object.keys(found).length > 0) return

    setSaving(true)
    try {
      await onSubmit({
        name: values.name.trim(),
        category: values.category as ProductCategory,
        price: Number(values.price),
        stock: Number(values.stock),
        imageUrl: values.imageUrl.trim() || undefined,
      })
    } catch (error) {
      // The server validates independently; surface its field messages inline
      // so a rule this form does not mirror still lands on the right input.
      if (error instanceof ApiError) {
        const fields = error.fieldErrors
        if (Object.keys(fields).length > 0) setErrors(fields as Errors)
        else setFormError(error.message)
      } else {
        setFormError('Something went wrong. Please try again.')
      }
      setSaving(false)
      return
    }
    setSaving(false)
  }

  return (
    <Modal
      title={editing ? 'Edit product' : 'Add product'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="product-form" variant="primary" loading={saving}>
            {editing ? 'Save changes' : 'Add product'}
          </Button>
        </>
      }
    >
      <form id="product-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <TextField
          label="Name"
          value={values.name}
          onChange={(event) => set('name', event.target.value)}
          error={errors.name}
          placeholder="Studio Headphones"
        />

        <Select
          label="Category"
          value={values.category}
          onChange={(event) => set('category', event.target.value)}
          error={errors.category}
          placeholder="Choose a category"
          options={PRODUCT_CATEGORIES.map((category) => ({
            value: category,
            label: category,
          }))}
        />

        <div className="grid grid-cols-2 gap-4">
          <TextField
            label="Price"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={values.price}
            onChange={(event) => set('price', event.target.value)}
            error={errors.price}
          />

          <TextField
            label="Stock"
            type="number"
            inputMode="numeric"
            step="1"
            min="0"
            value={values.stock}
            onChange={(event) => set('stock', event.target.value)}
            error={errors.stock}
          />
        </div>

        <TextField
          label="Image URL"
          value={values.imageUrl}
          onChange={(event) => set('imageUrl', event.target.value)}
          error={errors.imageUrl}
          hint="Optional"
          placeholder="https://…"
        />

        {formError && (
          <p role="alert" className="text-sm text-accent-red">
            {formError}
          </p>
        )}
      </form>
    </Modal>
  )
}
