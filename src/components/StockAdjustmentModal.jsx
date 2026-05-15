import React, { useState, useMemo, useEffect, useRef } from 'react'
import { Plus, Minus, AlertOctagon, ArrowRight, ArrowLeft, Upload } from 'lucide-react'
import {
  DSButton,
  DSInput,
  Dropdown,
  Modal,
  Alert,
  DSTable,
  RadioGroup,
  DSRadio,
  Stepper,
} from '@uxuissk/design-system'

// CARD-008: StockAdjustmentModal
// Multi-step modal for the 3 manual stock adjustment actions:
//   - 'add_stock'    -> available +qty, quantity +qty
//   - 'decrease'     -> available -qty, quantity -qty (block if qty > available)
//   - 'mark_damaged' -> available -qty, unavailable +qty, quantity unchanged (block if qty > available)
//
// Steps:
//   1. Opening screen: product summary + 5 stock fields aggregated across ALL locations.
//   2. Location select (CCS3 only). Patona auto-selects the first in-store location.
//   3. Qty + Reason entry. "Next: Review" calls onConfirm(adjustmentData) so the parent
//      can hand off to Leo's StockAdjustmentConfirmModal.
//
// mockApiError prop simulates an API failure on the Next: Review click — instead of
// invoking onConfirm, an inline error with Retry / Cancel is shown.

const ACTION_META = {
  add_stock: {
    label: 'Add Stock',
    icon: Plus,
    accent: 'text-emerald-700',
    accentBg: 'bg-emerald-50',
    accentBorder: 'border-emerald-200',
    reasons: [
      'Purchase Order',
      'Transfer In',
      'Return',
      'Correction',
      'Initial Stock',
      'Other',
    ],
  },
  decrease: {
    label: 'Decrease Stock',
    icon: Minus,
    accent: 'text-amber-700',
    accentBg: 'bg-amber-50',
    accentBorder: 'border-amber-200',
    reasons: ['Transfer Out', 'Robbery', 'Write-off', 'Make Damage', 'Other'],
  },
  mark_damaged: {
    label: 'Mark as Damaged',
    icon: AlertOctagon,
    accent: 'text-red-700',
    accentBg: 'bg-red-50',
    accentBorder: 'border-red-200',
    reasons: ['Damaged', 'Expired', 'Quarantined', 'Other'],
  },
}

const STEPS = {
  OPENING: 1,
  LOCATION: 2,
  ENTRY: 3,
}

