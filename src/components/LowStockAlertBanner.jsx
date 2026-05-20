import { Alert, DSButton } from "@uxuissk/design-system"
import { getTotalAvailable } from '../constants/inventory'

export default function LowStockAlertBanner({ lowStockProducts, onViewAlerts }) {
  if (lowStockProducts.length === 0) return null

  // CARD-007: split based on `available`, not `quantity` (matches threshold logic).
  // A product with zero sellable units across every location is treated as out of stock.
  const outOfStock = lowStockProducts.filter((p) => getTotalAvailable(p.stocks) === 0)
  const lowStock   = lowStockProducts.filter((p) => getTotalAvailable(p.stocks) > 0)

  return (
    <div className="mb-6">
      <Alert
        variant="warning"
        title={`${lowStockProducts.length} product${lowStockProducts.length !== 1 ? 's' : ''} need attention`}
      >
        <div>
          <ul className="mt-1 space-y-0.5">
            {outOfStock.map((p) => (
              <li key={p.id} className="text-xs">
                <span className="font-mono">{p.sku}</span> — {p.name}{' '}
                <span className="font-semibold text-red-600">(Out of Stock)</span>
              </li>
            ))}
            {lowStock.map((p) => (
              <li key={p.id} className="text-xs">
                <span className="font-mono">{p.sku}</span> — {p.name}{' '}
                <span className="font-medium">({getTotalAvailable(p.stocks)} available)</span>
              </li>
            ))}
          </ul>
          <DSButton variant="link" size="sm" onClick={onViewAlerts}>
            View all alerts →
          </DSButton>
        </div>
      </Alert>
    </div>
  )
}
