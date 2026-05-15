import { useEffect } from 'react'
import { ConfirmDialog } from "@uxuissk/design-system"

// CARD-008 fix B4: Confirmation dialog for archiving a product.
// Archive is reversible (status flag) but should not fire on a single click —
// this dialog gates the action with an explicit confirmation.
//
// Props:
//   product:   the product being archived ({ name, sku, ... })
//   onConfirm: () => void — user confirms
//   onClose:   () => void — user cancels / closes / Esc
export default function ArchiveConfirmDialog({ product, onConfirm, onClose }) {
  // Keep the Escape key handler (safety) — DS Modal may or may not handle it
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  if (!product) return null

  return (
    <ConfirmDialog
      open={true}
      title="Archive Product"
      description={`${product.name}${product.sku ? ` — SKU: ${product.sku}` : ''}\n\nThis product will be archived. Stock records will be intact and it will be hidden from the main product list.`}
      confirmLabel="Archive"
      cancelLabel="Cancel"
      variant="default"
      onConfirm={onConfirm}
      onClose={onClose}
    />
  )
}
