import { useState, useRef } from 'react'
import {
  Pencil,
  Trash2,
  PackagePlus,
  AlertTriangle,
  SlidersHorizontal,
  MoreVertical,
  Plus,
  Minus,
  ArrowLeftRight,
} from 'lucide-react'
import {
  DSButton,
  DSTable,
  Badge,
  Card,
  CardHeader,
  CardBody,
  EmptyState,
  Menu,
  IconButton,
} from '@uxuissk/design-system'
import StockBadge from './StockBadge'
import TransferStockModal from './TransferStockModal'
import { getTotalQuantity, isLowStock } from '../constants/inventory'

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
// CARD-015:
// - "Transfer Stock" menu item added between adjustment actions and Delete.
//   Visible to Company Owner only (role === 'company_owner').
// - TransferStockModal mounts at the table level using `transferModalProduct`
//   state. On successful transfer the modal returns the full updated stocks
//   array; we bubble it via `onTransferComplete(productId, updatedStocks)` so
//   the parent (App.jsx) can merge it into product state.
export default function ProductTable({
  products,
  role,
  onAdd,
  onEdit,
  onDelete,
  onOpenBreakdown,
  onOpenThreshold,
  onOpenAdjust,
  onTransferComplete,
  stockFailure = false,
}) {
  const isStaff = role === 'store_staff'
  const isCompanyOwner = role === 'company_owner'
  const canSetThreshold = !isStaff
  const canAdjust = !isStaff
  const canTransfer = isCompanyOwner

  // CARD-015: which product (if any) currently has the Transfer Stock modal open.
  const [transferModalProduct, setTransferModalProduct] = useState(null)

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
      header: 'Quantity',
      render: (_, row) => {
        const isPhysical = row.productType === 'physical'
        const totalQty   = getTotalQuantity(row.stocks)
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
        const totalQty   = getTotalQuantity(row.stocks)
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
            canTransfer={canTransfer && isPhysical}
            onEdit={onEdit}
            onOpenAdjust={onOpenAdjust}
            onOpenThreshold={onOpenThreshold}
            onDelete={onDelete}
            onOpenTransfer={(product) => setTransferModalProduct(product)}
          />
        )
      },
    },
  ]

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">Inventory</h3>
            <DSButton
              variant="primary"
              size="md"
              leftIcon={<PackagePlus size={15} />}
              onClick={onAdd}
            >
              Add Product
            </DSButton>
          </div>
        </CardHeader>
        <CardBody>
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
        </CardBody>
      </Card>

      {/* CARD-015: Transfer Stock modal (Aria-owned component). Mounted once
          at the table level; the active product is held in local state.
          The modal returns the full updated stocks array via
          onTransferComplete — we bubble it up to the parent so product state
          stays a single source of truth in App.jsx. */}
      {transferModalProduct && (
        <TransferStockModal
          isOpen={!!transferModalProduct}
          onClose={() => setTransferModalProduct(null)}
          product={transferModalProduct}
          userRole={role}
          onTransferComplete={(updatedStocks) => {
            onTransferComplete &&
              onTransferComplete(transferModalProduct.id, updatedStocks)
            setTransferModalProduct(null)
          }}
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

// CARD-008: Single overflow menu with the full action set per CARD-008.
// Adjustment items hidden when canAdjust=false (Store Staff or non-physical).
// Threshold item hidden when canSetThreshold=false (Store Staff).
// CARD-015: "Transfer Stock" entry added, gated by canTransfer (Company Owner
// + physical product). Placed after adjustment/threshold actions and Archive,
// immediately before the destructive Delete entry.
function RowActionMenu({
  product,
  canAdjust,
  canSetThreshold,
  canTransfer,
  onEdit,
  onOpenAdjust,
  onOpenThreshold,
  onDelete,
  onOpenTransfer,
}) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef(null)

  const items = [
    { text: 'Edit Product', icon: <Pencil size={15} />, onClick: () => { setOpen(false); onEdit && onEdit(product) } },
    { divider: true },
    ...(canAdjust ? [
      { text: 'Add Stock', icon: <Plus size={15} />, onClick: () => { setOpen(false); onOpenAdjust && onOpenAdjust(product, 'add_stock') } },
      { text: 'Decrease', icon: <Minus size={15} />, onClick: () => { setOpen(false); onOpenAdjust && onOpenAdjust(product, 'decrease') } },
    ] : []),
    ...(canAdjust || canSetThreshold ? [{ divider: true }] : []),
    ...(canSetThreshold ? [
      { text: 'Set Stock Threshold', icon: <SlidersHorizontal size={15} />, onClick: () => { setOpen(false); onOpenThreshold && onOpenThreshold(product) } },
    ] : []),
    ...(canTransfer ? [
      { divider: true },
      { text: 'Transfer Stock', icon: <ArrowLeftRight size={15} />, onClick: () => { setOpen(false); onOpenTransfer && onOpenTransfer(product) } },
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
