import { useState, useEffect } from 'react'
import { Alert, DSButton, DSInput, Modal } from "@uxuissk/design-system"

/**
 * StockThresholdModal
 *
 * Props:
 *   product: { id, name, sku, productType, stocks: [{ id, location_name, location_type, threshold, ... }] }
 *   role: 'company_owner' | 'store_admin' | 'store_staff'
 *   onSave: (productId, locationThresholds) => void
 *         locationThresholds = [{ locationId, threshold: number | null }]
 *   onClose: () => void
 *
 * Role-based visibility:
 *   company_owner -> all locations editable
 *   store_admin   -> in-store locations only
 *   store_staff   -> read-only message
 */
const StockThresholdModal = ({ product, role, onSave, onClose }) => {
  const stocks = product?.stocks || []
  const isReadOnly = role === 'store_staff'

  const visibleStocks = role === 'company_owner'
    ? stocks
    : stocks.filter((s) => s.location_type === 'in-store')

  const buildInitialValues = () => {
    const init = {}
    visibleStocks.forEach((s) => {
      init[s.id] = s.threshold != null ? String(s.threshold) : ''
    })
    return init
  }

  const [values, setValues] = useState(buildInitialValues)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    setValues(buildInitialValues())
    setErrors({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id])

  const validateValue = (raw) => {
    if (raw === '' || raw === null || raw === undefined) {
      return { ok: true, parsed: null, error: '' }
    }
    if (!/^-?\d+$/.test(String(raw).trim())) {
      return { ok: false, parsed: null, error: 'Must be a whole number' }
    }
    const parsed = parseInt(raw, 10)
    if (Number.isNaN(parsed) || parsed < 1) {
      return { ok: false, parsed: null, error: 'Must be 1 or greater' }
    }
    return { ok: true, parsed, error: '' }
  }

  const handleSave = () => {
    if (isReadOnly) { onClose(); return }

    const newErrors = {}
    const locationThresholds = []
    let valid = true

    visibleStocks.forEach((s) => {
      const r = validateValue(values[s.id])
      if (!r.ok) {
        newErrors[s.id] = r.error
        valid = false
      } else {
        locationThresholds.push({ locationId: s.id, threshold: r.parsed })
      }
    })

    if (!valid) { setErrors(newErrors); return }

    // Preserve thresholds for locations not shown to this role
    const allLocationThresholds = stocks.map((s) => {
      const found = locationThresholds.find((lt) => lt.locationId === s.id)
      return found ?? { locationId: s.id, threshold: s.threshold ?? null }
    })

    onSave(product.id, allLocationThresholds)
    onClose()
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Stock Alert Threshold"
      size="md"
      footer={
        <div className="flex justify-end gap-2 w-full">
          <DSButton variant="outline" onClick={onClose}>Cancel</DSButton>
          {!isReadOnly && (
            <DSButton variant="primary" onClick={handleSave}>Save Thresholds</DSButton>
          )}
        </div>
      }
    >
      <div className="mb-4">
        <p className="text-sm font-medium text-gray-900">{product?.name}</p>
        {product?.sku && (
          <p className="text-xs text-gray-500">SKU: {product.sku}</p>
        )}
      </div>

      <p className="text-xs text-gray-500 mb-4">
        Set an alert threshold per location. An alert triggers when available stock at that location
        drops below the threshold. Leave empty for no alert.
      </p>

      <div className="space-y-4">
        {isReadOnly && (
          <Alert variant="warning">
            You do not have permission to change stock alert thresholds.
            Please contact a Store Admin or Company Owner.
          </Alert>
        )}

        {visibleStocks.length === 0 && !isReadOnly && (
          <Alert variant="warning">
            No locations available to configure.
          </Alert>
        )}

        {visibleStocks.map((s) => (
          <DSInput
            key={s.id}
            label={s.location_name}
            type="number"
            fullWidth
            value={values[s.id] ?? ''}
            onChange={(e) => {
              setValues((prev) => ({ ...prev, [s.id]: e.target.value }))
              if (errors[s.id]) setErrors((prev) => ({ ...prev, [s.id]: '' }))
            }}
            state={errors[s.id] ? 'error' : 'default'}
            errorMessage={errors[s.id]}
            helperText="Alert when available stock drops below this number"
            placeholder="Leave empty for no alert"
            disabled={isReadOnly}
          />
        ))}
      </div>
    </Modal>
  )
}

export default StockThresholdModal
