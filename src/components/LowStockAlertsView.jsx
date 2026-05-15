import { CheckCircle } from 'lucide-react'
import { StatCard, Badge, Card, CardBody, DSTable, EmptyState } from "@uxuissk/design-system"
import StockBadge from './StockBadge'
import {
  getTotalQuantity,
  getTotalAvailable,
  getBreachedLocations,
} from '../constants/inventory'

export default function LowStockAlertsView({ lowStockProducts }) {
  const columns = [
    {
      key: 'sku',
      header: 'SKU',
      render: (_, row) => (
        <span className="font-mono text-sm text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
          {row.sku}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      render: (_, row) => (
        <span className="text-sm font-medium text-gray-900 max-w-[200px] block truncate" title={row.name}>
          {row.name}
        </span>
      ),
    },
    { key: 'category', header: 'Category' },
    {
      key: 'available',
      header: 'Available',
      render: (_, row) => (
        <span className="text-sm font-semibold text-gray-900">{getTotalAvailable(row.stocks)}</span>
      ),
    },
    {
      key: 'breach',
      header: 'Breached Locations',
      render: (_, row) => {
        const breached = getBreachedLocations(row)
        if (!breached.length) return <span className="text-xs text-gray-400">—</span>
        return (
          <div className="flex flex-wrap gap-1">
            {breached.map((s) => (
              <Badge key={s.id} variant="warning" size="sm">
                {s.location_name} (avail: {Number(s.available).toLocaleString()} / threshold: {s.threshold})
              </Badge>
            ))}
          </div>
        )
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (_, row) => (
        <StockBadge quantity={getTotalQuantity(row.stocks)} />
      ),
    },
  ]

  const sortedProducts = [...lowStockProducts].sort(
    (a, b) => getTotalAvailable(a.stocks) - getTotalAvailable(b.stocks)
  )

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Low Stock Alerts</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Products with one or more locations below their configured threshold (based on available units)
        </p>
      </div>

      {lowStockProducts.length === 0 ? (
        <EmptyState
          icon={<CheckCircle size={48} />}
          title="No low stock items"
          description="All products are at or above their configured thresholds."
        />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <StatCard title="Products at Risk" value={lowStockProducts.length} />
            <StatCard title="Out of Stock" value={lowStockProducts.filter((p) => getTotalAvailable(p.stocks) === 0).length} />
            <StatCard title="Low Stock" value={lowStockProducts.filter((p) => getTotalAvailable(p.stocks) > 0).length} />
          </div>

          <Card>
            <CardBody>
              <DSTable
                columns={columns}
                data={sortedProducts}
                hoverable
                striped
              />
            </CardBody>
          </Card>
        </>
      )}
    </div>
  )
}
