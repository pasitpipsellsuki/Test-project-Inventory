import { Badge } from "@uxuissk/design-system"
import { getStockStatus } from '../constants/inventory'

const STATUS_VARIANT = {
  'in-stock':     'success',
  'low-stock':    'warning',
  'out-of-stock': 'destructive',
}

const STATUS_LABEL = {
  'in-stock':     'In Stock',
  'low-stock':    'Low Stock',
  'out-of-stock': 'Out of Stock',
}

export default function StockBadge({ quantity }) {
  const status = getStockStatus(quantity)
  return (
    <Badge variant={STATUS_VARIANT[status] ?? 'default'}>
      {STATUS_LABEL[status] ?? status}
    </Badge>
  )
}
