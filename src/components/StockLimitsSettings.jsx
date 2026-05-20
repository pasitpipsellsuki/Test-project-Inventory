import { useState, useEffect } from 'react'
import { Alert, DSButton, DSInput } from '@uxuissk/design-system'

/**
 * StockLimitsSettings — CARD-019
 *
 * Full-page settings view for per-SKU Min/Max stock limits.
 *
 * Props:
 *   products: full products array
 *   role: 'company_owner' | 'store_admin' | 'store_staff'
 *   onSave: (updatedProducts) => void
 *   context: optional, not required for logic
 *
 * Only physical products are configurable. Company Owner edits; other roles
 * see a read-only table.
 */
export default function StockLimitsSettings({ products = [], role, onSave }) {
  const isEditable = role === 'company_owner'
  const physicalProducts = products.filter((p) => p.productType === 'physical')

  const buildInitialValues = () => {
    const init = {}
    physicalProducts.forEach((p) => {
      init[p.id] = {
        min: p.stockLimits?.min != null ? String(p.stockLimits.min) : '',
        max: p.stockLimits?.max != null ? String(p.stockLimits.max) : '',
      }
    })
    return init
  }

  const [values, setValues] = useState(buildInitialValues)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    setValues(buildInitialValues())
    setErrors({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products])

  const handleChange = (productId, field, raw) => {
    setValues((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], [field]: raw },
    }))
    setErrors((prev) => {
      if (!prev[productId]?.[field]) return prev
      return {
        ...prev,
        [productId]: { ...prev[productId], [field]: '' },
      }
    })
  }

  // Returns { ok, parsed: number|null, error }. allowZero gates min vs max.
  const parseField = (raw, { allowZero }) => {
    const trimmed = String(raw ?? '').trim()
    if (trimmed === '') return { ok: true, parsed: null, error: '' }
    if (!/^\d+$/.test(trimmed)) {
      return { ok: false, parsed: null, error: 'Must be a whole number' }
    }
    const parsed = parseInt(trimmed, 10)
    if (allowZero ? parsed < 0 : parsed < 1) {
      return {
        ok: false,
        parsed: null,
        error: allowZero ? 'Must be 0 or greater' : 'Must be a positive number',
      }
    }
    return { ok: true, parsed, error: '' }
  }

  const handleSave = () => {
    if (!isEditable) return

    const newErrors = {}
    const resolved = {}
    let valid = true

    physicalProducts.forEach((p) => {
      const v = values[p.id] || { min: '', max: '' }
      const minResult = parseField(v.min, { allowZero: true })
      const maxResult = parseField(v.max, { allowZero: false })

      const fieldErrors = {}
      if (!minResult.ok) fieldErrors.min = minResult.error
      if (!maxResult.ok) fieldErrors.max = maxResult.error

      if (minResult.ok && maxResult.ok) {
        if (maxResult.parsed != null && minResult.parsed == null) {
          fieldErrors.min = 'Min is required when Max is set'
        } else if (
          maxResult.parsed != null &&
          minResult.parsed != null &&
          maxResult.parsed <= minResult.parsed
        ) {
          fieldErrors.max = 'Max must be greater than Min'
        }
      }

      if (Object.keys(fieldErrors).length > 0) {
        newErrors[p.id] = fieldErrors
        valid = false
      } else {
        resolved[p.id] = {
          min: minResult.parsed,
          max: maxResult.parsed,
        }
      }
    })

    if (!valid) {
      setErrors(newErrors)
      return
    }

    const updatedProducts = products.map((p) => {
      if (p.productType !== 'physical') return p
      const limits = resolved[p.id]
      if (!limits) return p
      return {
        ...p,
        stockLimits: { min: limits.min, max: limits.max },
        updatedAt: new Date().toISOString(),
      }
    })

    setErrors({})
    onSave(updatedProducts)
  }

  const handleCancel = () => {
    setValues(buildInitialValues())
    setErrors({})
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Stock Limits</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Configure Min and Max stock limits per product. Min drives the low
          stock indicator (sum of in-store available units at or below Min).
          Max is informational only.
        </p>
      </div>

      {!isEditable && (
        <div className="mb-4">
          <Alert variant="info">
            Stock limit settings are view-only for your role. Contact a Company
            Owner to make changes.
          </Alert>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        {physicalProducts.length === 0 ? (
          <p className="text-sm text-gray-500">No physical products available.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="py-2 pr-4">Product Name</th>
                <th className="py-2 pr-4">SKU</th>
                <th className="py-2 pr-4 w-40">Min</th>
                <th className="py-2 pr-4 w-40">Max</th>
              </tr>
            </thead>
            <tbody>
              {physicalProducts.map((p) => {
                const v = values[p.id] || { min: '', max: '' }
                const e = errors[p.id] || {}
                return (
                  <tr key={p.id} className="border-b border-gray-100 align-top">
                    <td className="py-3 pr-4 font-medium text-gray-900">
                      {p.name}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="font-mono text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                        {p.sku}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <DSInput
                        type="number"
                        fullWidth
                        value={v.min}
                        onChange={(ev) => handleChange(p.id, 'min', ev.target.value)}
                        state={e.min ? 'error' : 'default'}
                        errorMessage={e.min}
                        placeholder="No limit"
                        disabled={!isEditable}
                      />
                    </td>
                    <td className="py-3 pr-4">
                      <DSInput
                        type="number"
                        fullWidth
                        value={v.max}
                        onChange={(ev) => handleChange(p.id, 'max', ev.target.value)}
                        state={e.max ? 'error' : 'default'}
                        errorMessage={e.max}
                        placeholder="No limit"
                        disabled={!isEditable}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        <p className="text-xs text-gray-400 mt-4">
          Non-physical products do not have stock limits.
        </p>

        {isEditable && physicalProducts.length > 0 && (
          <div className="flex justify-end gap-2 mt-6">
            <DSButton variant="outline" onClick={handleCancel}>
              Cancel
            </DSButton>
            <DSButton variant="primary" onClick={handleSave}>
              Save
            </DSButton>
          </div>
        )}
      </div>
    </div>
  )
}
