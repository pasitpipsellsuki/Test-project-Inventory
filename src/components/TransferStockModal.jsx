import React, { useState, useMemo, useEffect, useRef } from 'react'
import {
  ArrowLeftRight,
  ArrowRight,
  ArrowLeft,
  Upload,
  CheckCircle2,
  XCircle,
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
  Badge,
} from '@uxuissk/design-system'

// CARD-015: TransferStockModal — PIS-INV SF-04
// Transfer Stock Between In-Store Locations.
//
// Flow (matches CARD-008 StockAdjustmentModal pattern):
//   Step 1 OPENING   — product stock summary + in-store source location pick.
//   Step 2 ENTRY     — destination select + qty + reason + optional note + image.
//   REVIEW (second Modal) — projected impact on source / destination, Back/Cancel/Confirm.
//   SUCCESS / ERROR  — terminal states inside the main Modal.
//
// Notes:
// - Only `location_type === 'in-store'` locations are eligible (fulfillment hidden).
// - Per BRD SF-04: a transfer physically moves stock between locations, so each
//   location's On Hand (quantity) shifts: Source On Hand −qty, Destination
//   On Hand +qty. Company-wide total On Hand across both locations is unchanged.
// - Reserve / Preorder / Unavailable shown for reference; unchanged.
// - Danger color token: #e11d48 (per CARD-013).
// - Image upload is local-only — we keep the File ref + filename for review.
// - Leo handles ProductTable wiring + pis-rest.ts mock. This component just calls
//   `onTransferComplete(updatedStocks)` with a mocked successful result.

const REASONS = ['Transfer Out', 'Rebalancing', 'Correction', 'Other']

const STEPS = {
  OPENING: 1,
  ENTRY: 2,
}

const VIEW = {
  FORM: 'form',         // Steps 1 + 2
  REVIEW: 'review',     // Confirm review modal
  SUCCESS: 'success',
  ERROR: 'error',
}

const MAX_QTY = 999999
const DANGER = '#e11d48'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function applyTransfer(stocks, sourceId, destId, qty) {
  // Pure projection — returns a new stocks array with the transfer applied.
  // Per BRD SF-04: each location's On Hand (quantity) is recomputed from its
  // four components (available + unavailable + reserve + preorder) so the
  // Source On Hand drops by qty and Destination On Hand grows by qty —
  // unavailable / reserve / preorder are untouched.
  return stocks.map((s) => {
    if (s.id === sourceId) {
      const nextAvail = (Number(s.available) || 0) - qty
      return {
        ...s,
        available: nextAvail,
        quantity:
          nextAvail +
          (Number(s.unavailable) || 0) +
          (Number(s.reserve) || 0) +
          (Number(s.preorder) || 0),
        updatedAt: new Date().toISOString(),
      }
    }
    if (s.id === destId) {
      const nextAvail = (Number(s.available) || 0) + qty
      return {
        ...s,
        available: nextAvail,
        quantity:
          nextAvail +
          (Number(s.unavailable) || 0) +
          (Number(s.reserve) || 0) +
          (Number(s.preorder) || 0),
        updatedAt: new Date().toISOString(),
      }
    }
    return s
  })
}

