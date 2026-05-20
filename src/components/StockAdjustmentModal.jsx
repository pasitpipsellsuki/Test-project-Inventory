import React, { useState, useMemo, useEffect, useRef } from 'react'
import {
  Plus,
  Minus,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  Upload,
} from 'lucide-react'
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

// CARD-018: StockAdjustmentModal — BRD PIS-INV-01 Round 8 refactor.
//
// The product action menu now has only 3 entries: Adjust Stock / Edit / Delete.
// Mark Unavailable, Restore to Available, Transfer In and Transfer Out are no
// longer separate entry points — they are reason codes inside the Add / Decrease
// flows. The modal therefore only supports the single 'adjust' action.
//
//   - 'adjust' -> a merged Add+Decrease flow. Adds a TYPE_SELECT sub-step where
//                 the user picks 'add' or 'decrease'. When opened with
//                 preSelectedType ('add' | 'decrease') the TYPE_SELECT step is
//                 skipped.
//
// The stock *effect* is reason-driven, not type-driven:
//   - reason 'Restore to Available'        -> Unavailable -qty, Available +qty,
//                                             On Hand unchanged. qty <= Unavailable.
//   - reason 'Mark Unavailable (...)'      -> Available -qty, Unavailable +qty,
//                                             On Hand unchanged. qty <= Available.
//   - all other Add reasons                -> Available +qty, On Hand +qty.
//   - all other Decrease reasons           -> Available -qty, On Hand -qty.
//
// getEffectiveType(resolvedType, reason) maps a (type, reason) pair to the
// effective effect type ('add' | 'decrease' | 'mark_unavailable' |
// 'restore_to_available') passed to onConfirm and the confirm modal.
//
// Steps:
//   adjust:                OPENING -> TYPE_SELECT -> LOCATION -> ENTRY
//   adjust + preSelected:  OPENING -> LOCATION -> ENTRY
// (Patona context still skips LOCATION — first in-store location auto-selected.)
//
// mockApiError prop simulates an API failure on the Next: Review click — instead
// of invoking onConfirm, an inline error with Retry / Cancel is shown.

const ACTION_META = {
  add: {
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
      'Restore to Available',
      'Other',
    ],
  },
  decrease: {
    label: 'Decrease Stock',
    icon: Minus,
    accent: 'text-amber-700',
    accentBg: 'bg-amber-50',
    accentBorder: 'border-amber-200',
    reasons: [
      'Transfer Out',
      'Robbery',
      'Write-off',
      'Discontinuation',
      'Mark Unavailable (Damaged)',
      'Mark Unavailable (Expired)',
      'Mark Unavailable (Quarantined)',
      'Mark Unavailable (Under Review)',
      'Other',
    ],
  },
}

// Maps a (resolvedType, reason) pair to the effective stock-effect type.
// Most reasons leave the effect equal to the picked type ('add' | 'decrease'),
// but a handful of reason codes reclassify stock instead.
function getEffectiveType(resolvedType, reason) {
  if (reason === 'Restore to Available') return 'restore_to_available'
  if (typeof reason === 'string' && reason.startsWith('Mark Unavailable')) {
    return 'mark_unavailable'
  }
  return resolvedType
}

// Neutral meta used while the 'adjust' action has no resolved type yet
// (i.e. the OPENING / TYPE_SELECT steps before a type is picked).
const ADJUST_NEUTRAL_META = {
  label: 'Adjust Stock',
  icon: RotateCcw,
  accent: 'text-gray-700',
  accentBg: 'bg-gray-50',
  accentBorder: 'border-gray-200',
  reasons: [],
}

const STEPS = {
  OPENING: 1,
  TYPE_SELECT: 2,
  LOCATION: 3,
  ENTRY: 4,
}

// Which resolved types validate the entered qty against the location's
// "available" pool. 'mark_unavailable' is no longer a resolvedType — it is a
// Decrease reason, so the 'decrease' entry already covers it. The
// 'Restore to Available' reason validates against Unavailable instead and is
// handled separately in validateQty.
const AVAILABLE_LIMITED = new Set(['decrease'])

