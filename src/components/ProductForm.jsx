import { useState, useRef } from 'react'
import { Trash2, Plus } from 'lucide-react'
import {
  DSButton,
  DSInput,
  Dropdown,
  Modal,
  Alert,
  FormLabel,
  IconButton,
  Divider,
} from '@uxuissk/design-system'

const SUGGESTED_CATEGORIES = ['Electronics', 'Furniture', 'Stationery', 'Apparel', 'Tools', 'Other']

// CARD-006: Form edits the new `stocks` shape. Internally we still use the simple
// (id, name, quantity) editor — on submit we lift each row into a full stock entry,
// preserving existing available/unavailable/reserve/preorder when editing and
// defaulting them (available = quantity, others = 0) for newly added rows.
const buildEmptyForm = () => ({
  sku: '',
  name: '',
  productType: 'physical',
  stocks: [
    {
      id: crypto.randomUUID(),
      name: '',
      quantity: '',
      location_type: 'in-store',
      _existing: null,
    },
  ],
  price: '',
  category: '',
})

function buildInitialForm(product) {
  if (!product) return buildEmptyForm()
  const stocks = Array.isArray(product.stocks) ? product.stocks : []
  return {
    sku: product.sku,
    name: product.name,
    productType: product.productType || 'physical',
    stocks: stocks.map((s) => ({
      id: s.id,
      name: s.location_name,
      quantity: String(s.quantity),
      location_type: s.location_type || 'in-store',
      _existing: s, // preserve available/unavailable/reserve/preorder on save
    })),
    price: String(product.price),
    category: product.category,
  }
}