export default function StockAdjustmentModal({
  product,
  action,
  role, // unused inside modal; gating happens in ProductTable
  context,
  onConfirm,
  onClose,
  mockApiError = false,
  // when set, mount on this step (1, 2, or 3) — used by the
  // confirm modal's Back nav to return the user to the entry step.
  initialStep,
  // pre-fill { locationId, qty, reason, note, imageFile } when re-entering.
  initialState,
}) {
  const meta = ACTION_META[action]
  const stocks = product?.stocks || []
  const isPatona = context === 'patona'

  // Patona: pre-select the first in-store location and skip step 2.
  const patonaDefaultStock = useMemo(
    () => stocks.find((s) => s.location_type === 'in-store') || null,
    [stocks]
  )

  const [step, setStep] = useState(initialStep ?? STEPS.OPENING)
  const [selectedLocationId, setSelectedLocationId] = useState(
    initialState?.locationId
      ?? (isPatona ? patonaDefaultStock?.id ?? null : null)
  )
  const [qty, setQty] = useState(initialState?.qty ?? '')
  const [reason, setReason] = useState(initialState?.reason ?? '')
  const [note, setNote] = useState(initialState?.note ?? '')
  const [imageFile, setImageFile] = useState(initialState?.imageFile ?? null)
  const [qtyError, setQtyError] = useState('')
  const [reasonError, setReasonError] = useState('')
  const [apiError, setApiError] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    // Reset on product/action change. Honor initialStep / initialState if
    // provided (e.g. user clicked Back from the confirm modal).
    setStep(initialStep ?? STEPS.OPENING)
    setSelectedLocationId(
      initialState?.locationId
        ?? (isPatona ? patonaDefaultStock?.id ?? null : null)
    )
    setQty(initialState?.qty ?? '')
    setReason(initialState?.reason ?? '')
    setNote(initialState?.note ?? '')
    setImageFile(initialState?.imageFile ?? null)
    setQtyError('')
    setReasonError('')
    setApiError(false)
    setSubmitting(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, action])

  if (!product || !meta) return null

  const selectedStock = stocks.find((s) => s.id === selectedLocationId) || null

  const totals = useMemo(() => {
    return stocks.reduce(
      (acc, s) => ({
        available: acc.available + (Number(s.available) || 0),
        unavailable: acc.unavailable + (Number(s.unavailable) || 0),
        reserve: acc.reserve + (Number(s.reserve) || 0),
        preorder: acc.preorder + (Number(s.preorder) || 0),
        onHand: acc.onHand + (Number(s.quantity) || 0),
      }),
      { available: 0, unavailable: 0, reserve: 0, preorder: 0, onHand: 0 }
    )
  }, [stocks])

  // Step navigation ----------------------------------------------------------
  const goNextFromOpening = () => {
    if (isPatona) {
      // Skip location select.
      setStep(STEPS.ENTRY)
    } else {
      setStep(STEPS.LOCATION)
    }
  }

  const goBackFromEntry = () => {
    setQtyError('')
    setReasonError('')
    setApiError(false)
    if (isPatona) {
      setStep(STEPS.OPENING)
    } else {
      setStep(STEPS.LOCATION)
    }
  }

  // Validation + submit ------------------------------------------------------
  const validateQty = (raw) => {
    if (raw === '' || raw === null || raw === undefined) {
      return { ok: false, error: 'Quantity is required' }
    }
    if (!/^\d+$/.test(String(raw).trim())) {
      return { ok: false, error: 'Must be a whole number' }
    }
    const n = parseInt(raw, 10)
    if (Number.isNaN(n) || n < 1) {
      return { ok: false, error: 'Must be at least 1' }
    }
    if (n > 999999) {
      return { ok: false, error: 'Maximum is 999,999' }
    }
    if (
      (action === 'decrease' || action === 'mark_damaged') &&
      selectedStock &&
      n > (Number(selectedStock.available) || 0)
    ) {
      return {
        ok: false,
        error: `Exceeds available stock (${Number(selectedStock.available) || 0} available)`,
      }
    }
    return { ok: true, value: n }
  }

  const handleNextReview = () => {
    setApiError(false)
    const qRes = validateQty(qty)
    const rError = !reason ? 'Please select a reason' : ''
    setQtyError(qRes.ok ? '' : qRes.error)
    setReasonError(rError)
    if (!qRes.ok || rError) return
    if (!selectedStock) {
      // Defensive — entry step shouldn't be reachable without a selected stock.
      return
    }

    setSubmitting(true)
    // Simulate API call. If mockApiError flag is set, fail; otherwise hand off
    // to parent which opens the confirmation modal.
    if (mockApiError) {
      setApiError(true)
      setSubmitting(false)
      return
    }
    onConfirm({
      productId: product.id,
      action,
      locationId: selectedStock.id,
      qty: qRes.value,
      reason,
      note: note.trim() || null,
      imageFile: imageFile || null,
      imageFileName: imageFile?.name || null,
    })
    setSubmitting(false)
  }

  const handleRetry = () => {
    setApiError(false)
    setSubmitting(false)
  }

  // Total step count for progress dots: Patona has 2 steps (opening -> entry),
  // CCS3 has 3 (opening -> location -> entry).
  const totalSteps = isPatona ? 2 : 3
  // Map internal STEPS enum to a 1..totalSteps display index.
  const displayStep =
    step === STEPS.OPENING ? 1 : step === STEPS.LOCATION ? 2 : isPatona ? 2 : 3

  // Determine "Next: Review" button variant based on action
  const nextReviewVariant = action === 'mark_damaged' ? 'destructive' : 'primary'

  // Footer passed to Modal
  const footer = (
    <div className="flex justify-between w-full">
      <div>
        {step !== STEPS.OPENING && (
          <DSButton
            variant="outline"
            leftIcon={<ArrowLeft size={14} />}
            onClick={() => {
              if (step === STEPS.ENTRY) {
                goBackFromEntry()
              } else {
                setStep(STEPS.OPENING)
              }
            }}
          >
            Back
          </DSButton>
        )}
      </div>
      <div className="flex gap-2">
        <DSButton variant="outline" onClick={onClose}>
          Cancel
        </DSButton>
        {step === STEPS.OPENING && (
          <DSButton
            variant="primary"
            rightIcon={<ArrowRight size={14} />}
            onClick={goNextFromOpening}
          >
            Next
          </DSButton>
        )}
        {step === STEPS.LOCATION && (
          <DSButton
            variant="primary"
            rightIcon={<ArrowRight size={14} />}
            disabled={!selectedLocationId}
            onClick={() => setStep(STEPS.ENTRY)}
          >
            Next
          </DSButton>
        )}
        {step === STEPS.ENTRY && (
          <DSButton
            variant={nextReviewVariant}
            rightIcon={<ArrowRight size={14} />}
            disabled={submitting}
            onClick={handleNextReview}
          >
            Next: Review
          </DSButton>
        )}
      </div>
    </div>
  )

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={meta.label}
      size="lg"
      footer={footer}
    >
      {/* Product subtitle */}
      <div className="mb-4 -mt-2">
        <p className="text-sm text-gray-600">{product.name}</p>
        {product.sku && (
          <p className="text-xs text-gray-500">SKU: {product.sku}</p>
        )}
      </div>

      {/* Step indicator */}
      {(() => {
        const stepDefs = isPatona
          ? [{ title: 'Overview' }, { title: 'Entry' }]
          : [{ title: 'Overview' }, { title: 'Location' }, { title: 'Entry' }]
        const currentStep = displayStep - 1
        return (
          <div className="mb-5">
            <Stepper steps={stepDefs} current={currentStep} orientation="horizontal" />
          </div>
        )
      })()}

      {/* Step body */}
      {step === STEPS.OPENING && (
        <OpeningStep meta={meta} totals={totals} />
      )}
      {step === STEPS.LOCATION && (
        <LocationStep
          stocks={stocks.filter((s) => s.location_type === 'in-store')}
          selectedLocationId={selectedLocationId}
          onSelect={setSelectedLocationId}
        />
      )}
      {step === STEPS.ENTRY && (
        <EntryStep
          meta={meta}
          action={action}
          selectedStock={selectedStock}
          qty={qty}
          setQty={(v) => {
            setQty(v)
            if (qtyError) setQtyError('')
            if (apiError) setApiError(false)
          }}
          reason={reason}
          setReason={(v) => {
            setReason(v)
            if (reasonError) setReasonError('')
            if (apiError) setApiError(false)
          }}
          note={note}
          setNote={setNote}
          imageFile={imageFile}
          setImageFile={setImageFile}
          fileInputRef={fileInputRef}
          qtyError={qtyError}
          reasonError={reasonError}
          apiError={apiError}
          onRetry={handleRetry}
          onCancel={onClose}
        />
      )}
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Step 1 — Opening summary
// ---------------------------------------------------------------------------
function OpeningStep({ meta, totals }) {
  const stockColumns = [
    { key: 'field', header: 'Field', render: (_, row) => <span className={row.bold ? 'font-semibold' : ''}>{row.field}</span> },
    { key: 'value', header: 'Total', render: (_, row) => <span className={`tabular-nums text-right block ${row.bold ? 'font-semibold text-gray-900' : 'text-gray-900'}`}>{Number(row.value).toLocaleString()}</span> },
  ]
  const stockData = [
    { field: 'Available',   value: totals.available,   bold: false },
    { field: 'Unavailable', value: totals.unavailable, bold: false },
    { field: 'Reserve',     value: totals.reserve,     bold: false },
    { field: 'Preorder',    value: totals.preorder,    bold: false },
    { field: 'On Hand',     value: totals.onHand,      bold: true  },
  ]
  return (
    <div className="space-y-4">
      <div className={`rounded-md border p-3 text-sm ${meta.accentBg} ${meta.accentBorder} ${meta.accent}`}>
        Review the current stock totals before proceeding with{' '}
        <span className="font-semibold">{meta.label}</span>.
      </div>
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
          Current Stock — All Locations
        </h3>
        <DSTable columns={stockColumns} data={stockData} bordered />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 2 — Location selection (CCS3 only)
// ---------------------------------------------------------------------------
function LocationStep({ stocks, selectedLocationId, onSelect }) {
  if (!stocks.length) {
    return (
      <Alert variant="warning" title="No locations">
        This product has no stock locations configured.
      </Alert>
    )
  }
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
        Select Location
      </h3>
      <RadioGroup
        name="location"
        value={selectedLocationId ?? ''}
        onChange={onSelect}
        direction="vertical"
      >
        {stocks.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-md border border-gray-200 p-3 hover:bg-gray-50 transition-colors">
            <DSRadio
              value={s.id}
              label={s.location_name}
              description={`${s.location_type}`}
            />
            <div className="text-right ml-4">
              <div className="text-xs text-gray-500">Available</div>
              <div className="font-semibold tabular-nums text-gray-900">
                {Number(s.available).toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </RadioGroup>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 3 — Qty + Reason + Note + Image entry
// ---------------------------------------------------------------------------
function EntryStep({
  meta,
  action,
  selectedStock,
  qty,
  setQty,
  reason,
  setReason,
  note,
  setNote,
  imageFile,
  setImageFile,
  fileInputRef,
  qtyError,
  reasonError,
  apiError,
  onRetry,
  onCancel,
}) {
  const handleFilePick = (e) => {
    const f = e.target.files?.[0] || null
    if (f && !f.type.startsWith('image/')) return
    setImageFile(f)
  }
  const clearFile = () => {
    setImageFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="space-y-4">
      {selectedStock && (
        <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-gray-500">
                Location
              </div>
              <div className="font-medium text-gray-900">
                {selectedStock.location_name}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wider text-gray-500">
                Current Available
              </div>
              <div className="font-semibold tabular-nums text-gray-900">
                {Number(selectedStock.available).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      <DSInput
        label="Quantity"
        fullWidth
        type="number"
        value={qty}
        onChange={(e) => setQty(e.target.value)}
        placeholder="Enter quantity"
        state={qtyError ? 'error' : 'default'}
        errorMessage={qtyError}
        helperText={`Whole number between 1 and 999,999${
          (action === 'decrease' || action === 'mark_damaged') && selectedStock
            ? ` — cannot exceed ${Number(selectedStock.available).toLocaleString()} available`
            : ''
        }`}
      />

      <Dropdown
        label="Reason"
        fullWidth
        options={meta.reasons.map((r) => ({ value: r, label: r }))}
        value={reason}
        onChange={(val) => setReason(val)}
        placeholder="Select a reason…"
      />
      {reasonError && (
        <p className="text-xs text-red-600 -mt-2">{reasonError}</p>
      )}

      <DSInput
        label="Note"
        fullWidth
        as="textarea"
        rows={3}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note about this adjustment"
        helperText="Optional"
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Attach Image
        </label>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFilePick}
            className="hidden"
            id="adjustment-image-input"
          />
          <DSButton
            type="button"
            variant="outline"
            leftIcon={<Upload size={14} />}
            onClick={() => fileInputRef.current?.click()}
          >
            {imageFile ? 'Replace Image' : 'Choose Image'}
          </DSButton>
          {imageFile && (
            <>
              <span className="text-sm text-gray-700 truncate max-w-[200px]">
                {imageFile.name}
              </span>
              <DSButton type="button" variant="outline" size="sm" onClick={clearFile}>
                Remove
              </DSButton>
            </>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1">Optional. Single image file (PNG, JPG, etc.).</p>
      </div>

      {apiError && (
        <Alert variant="error" title="Something went wrong. Please try again.">
          <div className="flex gap-2 mt-2">
            <DSButton type="button" variant="outline" size="sm" onClick={onRetry}>
              Retry
            </DSButton>
            <DSButton type="button" variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </DSButton>
          </div>
        </Alert>
      )}
    </div>
  )
}