export default function StockAdjustmentModal({
  product,
  // 'adjust' is the only supported action since BRD Round 8. Mark Unavailable /
  // Restore / Transfer are reason codes inside the Add / Decrease flows.
  preSelectedType, // 'add' | 'decrease' to skip the TYPE_SELECT step.
  role, // unused inside modal; gating happens in ProductTable
  context,
  onConfirm,
  onClose,
  mockApiError = false,
  // when set, mount on this step — used by the confirm modal's Back nav to
  // return the user to the entry step.
  initialStep,
  // pre-fill { locationId, qty, reason, note, imageFile, resolvedType } when
  // re-entering from the confirm modal's Back button.
  initialState,
}) {
  const stocks = product?.stocks || []
  const isPatona = context === 'patona'

  // Resolved adjust type — 'add' | 'decrease' once chosen (preSelectedType,
  // restored state, or the TYPE_SELECT step).
  const initialResolvedType =
    initialState?.resolvedType ?? preSelectedType ?? null
  const [resolvedType, setResolvedType] = useState(initialResolvedType)

  // The meta used for rendering. Neutral gray until an adjust type is picked.
  const meta = ACTION_META[resolvedType] || ADJUST_NEUTRAL_META

  // Patona: pre-select the first in-store location and skip the LOCATION step.
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
    // Reset on product change. Honor initialStep / initialState if provided
    // (e.g. user clicked Back from the confirm modal).
    setResolvedType(initialState?.resolvedType ?? preSelectedType ?? null)
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
  }, [product?.id, preSelectedType])

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
  // The OPENING step routes to TYPE_SELECT unless a type was already resolved
  // (preSelectedType / restored state).
  const goNextFromOpening = () => {
    if (!resolvedType) {
      setStep(STEPS.TYPE_SELECT)
      return
    }
    if (isPatona) {
      setStep(STEPS.ENTRY)
    } else {
      setStep(STEPS.LOCATION)
    }
  }

  const goNextFromTypeSelect = (type) => {
    setResolvedType(type)
    if (isPatona) {
      setStep(STEPS.ENTRY)
    } else {
      setStep(STEPS.LOCATION)
    }
  }

  const goBackFromLocation = () => {
    // Without a pre-selected type the previous step is TYPE_SELECT.
    if (!preSelectedType && !initialState?.resolvedType) {
      setStep(STEPS.TYPE_SELECT)
    } else {
      setStep(STEPS.OPENING)
    }
  }

  const goBackFromEntry = () => {
    setQtyError('')
    setReasonError('')
    setApiError(false)
    if (isPatona) {
      // Patona has no LOCATION step. Previous step is TYPE_SELECT for an
      // unresolved type, otherwise OPENING.
      if (!preSelectedType && !initialState?.resolvedType) {
        setStep(STEPS.TYPE_SELECT)
      } else {
        setStep(STEPS.OPENING)
      }
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
    // Reason 'Restore to Available': cannot exceed Unavailable at the location.
    if (reason === 'Restore to Available' && selectedStock) {
      const unav = Number(selectedStock.unavailable) || 0
      if (n > unav) {
        return {
          ok: false,
          error: `Cannot exceed current unavailable stock (${unav})`,
        }
      }
      return { ok: true, value: n }
    }
    // decrease (incl. 'Mark Unavailable (...)' reasons): cannot exceed
    // Available at the location.
    if (AVAILABLE_LIMITED.has(resolvedType) && selectedStock) {
      const avail = Number(selectedStock.available) || 0
      if (n > avail) {
        return {
          ok: false,
          error: `Exceeds available stock (${avail} available)`,
        }
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
    if (mockApiError) {
      setApiError(true)
      setSubmitting(false)
      return
    }
    onConfirm({
      productId: product.id,
      // Effective stock-effect type — 'add' | 'decrease' | 'mark_unavailable' |
      // 'restore_to_available'. Derived from the picked type + reason so the
      // confirm modal applies the correct deltas.
      action: getEffectiveType(resolvedType, reason),
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

  // Step indicator -----------------------------------------------------------
  // Steps shown depend on whether the type is still unresolved and the
  // Patona/CCS3 context.
  const showTypeSelectStep = !preSelectedType && !initialState?.resolvedType
  const stepDefs = useMemo(() => {
    const defs = [{ title: 'Overview', key: STEPS.OPENING }]
    if (showTypeSelectStep) defs.push({ title: 'Type', key: STEPS.TYPE_SELECT })
    if (!isPatona) defs.push({ title: 'Location', key: STEPS.LOCATION })
    defs.push({ title: 'Entry', key: STEPS.ENTRY })
    return defs
  }, [showTypeSelectStep, isPatona])

  const currentStepIndex = Math.max(
    0,
    stepDefs.findIndex((d) => d.key === step)
  )

  // Determine "Next: Review" button variant based on resolved type.
  const nextReviewVariant = resolvedType === 'decrease' ? 'destructive' : 'primary'

  // Footer passed to Modal -----------------------------------------------------
  const footer = (
    <div className="flex justify-between w-full">
      <div>
        {step !== STEPS.OPENING && step !== STEPS.TYPE_SELECT && (
          <DSButton
            variant="outline"
            leftIcon={<ArrowLeft size={14} />}
            onClick={() => {
              if (step === STEPS.ENTRY) {
                goBackFromEntry()
              } else if (step === STEPS.LOCATION) {
                goBackFromLocation()
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
        {/* TYPE_SELECT has no Next button — the cards advance the flow. */}
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

  // Heading: neutral "Adjust Stock" until a type is resolved.
  const modalTitle = meta.label

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={modalTitle}
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
      <div className="mb-5">
        <Stepper
          steps={stepDefs.map((d) => ({ title: d.title }))}
          current={currentStepIndex}
          orientation="horizontal"
        />
      </div>

      {/* Step body */}
      {step === STEPS.OPENING && (
        <OpeningStep meta={meta} totals={totals} />
      )}
      {step === STEPS.TYPE_SELECT && (
        <TypeSelectStep onSelectType={goNextFromTypeSelect} onCancel={onClose} />
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
          resolvedType={resolvedType}
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
// Step 1 — Opening summary (all 5 stock fields)
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
// Step — Type selection (the 'adjust' action only)
// ---------------------------------------------------------------------------
function TypeSelectStep({ onSelectType }) {
  const options = [
    {
      type: 'add',
      title: 'Add',
      subtext: 'Increase available stock',
      icon: Plus,
      accent: 'text-emerald-700',
      ring: 'hover:border-emerald-300 hover:bg-emerald-50',
      iconBg: 'bg-emerald-100 text-emerald-700',
    },
    {
      type: 'decrease',
      title: 'Decrease',
      subtext: 'Remove stock from On Hand',
      icon: Minus,
      accent: 'text-amber-700',
      ring: 'hover:border-amber-300 hover:bg-amber-50',
      iconBg: 'bg-amber-100 text-amber-700',
    },
  ]
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-900">Adjust Stock</h3>
      <p className="text-sm text-gray-600">
        Choose how you want to adjust this product&apos;s stock.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {options.map((opt) => {
          const Icon = opt.icon
          return (
            <button
              key={opt.type}
              type="button"
              onClick={() => onSelectType(opt.type)}
              className={`flex flex-col items-start gap-2 rounded-lg border border-gray-200 p-4 text-left transition-colors ${opt.ring}`}
            >
              <span className={`inline-flex h-9 w-9 items-center justify-center rounded-md ${opt.iconBg}`}>
                <Icon size={18} />
              </span>
              <span className={`text-base font-semibold ${opt.accent}`}>
                {opt.title}
              </span>
              <span className="text-xs text-gray-500">{opt.subtext}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step — Location selection (CCS3 only)
// ---------------------------------------------------------------------------
function LocationStep({ stocks, selectedLocationId, onSelect }) {
  if (!stocks.length) {
    return (
      <Alert variant="warning" title="No locations">
        This product has no stock locations configured.
      </Alert>
    )
  }
  // The reason (and therefore the effective stock effect) is not known until
  // the entry step, so always surface the Available figure here.
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
// Step — Qty + Reason + Note + Image entry
// ---------------------------------------------------------------------------
function EntryStep({
  meta,
  resolvedType,
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

  // Which pool the entered qty is limited by, for the location summary card +
  // helper text. This is reason-driven: the 'Restore to Available' reason is
  // bounded by Unavailable, decrease (incl. 'Mark Unavailable (...)') is
  // bounded by Available, plain add is unbounded.
  const limitedByUnavailable = reason === 'Restore to Available'
  const limitedByAvailable = resolvedType === 'decrease' && !limitedByUnavailable
  const poolLabel = limitedByUnavailable ? 'Current Unavailable' : 'Current Available'
  const poolValue = limitedByUnavailable
    ? Number(selectedStock?.unavailable) || 0
    : Number(selectedStock?.available) || 0

  let qtyHelper = 'Whole number between 1 and 999,999'
  if (selectedStock && limitedByUnavailable) {
    qtyHelper += ` — cannot exceed ${(Number(selectedStock.unavailable) || 0).toLocaleString()} unavailable`
  } else if (selectedStock && limitedByAvailable) {
    qtyHelper += ` — cannot exceed ${(Number(selectedStock.available) || 0).toLocaleString()} available`
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
                {poolLabel}
              </div>
              <div className="font-semibold tabular-nums text-gray-900">
                {poolValue.toLocaleString()}
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
        helperText={qtyHelper}
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
