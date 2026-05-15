import { useEffect, useMemo } from 'react'
import { Badge, DSButton, EmptyState, Modal } from "@uxuissk/design-system"

function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function StockBreakdownModal({
  product,
  role,
  context,
  onClose,
  stockError = false,
}) {
  // Close on Escape
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const filteredStocks = useMemo(() => {
    const all = Array.isArray(product?.stocks) ? product.stocks : []
    if (context === 'patona') {
      return all.filter((s) => s.location_type === 'in-store')
    }
    // CCS3 (or anything else) — show all
    return all
  }, [product, context])

  if (!product) return null

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={product.name}
      size="xl"
      footer={
        <div className="flex justify-between w-full">
          <span className="text-xs text-gray-500">
            Context:{' '}
            <span className="font-medium">
              {context === 'patona' ? 'Patona (Store)' : 'CCS3'}
            </span>
          </span>
          <DSButton variant="outline" onClick={onClose}>Close</DSButton>
        </div>
      }
    >
      <p className="text-sm text-gray-500 mb-1">
        SKU: <span className="font-medium text-gray-700">{product.sku}</span>
      </p>
      <p className="text-sm text-gray-600 font-medium mb-4">Stock Breakdown by Location</p>

      {stockError ? (
        <EmptyState
          icon={<span className="text-red-600 text-2xl font-bold">!</span>}
          title="Stock data unavailable"
          description="Please try again."
          action={<DSButton variant="outline" onClick={onClose}>Retry</DSButton>}
        />
      ) : filteredStocks.length === 0 ? (
        <EmptyState
          title="No stock locations available"
          description={
            context === 'patona'
              ? 'This product has no in-store stock for your location.'
              : 'This product has no recorded stock locations.'
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredStocks.map((stock) => (
            <div
              key={stock.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
            >
              {/* Row header */}
              <div className="flex items-start justify-between flex-wrap gap-2 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold text-gray-900 truncate">
                    {stock.location_name}
                  </span>
                  <Badge variant="default">In-Store</Badge>
                </div>
                <span className="text-xs text-gray-500">
                  Last Updated: {formatDate(stock.updatedAt)}
                </span>
              </div>

              {/* Stock fields grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">Available</div>
                  <div className="text-sm font-semibold text-emerald-600">
                    {stock.available ?? 0}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">Unavailable</div>
                  <div className="text-sm font-semibold text-amber-600">
                    {stock.unavailable ?? 0}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">Reserved</div>
                  <div className="text-sm font-medium text-gray-500">
                    {stock.reserve ?? 0}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">Pre-order</div>
                  <div className="text-sm font-medium text-gray-500">
                    {stock.preorder ?? 0}
                  </div>
                </div>
                <div className="col-span-2 sm:col-span-1 sm:text-right border-t sm:border-t-0 sm:border-l border-gray-200 pt-2 sm:pt-0 sm:pl-3">
                  <div className="text-xs text-gray-500 mb-0.5">On Hand</div>
                  <div className="text-base font-bold text-gray-900">
                    {stock.quantity ?? 0}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