function num(v) {
  return Number(v) || 0
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function TransferStockModal({
  isOpen,
  onClose,
  product,
  userRole, // currently unused inside modal; gating expected at trigger site
  onTransferComplete,
  // Test / dev hook — when true the mock API resolves to an error on Confirm.
  mockApiError = false,
}) {
  const stocks = product?.stocks || []

  // In-store locations only — fulfillment locations are hidden per spec.
  const inStoreStocks = useMemo(
    () => stocks.filter((s) => s.location_type === 'in-store'),
    [stocks]
  )

  const [view, setView] = useState(VIEW.FORM)
  const [step, setStep] = useState(STEPS.OPENING)
  const [sourceId, setSourceId] = useState(null)
  const [destId, setDestId] = useState(null)
  const [qty, setQty] = useState('')
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [qtyError, setQtyError] = useState('')
  const [reasonError, setReasonError] = useState('')
  const [destError, setDestError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [updatedStocks, setUpdatedStocks] = useState(null)
  const fileInputRef = useRef(null)

  // Reset all state when modal is (re)opened for a different product or after close.
  useEffect(() => {
    if (!isOpen) return
    setView(VIEW.FORM)
    setStep(STEPS.OPENING)
    setSourceId(null)
    setDestId(null)
    setQty('')
    setReason('')
    setNote('')
    setImageFile(null)
    setQtyError('')
    setReasonError('')
    setDestError('')
    setSubmitting(false)
    setUpdatedStocks(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, product?.id])

  if (!isOpen || !product) return null

  const sourceStock = inStoreStocks.find((s) => s.id === sourceId) || null
  const destStock = inStoreStocks.find((s) => s.id === destId) || null

  // ----- Totals (across ALL locations — same as adjustment opening) ------
  const totals = useMemo(
    () =>
      stocks.reduce(
        (acc, s) => ({
          available: acc.available + num(s.available),
          unavailable: acc.unavailable + num(s.unavailable),
          reserve: acc.reserve + num(s.reserve),
          preorder: acc.preorder + num(s.preorder),
          onHand: acc.onHand + num(s.quantity),
        }),
        { available: 0, unavailable: 0, reserve: 0, preorder: 0, onHand: 0 }
      ),
    [stocks]
  )

  // ----- Validation ------------------------------------------------------
  const validateQty = (raw) => {
    if (raw === '' || raw === null || raw === undefined) {
      return { ok: false, error: 'Quantity is required' }
    }
    if (!/^\d+$/.test(String(raw).trim())) {
      return { ok: false, error: 'Must be a whole number' }
    }
    const n = parseInt(raw, 10)
    if (Number.isNaN(n) || n < 1) {
      return { ok: false, error: 'Quantity must be at least 1' }
    }
    if (n > MAX_QTY) {
      return { ok: false, error: 'Quantity cannot exceed 999,999' }
    }
    if (sourceStock && n > num(sourceStock.available)) {
      return {
        ok: false,
        error: 'Transfer quantity exceeds available stock at source location',
      }
    }
    return { ok: true, value: n }
  }

  // ----- Navigation handlers --------------------------------------------
  const goToEntry = () => {
    if (!sourceId) return
    setStep(STEPS.ENTRY)
  }

  const goBackToOpening = () => {
    setQtyError('')
    setReasonError('')
    setDestError('')
    setStep(STEPS.OPENING)
  }

  const handleNextReview = () => {
    const qRes = validateQty(qty)
    const rErr = !reason ? 'Please select a reason' : ''
    const dErr = !destId ? 'Please select a destination location' : ''
    setQtyError(qRes.ok ? '' : qRes.error)
    setReasonError(rErr)
    setDestError(dErr)
    if (!qRes.ok || rErr || dErr) return
    if (!sourceStock || !destStock) return
    setView(VIEW.REVIEW)
  }

  const handleBackFromReview = () => {
    // Preserve all field values — just flip view back to ENTRY step.
    setView(VIEW.FORM)
    setStep(STEPS.ENTRY)
  }

  const handleConfirm = () => {
    const qRes = validateQty(qty)
    if (!qRes.ok || !sourceStock || !destStock) {
      // Defensive — shouldn't be reachable.
      return
    }
    setSubmitting(true)
    // Simulate mock API. In real wiring Leo's pis-rest.ts handles this.
    Promise.resolve().then(() => {
      if (mockApiError) {
        setSubmitting(false)
        setView(VIEW.ERROR)
        return
      }
      const next = applyTransfer(stocks, sourceStock.id, destStock.id, qRes.value)
      setUpdatedStocks(next)
      setSubmitting(false)
      setView(VIEW.SUCCESS)
    })
  }

  const handleSuccessClose = () => {
    if (updatedStocks) {
      onTransferComplete?.(updatedStocks)
    }
    onClose?.()
  }

  const handleErrorRetry = () => {
    setView(VIEW.REVIEW)
  }

  const handleErrorCancel = () => {
    onClose?.()
  }

  // ----- File input ------------------------------------------------------
  const handleFilePick = (e) => {
    const f = e.target.files?.[0] || null
    if (f && !f.type.startsWith('image/')) {
      // Silently ignore non-image — DS Alert would be overkill inline here.
      return
    }
    setImageFile(f)
  }

  const clearFile = () => {
    setImageFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ----- Step / view chrome ---------------------------------------------
  const stepDefs = [{ title: 'Source' }, { title: 'Transfer' }]
  const currentStepIndex = step === STEPS.OPENING ? 0 : 1

  const proceedDisabled =
    step === STEPS.OPENING ? !sourceId : false

  // ----- Footer for the main form modal ---------------------------------
  const formFooter = (
    <div className="flex justify-between w-full">
      <div>
        {step === STEPS.ENTRY && (
          <DSButton
            variant="outline"
            leftIcon={<ArrowLeft size={14} />}
            onClick={goBackToOpening}
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
            disabled={proceedDisabled}
            onClick={goToEntry}
          >
            Next
          </DSButton>
        )}
        {step === STEPS.ENTRY && (
          <DSButton
            variant="primary"
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

  // ---------------------------------------------------------------------
  // RENDER — branch on view
  // ---------------------------------------------------------------------

  if (view === VIEW.REVIEW) {
    return (
      <ReviewModal
        product={product}
        sourceStock={sourceStock}
        destStock={destStock}
        qty={parseInt(qty, 10) || 0}
        reason={reason}
        note={note}
        imageFile={imageFile}
        submitting={submitting}
        onBack={handleBackFromReview}
        onCancel={onClose}
        onConfirm={handleConfirm}
      />
    )
  }

  if (view === VIEW.SUCCESS) {
    return (
      <SuccessModal
        product={product}
        sourceStockBefore={sourceStock}
        destStockBefore={destStock}
        qty={parseInt(qty, 10) || 0}
        updatedStocks={updatedStocks}
        onClose={handleSuccessClose}
      />
    )
  }

  if (view === VIEW.ERROR) {
    return (
      <ErrorModal
        onRetry={handleErrorRetry}
        onCancel={handleErrorCancel}
      />
    )
  }

  // VIEW.FORM
  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Transfer Stock"
      size="lg"
      footer={formFooter}
    >
      <div className="mb-4 -mt-2">
        <p className="text-sm text-gray-600">{product.name}</p>
        {product.sku && (
          <p className="text-xs text-gray-500">SKU: {product.sku}</p>
        )}
      </div>

      <div className="mb-5">
        <Stepper
          steps={stepDefs}
          current={currentStepIndex}
          orientation="horizontal"
        />
      </div>

      {step === STEPS.OPENING && (
        <OpeningStep
          totals={totals}
          inStoreStocks={inStoreStocks}
          selectedSourceId={sourceId}
          onSelectSource={(id) => {
            setSourceId(id)
            // Clear destination if it equals the new source.
            if (destId === id) setDestId(null)
          }}
        />
      )}

      {step === STEPS.ENTRY && (
        <EntryStep
          sourceStock={sourceStock}
          inStoreStocks={inStoreStocks}
          destId={destId}
          setDestId={(id) => {
            setDestId(id)
            if (destError) setDestError('')
          }}
          destError={destError}
          qty={qty}
          setQty={(v) => {
            setQty(v)
            if (qtyError) setQtyError('')
          }}
          qtyError={qtyError}
          reason={reason}
          setReason={(v) => {
            setReason(v)
            if (reasonError) setReasonError('')
          }}
          reasonError={reasonError}
          note={note}
          setNote={setNote}
          imageFile={imageFile}
          onFilePick={handleFilePick}
          clearFile={clearFile}
          fileInputRef={fileInputRef}
        />
      )}
    </Modal>
  )
}

// ===========================================================================
// Step 1 — Opening: totals + source location pick
// ===========================================================================
function OpeningStep({ totals, inStoreStocks, selectedSourceId, onSelectSource }) {
  const stockColumns = [
    {
      key: 'field',
      header: 'Field',
      render: (_, row) => (
        <span className={row.bold ? 'font-semibold' : ''}>{row.field}</span>
      ),
    },
    {
      key: 'value',
      header: 'Total',
      render: (_, row) => (
        <span
          className={`tabular-nums text-right block ${
            row.bold ? 'font-semibold text-gray-900' : 'text-gray-900'
          }`}
        >
          {Number(row.value).toLocaleString()}
        </span>
      ),
    },
  ]
  const stockData = [
    { field: 'Available',   value: totals.available,   bold: false },
    { field: 'Unavailable', value: totals.unavailable, bold: false },
    { field: 'Reserve',     value: totals.reserve,     bold: false },
    { field: 'Preorder',    value: totals.preorder,    bold: false },
    { field: 'On Hand',     value: totals.onHand,      bold: true  },
  ]

  return (
    <div className="space-y-5">
      <div className="rounded-md border p-3 text-sm bg-sky-50 border-sky-200 text-sky-800">
        Select the <span className="font-semibold">source in-store location</span> you
        want to transfer stock from. Only in-store locations are eligible for
        transfers.
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
          Current Stock — All Locations
        </h3>
        <DSTable columns={stockColumns} data={stockData} bordered />
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
          Source Location (In-Store)
        </h3>
        {inStoreStocks.length === 0 ? (
          <Alert variant="warning" title="No in-store locations">
            This product is not stocked at any in-store location. Transfers are
            only allowed between in-store locations.
          </Alert>
        ) : inStoreStocks.length < 2 ? (
          <Alert variant="warning" title="Need at least two in-store locations">
            A transfer requires both a source and a destination in-store
            location. This product is only stocked at one in-store location.
          </Alert>
        ) : (
          <RadioGroup
            name="source-location"
            value={selectedSourceId ?? ''}
            onChange={onSelectSource}
            direction="vertical"
          >
            {inStoreStocks.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-md border border-gray-200 p-3 hover:bg-gray-50 transition-colors"
              >
                <DSRadio
                  value={s.id}
                  label={s.location_name}
                  description="in-store"
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
        )}
      </div>
    </div>
  )
}

// ===========================================================================
// Step 2 — Entry: destination + qty + reason + note + image
// ===========================================================================
function EntryStep({
  sourceStock,
  inStoreStocks,
  destId,
  setDestId,
  destError,
  qty,
  setQty,
  qtyError,
  reason,
  setReason,
  reasonError,
  note,
  setNote,
  imageFile,
  onFilePick,
  clearFile,
  fileInputRef,
}) {
  const destOptions = inStoreStocks
    .filter((s) => s.id !== sourceStock?.id)
    .map((s) => ({
      value: s.id,
      label: `${s.location_name} (Available: ${Number(s.available).toLocaleString()})`,
    }))

  return (
    <div className="space-y-4">
      {/* Source summary card */}
      {sourceStock && (
        <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
          <div className="text-xs uppercase tracking-wider text-gray-500 mb-2">
            Source Location
          </div>
          <div className="font-medium text-gray-900 mb-2">
            {sourceStock.location_name}
          </div>
          <div className="grid grid-cols-5 gap-2 text-center text-xs">
            <SummaryCell label="Available" value={sourceStock.available} highlight />
            <SummaryCell label="Unavailable" value={sourceStock.unavailable} />
            <SummaryCell label="Reserve" value={sourceStock.reserve} />
            <SummaryCell label="Preorder" value={sourceStock.preorder} />
            <SummaryCell label="On Hand" value={sourceStock.quantity} bold />
          </div>
        </div>
      )}

      {/* Destination dropdown */}
      <div>
        <Dropdown
          label="Destination Location"
          fullWidth
          options={destOptions}
          value={destId ?? ''}
          onChange={(val) => setDestId(val)}
          placeholder={
            destOptions.length === 0
              ? 'No other in-store locations available'
              : 'Select destination…'
          }
          disabled={destOptions.length === 0}
        />
        {destError && (
          <p className="text-xs mt-1" style={{ color: DANGER }}>
            {destError}
          </p>
        )}
      </div>

      {/* Quantity */}
      <DSInput
        label="Quantity"
        fullWidth
        type="number"
        value={qty}
        onChange={(e) => setQty(e.target.value)}
        placeholder="Enter quantity"
        state={qtyError ? 'error' : 'default'}
        errorMessage={qtyError}
        helperText={
          sourceStock
            ? `Whole number between 1 and 999,999 — cannot exceed ${Number(
                sourceStock.available
              ).toLocaleString()} available at source`
            : 'Whole number between 1 and 999,999'
        }
      />

      {/* Reason */}
      <div>
        <Dropdown
          label="Reason"
          fullWidth
          options={REASONS.map((r) => ({ value: r, label: r }))}
          value={reason}
          onChange={(val) => setReason(val)}
          placeholder="Select a reason…"
        />
        {reasonError && (
          <p className="text-xs mt-1" style={{ color: DANGER }}>
            {reasonError}
          </p>
        )}
      </div>

      {/* Note */}
      <DSInput
        label="Note"
        fullWidth
        as="textarea"
        rows={3}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note about this transfer"
        helperText="Optional"
      />

      {/* Image upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Attach Image
        </label>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={onFilePick}
            className="hidden"
            id="transfer-stock-image-input"
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
              <span className="text-sm text-gray-700 truncate max-w-[220px]">
                {imageFile.name}
              </span>
              <DSButton
                type="button"
                variant="outline"
                size="sm"
                onClick={clearFile}
              >
                Remove
              </DSButton>
            </>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Optional. Single image file (PNG, JPG, etc.).
        </p>
      </div>
    </div>
  )
}

function SummaryCell({ label, value, bold, highlight }) {
  return (
    <div
      className={`rounded border px-2 py-1.5 ${
        highlight ? 'bg-white border-sky-200' : 'bg-white border-gray-200'
      }`}
    >
      <div className="text-[10px] uppercase tracking-wider text-gray-500">
        {label}
      </div>
      <div
        className={`tabular-nums ${
          bold ? 'font-semibold text-gray-900' : 'text-gray-900'
        }`}
      >
        {Number(value).toLocaleString()}
      </div>
    </div>
  )
}

// ===========================================================================
// Review modal
// ===========================================================================
function ReviewModal({
  product,
  sourceStock,
  destStock,
  qty,
  reason,
  note,
  imageFile,
  submitting,
  onBack,
  onCancel,
  onConfirm,
}) {
  // Close on Escape — treat as Cancel.
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') onCancel?.()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onCancel])

  if (!sourceStock || !destStock) return null

  const srcAvail = num(sourceStock.available)
  const dstAvail = num(destStock.available)
  const projectedSrcAvail = srcAvail - qty
  const projectedDstAvail = dstAvail + qty

  const footer = (
    <div className="flex justify-between w-full">
      <DSButton
        variant="outline"
        leftIcon={<ArrowLeft size={14} />}
        onClick={onBack}
        disabled={submitting}
      >
        Back
      </DSButton>
      <div className="flex gap-2">
        <DSButton variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </DSButton>
        <DSButton
          variant="primary"
          onClick={onConfirm}
          disabled={submitting}
        >
          {submitting ? 'Transferring…' : 'Transfer Stock'}
        </DSButton>
      </div>
    </div>
  )

  return (
    <Modal
      open={true}
      onClose={onCancel}
      title="Confirm Stock Transfer"
      size="md"
      footer={footer}
    >
      <div className="mb-4 -mt-2 flex items-center gap-2">
        <Badge variant="default">Transfer Stock</Badge>
        <span className="text-sm text-gray-600">{product.name}</span>
        {product.sku && (
          <span className="text-xs text-gray-500">· SKU: {product.sku}</span>
        )}
      </div>

      {/* Locations + flow */}
      <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <LocationCard
            heading="From (Source)"
            name={sourceStock.location_name}
          />
          <ArrowLeftRight size={20} className="text-gray-500 mx-auto" />
          <LocationCard
            heading="To (Destination)"
            name={destStock.location_name}
          />
        </div>
      </div>

      {/* Quantity */}
      <div className="mt-4 flex items-baseline justify-between">
        <span className="text-sm text-gray-500">Quantity</span>
        <span className="text-base font-semibold text-gray-900 tabular-nums">
          {qty.toLocaleString()}
        </span>
      </div>

      {/* Reason / Note / Image */}
      <div className="mt-3 space-y-1.5">
        <SummaryLine label="Reason" value={reason} />
        {note && <SummaryLine label="Note" value={note} multiline />}
        {imageFile && <SummaryLine label="Image" value={imageFile.name} />}
      </div>

      {/* Divider — Stock Impact */}
      <div className="mt-5 mb-2 flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs font-semibold tracking-wide uppercase text-gray-500">
          Stock Impact
        </span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <div className="rounded-md border border-gray-200 bg-white px-4 py-3">
        <ImpactBlock
          heading={sourceStock.location_name}
          subheading="Source"
          rows={[
            {
              label: 'Available',
              current: srcAvail,
              projected: projectedSrcAvail,
              deltaText: `−${qty.toLocaleString()}`,
              deltaStyle: { color: DANGER },
            },
            {
              label: 'Unavailable',
              current: num(sourceStock.unavailable),
              projected: num(sourceStock.unavailable),
              deltaText: 'Unchanged',
              deltaClass: 'text-gray-500',
            },
            {
              label: 'Reserve',
              current: num(sourceStock.reserve),
              projected: num(sourceStock.reserve),
              deltaText: 'Unchanged',
              deltaClass: 'text-gray-500',
            },
            {
              label: 'Preorder',
              current: num(sourceStock.preorder),
              projected: num(sourceStock.preorder),
              deltaText: 'Unchanged',
              deltaClass: 'text-gray-500',
            },
            {
              label: 'On Hand',
              current: num(sourceStock.quantity),
              projected: num(sourceStock.quantity) - qty,
              deltaText: `−${qty.toLocaleString()}`,
              deltaStyle: { color: DANGER },
              bold: true,
            },
          ]}
        />

        <div className="my-3 h-px bg-gray-200" />

        <ImpactBlock
          heading={destStock.location_name}
          subheading="Destination"
          rows={[
            {
              label: 'Available',
              current: dstAvail,
              projected: projectedDstAvail,
              deltaText: `+${qty.toLocaleString()}`,
              deltaClass: 'text-emerald-700',
            },
            {
              label: 'Unavailable',
              current: num(destStock.unavailable),
              projected: num(destStock.unavailable),
              deltaText: 'Unchanged',
              deltaClass: 'text-gray-500',
            },
            {
              label: 'Reserve',
              current: num(destStock.reserve),
              projected: num(destStock.reserve),
              deltaText: 'Unchanged',
              deltaClass: 'text-gray-500',
            },
            {
              label: 'Preorder',
              current: num(destStock.preorder),
              projected: num(destStock.preorder),
              deltaText: 'Unchanged',
              deltaClass: 'text-gray-500',
            },
            {
              label: 'On Hand',
              current: num(destStock.quantity),
              projected: num(destStock.quantity) + qty,
              deltaText: `+${qty.toLocaleString()}`,
              deltaClass: 'text-emerald-700',
              bold: true,
            },
          ]}
        />
      </div>
    </Modal>
  )
}

function LocationCard({ heading, name }) {
  return (
    <div className="rounded border border-gray-200 bg-white px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-gray-500">
        {heading}
      </div>
      <div className="font-medium text-gray-900 text-sm">{name}</div>
    </div>
  )
}

function SummaryLine({ label, value, multiline }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-gray-500">{label}</span>
      <span
        className={`text-sm font-medium text-gray-900 text-right ${
          multiline ? 'whitespace-pre-wrap break-words max-w-[60%]' : 'break-words'
        }`}
      >
        {value || '—'}
      </span>
    </div>
  )
}

function ImpactBlock({ heading, subheading, rows }) {
  return (
    <div>
      <div className="mb-2">
        <div className="text-[10px] uppercase tracking-wider text-gray-500">
          {subheading}
        </div>
        <div className="text-sm font-medium text-gray-900">{heading}</div>
      </div>
      <div className="space-y-1">
        {rows.map((r) => (
          <div
            key={r.label}
            className="flex items-start justify-between gap-4 py-0.5"
          >
            <span
              className={`text-sm ${r.bold ? 'font-semibold text-gray-900' : 'text-gray-600'}`}
            >
              {r.label}
            </span>
            <div className="text-right">
              <div className="text-sm">
                <span className="text-gray-500 tabular-nums">
                  {Number(r.current).toLocaleString()}
                </span>
                <span className="mx-1.5 text-gray-400">→</span>
                <span
                  className={`tabular-nums ${r.bold ? 'font-semibold text-gray-900' : 'font-medium text-gray-900'}`}
                >
                  {Number(r.projected).toLocaleString()}
                </span>
              </div>
              {r.deltaText && (
                <div
                  className={`text-xs mt-0.5 font-medium ${r.deltaClass || ''}`}
                  style={r.deltaStyle}
                >
                  {r.deltaText}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ===========================================================================
// Success modal
// ===========================================================================
function SuccessModal({
  product,
  sourceStockBefore,
  destStockBefore,
  qty,
  updatedStocks,
  onClose,
}) {
  const refreshedSource =
    updatedStocks?.find((s) => s.id === sourceStockBefore?.id) || null
  const refreshedDest =
    updatedStocks?.find((s) => s.id === destStockBefore?.id) || null

  const footer = (
    <div className="flex justify-end w-full">
      <DSButton variant="primary" onClick={onClose}>
        Done
      </DSButton>
    </div>
  )

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Transfer Complete"
      size="md"
      footer={footer}
    >
      <div className="flex items-start gap-3 mb-4">
        <CheckCircle2 className="text-emerald-600 mt-0.5" size={22} />
        <div>
          <div className="text-sm font-medium text-gray-900">
            Stock transferred successfully.
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {qty.toLocaleString()} units moved from{' '}
            <span className="font-medium text-gray-700">
              {sourceStockBefore?.location_name}
            </span>{' '}
            to{' '}
            <span className="font-medium text-gray-700">
              {destStockBefore?.location_name}
            </span>
            .
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Product: {product.name}
            {product.sku ? ` · SKU: ${product.sku}` : ''}
          </div>
        </div>
      </div>

      <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 space-y-3">
        {refreshedSource && (
          <RefreshedLocationRow
            heading="Source"
            stock={refreshedSource}
          />
        )}
        {refreshedDest && (
          <>
            <div className="h-px bg-gray-200" />
            <RefreshedLocationRow
              heading="Destination"
              stock={refreshedDest}
            />
          </>
        )}
      </div>
    </Modal>
  )
}

function RefreshedLocationRow({ heading, stock }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-gray-500">
        {heading}
      </div>
      <div className="text-sm font-medium text-gray-900 mb-2">
        {stock.location_name}
      </div>
      <div className="grid grid-cols-5 gap-2 text-center text-xs">
        <SummaryCell label="Available" value={stock.available} highlight />
        <SummaryCell label="Unavailable" value={stock.unavailable} />
        <SummaryCell label="Reserve" value={stock.reserve} />
        <SummaryCell label="Preorder" value={stock.preorder} />
        <SummaryCell label="On Hand" value={stock.quantity} bold />
      </div>
    </div>
  )
}

// ===========================================================================
// Error modal
// ===========================================================================
function ErrorModal({ onRetry, onCancel }) {
  const footer = (
    <div className="flex justify-end w-full gap-2">
      <DSButton variant="outline" onClick={onCancel}>
        Cancel
      </DSButton>
      <DSButton variant="primary" onClick={onRetry}>
        Retry
      </DSButton>
    </div>
  )

  return (
    <Modal
      open={true}
      onClose={onCancel}
      title="Transfer Failed"
      size="md"
      footer={footer}
    >
      <div className="flex items-start gap-3">
        <XCircle style={{ color: DANGER }} className="mt-0.5" size={22} />
        <div>
          <div className="text-sm font-medium text-gray-900">
            Transfer failed. Please try again.
          </div>
          <div className="text-xs text-gray-500 mt-1">
            No changes have been applied. You can retry the transfer or cancel
            and start over.
          </div>
        </div>
      </div>
    </Modal>
  )
}
