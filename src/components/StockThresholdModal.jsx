import { useState, useEffect } from 'react'
import { Alert, DSButton, DSInput, Modal } from "@uxuissk/design-system"

/**
 * StockThresholdModal
 *
 * Props:
 *   product: { id, name, sku, productType, stockLimits: { min, max } }
 *   role: 'company_owner' | 'store_admin' | 'store_staff'
 *   onSave: (productId, { min, max }) => void
 *         min, max = number | null
 *   onClose: () => void
 *
 * Role-based visibility:
 *   company_owner -> editable
 *   store_admin   -> editable
 *   store_staff   -> read-only message
 *
 * CARD-020: redesigned from per-location threshold inputs to a 2-field
 * Master Min/Max editor backed by product.stockLimits.
 */
const StockThresholdModal = ({ product, role, onSave, onClose }) => {
  const isReadOnly = role === 'store_staff'

  const buildInitialValues = () => ({
    min: product?.stockLimits?.min != null ? String(product.stockLimits.min) : '',
    max: product?.stockLimits?.max != null ? String(product.stockLimits.max) : '',
  })

  const [values, setValues] = useState(buildInitialValues)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    setValues(buildInitialValues())
    setErrors({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id])

  const parseField = (raw) => {
    if (raw === '' || raw === null || raw === undefined) {
      return { ok: true, parsed: null, error: '' }
    }
    if (!/^\d+$/.test(String(raw).trim())) {
      return { ok: false, parsed: null, error: 'Must be a non-negative whole number' }
    }
    const parsed = parseInt(raw, 10)
    if (Number.isNaN(parsed) || parsed < 0) {
      return { ok: false, parsed: null, error: 'Must be 0 or greater' }
    }
    return { ok: true, parsed, error: '' }
  }

  const handleSave = () => {
    if (isReadOnly) { onClose(); return }

    const minResult = parseField(values.min)
    const maxResult = parseField(values.max)
    const newErrors = {}

    if (!minResult.ok) newErrors.min = minResult.error
    if (!maxResult.ok) newErrors.max = maxResult.error

    if (
      minResult.ok &&
      maxResult.ok &&
      minResult.parsed != null &&
      maxResult.parsed != null &&
      maxResult.parsed <= minResult.parsed
    ) {
      newErrors.max = 'Maximum must be greater than Minimum'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    onSave(product.id, { min: minResult.parsed, max: maxResult.parsed })
    onClose()
  }

  const handleChange = (field) => (e) => {
    const next = e.target.value
    setValues((prev) => ({ ...prev, [field]: next }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }))
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
        Set master Min/Max stock thresholds for this product. Leave a field empty
        for no limit.
      </p>

      <div className="space-y-4">
        {isReadOnly && (
          <Alert variant="warning">
            You do not have permission to change stock alert thresholds.
            Please contact a Store Admin or Company Owner.
          </Alert>
        )}

        <DSInput
          label="Minimum Stock Threshold"
          type="number"
          fullWidth
          value={values.min}
          onChange={handleChange('min')}
          state={errors.min ? 'error' : 'default'}
          errorMessage={errors.min}
          helperText="Alert triggers when total available falls at or below this number"
          placeholder="Leave empty for no limit"
          disabled={isReadOnly}
        />

        <DSInput
          label="Maximum Stock Threshold"
          type="number"
          fullWidth
          value={values.max}
          onChange={handleChange('max')}
          state={errors.max ? 'error' : 'default'}
          errorMessage={errors.max}
          helperText="Informational upper limit. No blocking in Adjust flow."
          placeholder="Leave empty for no limit"
          disabled={isReadOnly}
        />

        <Alert variant="info">
          Per-store threshold overrides can be configured by Store Admin in OMS.
        </Alert>
      </div>
    </Modal>
  )
}

export default StockThresholdModal
