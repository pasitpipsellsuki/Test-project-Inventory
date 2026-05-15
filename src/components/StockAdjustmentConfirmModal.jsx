import { useEffect, useMemo } from 'react'
import { DSButton, Badge, Modal } from '@uxuissk/design-system'

/**
 * StockAdjustmentConfirmModal
 *
 * Final review step before committing a stock adjustment. Shows the
 * current values for the selected stock location and the projected
 * values after the adjustment is applied.
 *
 * Props:
 *   product:    full product object ({ id, name, sku, stocks, ... })
 *   adjustment: { productId, action, locationId, qty, reason }
 *               action ∈ 'add_stock' | 'decrease' | 'mark_damaged'
 *   stocks:     product.stocks — the CURRENT (pre-adjustment) stocks array
 *   onConfirm:  () => void  — user clicks Confirm
 *   onBack:     () => void  — user clicks Back (returns to entry form)
 *   onCancel:   () => void  — user clicks Cancel / closes modal
 */

const ACTION_META = {
  add_stock: {
    label: 'Add Stock',
    badgeVariant: 'success',
    confirmVariant: 'primary',
    impactColor: 'text-green-700',
    sign: '+',
  },
  decrease: {
    label: 'Decrease',
    badgeVariant: 'destructive',
    confirmVariant: 'destructive',
    impactColor: 'text-red-700',
    sign: '−',
  },
  mark_damaged: {
    label: 'Mark Damaged',
    badgeVariant: 'warning',
    confirmVariant: 'destructive',
    impactColor: 'text-amber-700',
    sign: '−',
  },
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right break-words">
        {value}
      </span>
    </div>
  )
}

function ImpactRow({ label, current, projected, deltaText, deltaClass }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="text-right">
        <div className="text-sm">
          <span className="text-gray-500">{current}</span>
          <span className="mx-1.5 text-gray-400">→</span>
          <span className="font-semibold text-gray-900">{projected}</span>
        </div>
        {deltaText && (
          <div className={`text-xs mt-0.5 font-medium ${deltaClass}`}>
            {deltaText}
          </div>
        )}
      </div>
    </div>
  )
}

export default function StockAdjustmentConfirmModal({
  product,
  adjustment,
  stocks,
  onConfirm,
  onBack,
  onCancel,
}) {
  // Close on Escape — treat as Cancel (kept for safety; DS Modal may not handle it)
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') onCancel?.()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onCancel])

  const meta = ACTION_META[adjustment?.action] || {
    label: adjustment?.action || 'Adjustment',
    badgeVariant: 'default',
    confirmVariant: 'primary',
    impactColor: 'text-gray-700',
    sign: '',
  }

  const stockEntry = useMemo(() => {
    const list = Array.isArray(stocks) ? stocks : []
    return list.find((s) => s.id === adjustment?.locationId) || null
  }, [stocks, adjustment?.locationId])

  if (!product || !adjustment) return null

  const qty = Number(adjustment.qty) || 0
  const currentAvailable = stockEntry?.available ?? 0
  const currentUnavailable = stockEntry?.unavailable ?? 0
  const currentQuantity = stockEntry?.quantity ?? 0

  let projectedAvailable = currentAvailable
  let projectedUnavailable = currentUnavailable
  let projectedQuantity = currentQuantity

  switch (adjustment.action) {
    case 'add_stock':
      projectedAvailable = currentAvailable + qty
      projectedQuantity = currentQuantity + qty
      break
    case 'decrease':
      projectedAvailable = currentAvailable - qty
      projectedQuantity = currentQuantity - qty
      break
    case 'mark_damaged':
      projectedAvailable = currentAvailable - qty
      projectedUnavailable = currentUnavailable + qty
      // quantity unchanged
      break
    default:
      break
  }

  const locationName = stockEntry?.location_name || '—'

  const footer = (
    <div className="flex justify-between w-full">
      <DSButton variant="outline" onClick={onBack}>
        Back
      </DSButton>
      <div className="flex gap-2">
        <DSButton variant="outline" onClick={onCancel}>
          Cancel
        </DSButton>
        <DSButton variant={meta.confirmVariant} onClick={onConfirm}>
          Confirm
        </DSButton>
      </div>
    </div>
  )

  return (
    <Modal
      open={true}
      onClose={onCancel}
      title="Confirm Stock Adjustment"
      size="md"
      footer={footer}
    >
      {/* Action badge below title */}
      <div className="mb-4 -mt-2">
        <Badge variant={meta.badgeVariant}>{meta.label}</Badge>
      </div>

      {/* Review summary */}
      <div className="space-y-0.5">
        <SummaryRow
          label="Product"
          value={
            <span>
              {product.name}
              {product.sku && (
                <span className="block text-xs text-gray-500 font-normal">
                  SKU: {product.sku}
                </span>
              )}
            </span>
          }
        />
        <SummaryRow label="Location" value={locationName} />
        <SummaryRow label="Action" value={meta.label} />
        <SummaryRow label="Reason" value={adjustment.reason || '—'} />
        <SummaryRow label="Quantity" value={`${meta.sign}${qty}`} />
        {adjustment.note && <SummaryRow label="Note" value={adjustment.note} />}
        {adjustment.imageFileName && <SummaryRow label="Image" value={adjustment.imageFileName} />}
      </div>

      {/* Divider — Stock Impact */}
      <div className="mt-5 mb-2 flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs font-semibold tracking-wide uppercase text-gray-500">
          Stock Impact
        </span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
        {adjustment.action === 'mark_damaged' ? (
          <>
            <ImpactRow
              label="Available"
              current={currentAvailable}
              projected={projectedAvailable}
              deltaText={`Available −${qty} → ${projectedAvailable}`}
              deltaClass="text-red-700"
            />
            <ImpactRow
              label="Unavailable"
              current={currentUnavailable}
              projected={projectedUnavailable}
              deltaText={`Unavailable +${qty} → ${projectedUnavailable}`}
              deltaClass="text-amber-700"
            />
            <ImpactRow
              label="On Hand (quantity)"
              current={currentQuantity}
              projected={projectedQuantity}
              deltaText="Unchanged"
              deltaClass="text-gray-500"
            />
          </>
        ) : (
          <>
            <ImpactRow
              label="Available"
              current={currentAvailable}
              projected={projectedAvailable}
              deltaText={`${meta.sign}${qty}`}
              deltaClass={meta.impactColor}
            />
            <ImpactRow
              label="On Hand (quantity)"
              current={currentQuantity}
              projected={projectedQuantity}
              deltaText={`${meta.sign}${qty}`}
              deltaClass={meta.impactColor}
            />
          </>
        )}
      </div>
    </Modal>
  )
}
