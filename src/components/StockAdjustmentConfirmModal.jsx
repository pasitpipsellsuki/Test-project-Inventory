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
 *               action ∈ 'add' | 'decrease' | 'mark_unavailable' | 'restore_to_available'
 *   stocks:     product.stocks — the CURRENT (pre-adjustment) stocks array
 *   onConfirm:  () => void  — user clicks Confirm
 *   onBack:     () => void  — user clicks Back (returns to entry form)
 *   onCancel:   () => void  — user clicks Cancel / closes modal
 *
 * CARD-018: BRD PIS-INV-01 Round 8. The stock impact is reason-driven. The
 * incoming `adjustment.action` is the effective effect type computed by
 * StockAdjustmentModal's getEffectiveType(resolvedType, reason); the
 * 'Restore to Available' and 'Mark Unavailable (...)' reasons reclassify stock
 * between the Available and Unavailable pools while On Hand stays unchanged.
 * resolveEffectiveType() recomputes from the reason defensively so the deltas
 * are correct even if `action` is passed as the raw picked type.
 */

// Recompute the effective stock-effect type from the picked action + reason.
// Mirrors getEffectiveType in StockAdjustmentModal.
function resolveEffectiveType(action, reason) {
  if (reason === 'Restore to Available') return 'restore_to_available'
  if (typeof reason === 'string' && reason.startsWith('Mark Unavailable')) {
    return 'mark_unavailable'
  }
  return action
}

const ACTION_META = {
  add: {
    label: 'Add Stock',
    badgeVariant: 'success',
    confirmVariant: 'primary',
    impactColor: 'text-green-700',
    sign: '+',
  },
  decrease: {
    label: 'Decrease Stock',
    badgeVariant: 'destructive',
    confirmVariant: 'destructive',
    impactColor: 'text-red-700',
    sign: '−',
  },
  mark_unavailable: {
    label: 'Mark Unavailable',
    badgeVariant: 'destructive',
    confirmVariant: 'destructive',
    impactColor: 'text-red-700',
    sign: '−',
  },
  restore_to_available: {
    label: 'Restore to Available',
    badgeVariant: 'info',
    confirmVariant: 'primary',
    impactColor: 'text-blue-700',
    sign: '+',
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

  // Effective stock-effect type — reason-driven, recomputed defensively.
  const effectiveType = resolveEffectiveType(
    adjustment?.action,
    adjustment?.reason
  )

  const meta = ACTION_META[effectiveType] || {
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

  switch (effectiveType) {
    case 'add':
      // Standard add (incl. Transfer In): Available +qty, On Hand +qty.
      projectedAvailable = currentAvailable + qty
      projectedQuantity = currentQuantity + qty
      break
    case 'decrease':
      // Standard decrease (incl. Transfer Out): Available -qty, On Hand -qty.
      projectedAvailable = currentAvailable - qty
      projectedQuantity = currentQuantity - qty
      break
    case 'mark_unavailable':
      // Decrease + 'Mark Unavailable (...)' reason:
      // Available -qty, Unavailable +qty, On Hand unchanged.
      projectedAvailable = currentAvailable - qty
      projectedUnavailable = currentUnavailable + qty
      break
    case 'restore_to_available':
      // Add + 'Restore to Available' reason:
      // Unavailable -qty, Available +qty, On Hand unchanged.
      projectedAvailable = currentAvailable + qty
      projectedUnavailable = currentUnavailable - qty
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
      title={`Confirm — ${meta.label}`}
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
        {effectiveType === 'mark_unavailable' ||
        effectiveType === 'restore_to_available' ? (
          // Reclassification reasons: shift between Available and Unavailable;
          // On Hand stays the same.
          (() => {
            const isMark = effectiveType === 'mark_unavailable'
            // mark_unavailable: Available −qty, Unavailable +qty.
            // restore_to_available: Available +qty, Unavailable −qty.
            return (
              <>
                <ImpactRow
                  label="Available"
                  current={currentAvailable}
                  projected={projectedAvailable}
                  deltaText={`Available ${isMark ? '−' : '+'}${qty} → ${projectedAvailable}`}
                  deltaClass={isMark ? 'text-red-700' : 'text-blue-700'}
                />
                <ImpactRow
                  label="Unavailable"
                  current={currentUnavailable}
                  projected={projectedUnavailable}
                  deltaText={`Unavailable ${isMark ? '+' : '−'}${qty} → ${projectedUnavailable}`}
                  deltaClass={isMark ? 'text-amber-700' : 'text-blue-700'}
                />
                <ImpactRow
                  label="On Hand (quantity)"
                  current={currentQuantity}
                  projected={projectedQuantity}
                  deltaText="Unchanged"
                  deltaClass="text-gray-500"
                />
              </>
            )
          })()
        ) : (
          // add / decrease (via the 'adjust' action): Available and On Hand
          // both move by ±qty.
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
