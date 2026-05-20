import { useState, useRef } from 'react'
import {
  Pencil,
  Trash2,
  PackagePlus,
  AlertTriangle,
  SlidersHorizontal,
  MoreVertical,
} from 'lucide-react'
import {
  DSButton,
  DSTable,
  Badge,
  EmptyState,
  Menu,
  IconButton,
} from '@uxuissk/design-system'
import StockBadge from './StockBadge'
import { getTotalAvailable, isLowStock } from '../constants/inventory'

// CARD-006:
// - Qty column: physical -> total quantity across stocks (clickable -> opens breakdown modal).
//   digital / service -> "–".
// - Stock failure flag (`stockFailure` prop): all rows show "–", no other UI affected.
// - StockBadge only shown for physical products with successful stock load.
// - Inline location expander removed; Leo's StockBreakdownModal replaces it.
//
// CARD-007:
// - Low-stock indicator (amber AlertTriangle) shown next to qty when isLowStock(product).
// - "Set Stock Threshold" action in the row action group. Hidden for Store Staff.
//
// CARD-008:
// - Row actions consolidated into a single overflow menu (3-dot) with the full set:
//   Edit / Add Stock / Decrease / Mark Damaged / Set Stock Threshold / Archive / Delete.
// - Add Stock / Decrease / Mark Damaged hidden for Store Staff role.
// - Set Stock Threshold hidden for Store Staff (existing CARD-007 rule).
// - Archive calls onArchive(product); Delete keeps existing onDelete signature
//   (Leo's ArchiveDeleteGuard wraps the delete confirm in App.jsx).
//
// CARD-018 (BRD Round 8, 2026-05-19):
// - "Transfer Stock" menu item and TransferStockModal removed entirely.
//   Transfer is now handled via Transfer In / Transfer Out reason codes
//   inside the Adjust Stock flow. canTransfer / onTransferComplete prop
//   chain dropped.
export default function ProductTable({
  products,
  role,
  onAdd,
  onEdit,
  onDelete,
  onOpenBreakdown,
  onOpenThreshold,
  onOpenAdjust,
  stockFailure = false,
}) {
  const isStaff = role === 'store_staff'
  const canSetThreshold = !isStaff
  const canAdjust = !isStaff

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
        <span
          className="text-sm font-medium text-gray-900 max-w-[200px] block truncate"
          title={row.name}
        >
          {row.name}
        </span>
      ),
    },
    {
      key: 'productType',
      header: 'Type',
      render: (_, row) => <ProductTypeBadge type={row.productType} />,
    },
    {
      key: 'category',
      header: 'Category',
      render: (_, row) => (
        <span className="text-sm text-gray-600">{row.category}</span>
      ),
    },
    {
      key: 'quantity',
      header: 'Available',
      render: (_, row) => {
        const isPhysical = row.productType === 'physical'
        const totalQty   = getTotalAvailable(row.stocks)
        const lowStock   = isPhysical && !stockFailure && isLowStock(row)
        return (
          <div className="inline-flex items-center gap-1.5 justify-end">
            {lowStock && (
              <span
                title="Below configured stock threshold"
                className="inline-flex items-center text-amber-600"
              >
                <AlertTriangle size={14} />
              </span>
            )}
            <QtyCell
              product={row}
              isPhysical={isPhysical}
              totalQty={totalQty}
              stockFailure={stockFailure}
              onOpenBreakdown={onOpenBreakdown}
            />
          </div>
        )
      },
    },
    {
      key: 'price',
      header: 'Price',
      render: (_, row) => (
        <span className="text-sm text-gray-900">${row.price.toFixed(2)}</span>
      ),
    },
    {
      key: 'stockStatus',
      header: 'Status',
      render: (_, row) => {
        const isPhysical = row.productType === 'physical'
        const totalQty   = getTotalAvailable(row.stocks)
        return isPhysical && !stockFailure ? (
          <StockBadge quantity={totalQty} />
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, row) => {
        const isPhysical = row.productType === 'physical'
        return (
          <RowActionMenu
            product={row}
            canAdjust={canAdjust && isPhysical}
            canSetThreshold={canSetThreshold}
            onEdit={onEdit}
            onOpenAdjust={onOpenAdjust}
            onOpenThreshold={onOpenThreshold}
            onDelete={onDelete}
          />
        )
      },
    },
  ]

  return (
    <>
      {products.length === 0 ? (
        <EmptyState
          icon={<PackagePlus size={48} />}
          title="No products found"
          description="Try adjusting your search or filters, or add a new product."
          action={
            <DSButton
              variant="primary"
              leftIcon={<PackagePlus size={16} />}
              onClick={onAdd}
            >
              Add Product
            </DSButton>
          }
        />
      ) : (
        <DSTable
          columns={columns}
          data={products}
          hoverable
          striped
        />
      )}
    </>
  )
}

