import { ConfirmDialog, Modal, DSButton, DSTable } from "@uxuissk/design-system"

export default function DeleteConfirmDialog({
  product,
  onConfirm,
  onClose,
  stocks,
  onGoToAdjust,
}) {
  // Guard logic — only engages if `stocks` prop provided
  const stocksList = Array.isArray(stocks) ? stocks : null
  const totalStock =
    stocksList === null
      ? 0
      : stocksList.reduce((sum, s) => sum + (Number(s?.quantity) || 0), 0)
  const hasStockGuard = stocksList !== null && totalStock > 0

  if (hasStockGuard) {
    return (
      <Modal
        open={true}
        onClose={onClose}
        title="Cannot delete — product has active stock"
        size="lg"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <DSButton variant="outline" onClick={onClose}>Cancel</DSButton>
            <DSButton variant="primary" onClick={onGoToAdjust}>Go to Adjust Stock</DSButton>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            <span className="font-medium text-gray-900">{product.name}</span>
            {product.sku && (
              <span className="text-gray-500"> — SKU: {product.sku}</span>
            )}
          </p>
          <p className="text-sm text-gray-500">
            This product still holds stock at one or more locations and cannot be permanently deleted.
            Adjust stock to zero first, then delete.
          </p>
          <DSTable
            columns={[
              { key: 'location_name', header: 'Location', render: (v) => v || '—' },
              { key: 'quantity', header: 'On Hand', render: (v) => v ?? 0 },
              { key: 'available', header: 'Available', render: (v) => v ?? 0 },
            ]}
            data={stocksList}
            bordered
            hoverable={false}
          />
        </div>
      </Modal>
    )
  }

  return (
    <ConfirmDialog
      open={true}
      title="Delete Product"
      description={`Are you sure you want to delete ${product.name}? SKU: ${product.sku} — This action cannot be undone.`}
      confirmLabel="Delete"
      variant="destructive"
      onConfirm={onConfirm}
      onClose={onClose}
    />
  )
}