export default function ProductForm({
  product,
  existingSKUs,
  onSave,
  onClose,
  conflictType,
  conflictData,
  onReloadLatest,
  onSaveAnyway,
  onConflictClose,
}) {
  const isEdit = Boolean(product)
  const openedAt = useRef(product?.updatedAt)
  const [form, setForm] = useState(() => buildInitialForm(product))
  const [errors, setErrors] = useState({})

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const handleLocationChange = (index, field, value) => {
    setForm((prev) => {
      const updated = prev.stocks.map((loc, i) =>
        i === index ? { ...loc, [field]: value } : loc
      )
      return { ...prev, stocks: updated }
    })
    if (errors.stocks?.[index]?.[field]) {
      setErrors((prev) => {
        const locErrors = (prev.stocks || []).map((e, i) =>
          i === index ? { ...e, [field]: undefined } : e
        )
        return { ...prev, stocks: locErrors }
      })
    }
  }

  const handleAddLocation = () => {
    setForm((prev) => ({
      ...prev,
      stocks: [
        ...prev.stocks,
        {
          id: crypto.randomUUID(),
          name: '',
          quantity: '',
          location_type: 'in-store',
          _existing: null,
        },
      ],
    }))
  }

  const handleRemoveLocation = (index) => {
    setForm((prev) => ({
      ...prev,
      stocks: prev.stocks.filter((_, i) => i !== index),
    }))
    setErrors((prev) => {
      const locErrors = (prev.stocks || []).filter((_, i) => i !== index)
      return { ...prev, stocks: locErrors }
    })
  }

  const validate = () => {
    const e = {}

    if (!form.sku.trim()) {
      e.sku = 'SKU is required'
    } else if (existingSKUs.map((s) => s.toLowerCase()).includes(form.sku.trim().toLowerCase())) {
      e.sku = 'This SKU already exists — SKU must be unique'
    }

    if (!form.name.trim()) {
      e.name = 'Name is required'
    }

    // Locations only required for physical products (digital/service have no stock).
    if (form.productType === 'physical') {
      if (form.stocks.length === 0) {
        e.locationsGeneral = 'At least one location is required'
      } else {
        const locErrors = form.stocks.map((loc) => {
          const locErr = {}
          if (!loc.name.trim()) locErr.name = 'Location name is required'
          if (loc.quantity === '') {
            locErr.quantity = 'Quantity is required'
          } else if (!/^\d+$/.test(String(loc.quantity).trim()) || parseInt(loc.quantity, 10) < 0) {
            locErr.quantity = 'Must be a whole number (0 or more)'
          }
          return locErr
        })
        if (locErrors.some((le) => Object.keys(le).length > 0)) {
          e.stocks = locErrors
        }
      }
    }

    if (form.price === '') {
      e.price = 'Price is required'
    } else if (isNaN(parseFloat(form.price)) || parseFloat(form.price) <= 0) {
      e.price = 'Price must be a positive number'
    }

    if (!form.category.trim()) {
      e.category = 'Category is required'
    }

    return e
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }
    // Lift simple (name, quantity) rows back into full ProductStock entries.
    // For existing rows: keep available/unavailable/reserve/preorder if quantity
    // is unchanged; if quantity changed, push the delta into `available` (sellable).
    const parsedStocks = form.productType === 'physical'
      ? form.stocks.map((loc) => {
          const newQty = parseInt(loc.quantity, 10)
          const prev   = loc._existing
          if (prev) {
            const delta = newQty - prev.quantity
            return {
              id: prev.id,
              location_name: loc.name.trim(),
              location_type: prev.location_type || loc.location_type || 'in-store',
              quantity:    newQty,
              available:   Math.max(0, (prev.available || 0) + delta),
              unavailable: prev.unavailable || 0,
              reserve:     prev.reserve     || 0,
              preorder:    prev.preorder    || 0,
              updatedAt:   new Date().toISOString(),
            }
          }
          return {
            id: typeof loc.id === 'number' ? loc.id : Date.now() + Math.floor(Math.random() * 1000),
            location_name: loc.name.trim(),
            location_type: loc.location_type || 'in-store',
            quantity:    newQty,
            available:   newQty, // new location: everything is sellable by default
            unavailable: 0,
            reserve:     0,
            preorder:    0,
            updatedAt:   new Date().toISOString(),
          }
        })
      : []
    onSave(
      {
        sku: form.sku.trim(),
        name: form.name.trim(),
        productType: form.productType,
        threshold: product?.threshold || { storeThreshold: null, warehouseThreshold: null },
        stocks: parsedStocks,
        price: parseFloat(parseFloat(form.price).toFixed(2)),
        category: form.category.trim(),
      },
      openedAt.current
    )
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={isEdit ? 'Edit Product' : 'Add Product'}
      size="lg"
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-4">
          {/* Edit timestamp subtitle */}
          {isEdit && product?.updatedAt && (
            <p className="text-xs text-gray-400 -mt-2">
              Last updated: {new Date(product.updatedAt).toLocaleString()}
            </p>
          )}

          {/* SKU */}
          <DSInput
            label="SKU"
            required
            fullWidth
            value={form.sku}
            onChange={(e) => handleChange('sku', e.target.value)}
            state={errors.sku ? 'error' : 'default'}
            errorMessage={errors.sku}
            placeholder="e.g. SKU-006"
          />

          {/* Name */}
          <DSInput
            label="Name"
            required
            fullWidth
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
            state={errors.name ? 'error' : 'default'}
            errorMessage={errors.name}
            placeholder="Product name"
          />

          {/* Product type — drives whether stocks are tracked */}
          <Dropdown
            label="Product Type"
            options={[
              { value: 'physical', label: 'Physical (stock tracked)' },
              { value: 'digital',  label: 'Digital (no stock)' },
              { value: 'service',  label: 'Service (no stock)' },
            ]}
            value={form.productType}
            onChange={(val) => handleChange('productType', val)}
            fullWidth
          />

          {/* Locations — only for physical products */}
          {form.productType === 'physical' && (
            <div>
              <FormLabel required>Locations</FormLabel>
              {errors.locationsGeneral && (
                <p className="mb-2 text-xs text-red-600">{errors.locationsGeneral}</p>
              )}
              <div className="space-y-2">
                {form.stocks.map((loc, index) => {
                  const locErr = errors.stocks?.[index] || {}
                  return (
                    <div key={loc.id}>
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          <DSInput
                            fullWidth
                            value={loc.name}
                            onChange={(e) => handleLocationChange(index, 'name', e.target.value)}
                            placeholder="e.g. Warehouse A"
                            state={locErr.name ? 'error' : 'default'}
                            errorMessage={locErr.name}
                          />
                        </div>
                        <div className="w-24">
                          <DSInput
                            fullWidth
                            type="number"
                            value={loc.quantity}
                            onChange={(e) => handleLocationChange(index, 'quantity', e.target.value)}
                            placeholder="0"
                            state={locErr.quantity ? 'error' : 'default'}
                            errorMessage={locErr.quantity}
                          />
                        </div>
                        {form.stocks.length > 1 && (
                          <IconButton
                            type="button"
                            variant="ghost"
                            size="sm"
                            icon={<Trash2 size={15} />}
                            aria-label="Remove location"
                            onClick={() => handleRemoveLocation(index)}
                            className="mt-1"
                          />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-2">
                <DSButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  leftIcon={<Plus size={14} />}
                  onClick={handleAddLocation}
                >
                  Add Location
                </DSButton>
              </div>
            </div>
          )}

          {/* Price */}
          <DSInput
            label="Price ($)"
            required
            fullWidth
            type="number"
            value={form.price}
            onChange={(e) => handleChange('price', e.target.value)}
            state={errors.price ? 'error' : 'default'}
            errorMessage={errors.price}
            placeholder="0.00"
          />

          {/* Category — DS Dropdown with creatable + searchable (replaces native input + datalist) */}
          <div>
            <Dropdown
              label="Category"
              options={SUGGESTED_CATEGORIES.map((c) => ({ value: c, label: c }))}
              value={form.category}
              onChange={(val) => handleChange('category', val)}
              placeholder="e.g. Electronics"
              searchable
              creatable
              fullWidth
            />
            {errors.category && (
              <p className="mt-1 text-xs text-red-600">{errors.category}</p>
            )}
          </div>
        </div>

        {/* Conflict alerts */}
        {conflictType === 'deleted' && (
          <div className="mt-4">
            <Alert variant="error" title="Product deleted">
              <p className="text-sm">
                This product no longer exists — it may have been deleted.
              </p>
              <div className="mt-2">
                <DSButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onConflictClose}
                >
                  Close
                </DSButton>
              </div>
            </Alert>
          </div>
        )}

        {conflictType === 'modified' && (
          <div className="mt-4">
            <Alert variant="warning" title="Product modified since you opened this form">
              <p className="text-sm">Review before saving.</p>
              <div className="mt-2 flex gap-2">
                <DSButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onReloadLatest}
                >
                  Reload latest
                </DSButton>
                <DSButton
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => onSaveAnyway(conflictData?.pending)}
                >
                  Save anyway
                </DSButton>
              </div>
            </Alert>
          </div>
        )}

        {/* Footer */}
        <div className="mt-4">
          <Divider />
          <div className="flex justify-end gap-3 pt-4">
            <DSButton
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </DSButton>
            <DSButton
              type="submit"
              variant="primary"
              disabled={Boolean(conflictType)}
            >
              {isEdit ? 'Save Changes' : 'Add Product'}
            </DSButton>
          </div>
        </div>
      </form>
    </Modal>
  )
}