function QtyCell({ product, isPhysical, totalQty, stockFailure, onOpenBreakdown }) {
  // Stock failure simulation -> always show "–" regardless of product type.
  if (stockFailure) {
    return <span className="text-sm text-gray-400" title="Stock data unavailable">–</span>
  }
  if (!isPhysical) {
    return <span className="text-sm text-gray-400" title="Not stock-tracked">–</span>
  }
  // CARD-014: replaced raw <button> + hardcoded hex text-[#32a9ff] with
  // the DS link button variant — keeps the inline-clickable semantics and
  // routes color through the DS link token.
  return (
    <DSButton
      variant="link"
      size="sm"
      onClick={() => onOpenBreakdown && onOpenBreakdown(product)}
      title="View per-location breakdown"
    >
      {totalQty.toLocaleString()}
    </DSButton>
  )
}

// CARD-008: Single overflow menu with the full action set.
// Adjustment items hidden when canAdjust=false (Store Staff or non-physical).
// Threshold item hidden when canSetThreshold=false (Store Staff).
//
// CARD-017 (BRD JC-01, 2026-05-19): Adjustment block reworked into a single
// "Adjust Stock" (adjust) entry, gated by canAdjust (!isStaff && isPhysical).
//
// CARD-018 (BRD Round 8, 2026-05-19): Menu trimmed to 3 entries max.
// - Removed: "Mark Unavailable" and "Restore to Available" (now reason codes
//   inside the Adjust Stock flow).
// - Removed: "Transfer Stock" (now Transfer In/Out reason codes).
// Menu = Edit Product / [divider] / Adjust Stock / [divider] /
//   Set Stock Threshold (if applicable) / [divider] / Delete Product.
function RowActionMenu({
  product,
  canAdjust,
  canSetThreshold,
  onEdit,
  onOpenAdjust,
  onOpenThreshold,
  onDelete,
}) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef(null)

  const items = [
    { text: 'Edit Product', icon: <Pencil size={15} />, onClick: () => { setOpen(false); onEdit && onEdit(product) } },
    ...(canAdjust || canSetThreshold ? [{ divider: true }] : []),
    ...(canAdjust ? [
      { text: 'Adjust Stock', icon: <PackagePlus size={15} />, onClick: () => { setOpen(false); onOpenAdjust && onOpenAdjust(product, 'adjust') } },
    ] : []),
    ...(canAdjust && canSetThreshold ? [{ divider: true }] : []),
    ...(canSetThreshold ? [
      { text: 'Set Stock Threshold', icon: <SlidersHorizontal size={15} />, onClick: () => { setOpen(false); onOpenThreshold && onOpenThreshold(product) } },
    ] : []),
    { divider: true },
    { text: 'Delete Product', icon: <Trash2 size={15} />, onClick: () => { setOpen(false); onDelete && onDelete(product) }, destructive: true },
  ]

  return (
    <div className="relative inline-block">
      <IconButton
        ref={triggerRef}
        variant="ghost"
        size="sm"
        icon={<MoreVertical size={16} />}
        aria-label="Product actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      />
      <Menu
        items={items}
        open={open}
        onClose={() => setOpen(false)}
        triggerRef={triggerRef}
      />
    </div>
  )
}

function ProductTypeBadge({ type }) {
  if (type === 'physical') return <Badge variant="secondary">Physical</Badge>
  if (type === 'digital')  return <Badge variant="default">Digital</Badge>
  if (type === 'service')  return <Badge variant="outline">Service</Badge>
  return <Badge variant="default">{type || 'unknown'}</Badge>
}
