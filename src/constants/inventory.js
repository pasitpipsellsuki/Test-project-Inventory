export const LOW_STOCK_THRESHOLD = 10

// On Hand = sum of quantity across all stock locations.
export function getTotalQuantity(stocks) {
  if (!Array.isArray(stocks) || stocks.length === 0) return 0
  return stocks.reduce((sum, s) => sum + (Number(s.quantity) || 0), 0)
}

export function getStockStatus(quantity) {
  if (quantity === 0) return 'out-of-stock'
  if (quantity <= LOW_STOCK_THRESHOLD) return 'low-stock'
  return 'in-stock'
}

// Total available across all in-store locations.
export function getTotalAvailable(stocks) {
  if (!Array.isArray(stocks) || stocks.length === 0) return 0
  return stocks.reduce((sum, s) => sum + (Number(s.available) || 0), 0)
}

// Available across in-store locations only.
export function getStoreAvailable(stocks) {
  if (!Array.isArray(stocks) || stocks.length === 0) return 0
  return stocks
    .filter((s) => s.location_type === 'in-store')
    .reduce((sum, s) => sum + (Number(s.available) || 0), 0)
}

// Per-location threshold evaluation.
// Returns true if any in-store location has available stock below its threshold.
export function isLowStock(product) {
  if (!product || product.productType !== 'physical') return false
  return (product.stocks || []).some(
    (s) => s.threshold != null && (Number(s.available) || 0) < s.threshold
  )
}

// Returns array of stock entries where threshold is breached.
// Used by LowStockAlertsView to annotate each row.
export function getBreachedLocations(product) {
  if (!product || product.productType !== 'physical') return []
  return (product.stocks || []).filter(
    (s) => s.threshold != null && (Number(s.available) || 0) < s.threshold
  )
}
