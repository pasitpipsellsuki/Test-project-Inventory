// Stock data model — each `stocks` entry: { id, location_name, location_type,
// quantity, available, unavailable, reserve, preorder, threshold, updatedAt }.
// Invariant: quantity = available + unavailable + reserve + preorder.
// threshold: number | null — per-location stock alert threshold (available-based).
// Only in-store locations are managed by this system; fulfillment locations
// are managed by WMS and are not included here.
// `productType` drives qty-column display ('physical' shows total; digital/service show "–").

export const mockProducts = [
  {
    id: 1,
    sku: 'SKU-001',
    name: 'Wireless Keyboard',
    price: 79.99,
    category: 'Electronics',
    productType: 'physical',
    status: 'active',
    updatedAt: '2026-03-28T09:15:00.000Z',
    stocks: [
      {
        id: 102,
        location_name: 'Patona Store Front',
        location_type: 'in-store',
        quantity: 15,        // 12 + 1 + 2 + 0
        available: 12,
        unavailable: 1,
        reserve: 2,
        preorder: 0,
        threshold: 15,
        updatedAt: '2026-03-28T09:15:00.000Z',
      },
      {
        id: 'loc-instore-2',
        location_name: 'สาขาสีลม',
        location_type: 'in-store',
        quantity: 18,        // 15 + 2 + 1 + 0
        available: 15,
        unavailable: 2,
        reserve: 1,
        preorder: 0,
        threshold: 10,
        updatedAt: '2026-03-28T09:15:00.000Z',
      },
    ],
  },
  {
    id: 2,
    sku: 'SKU-002',
    name: 'Ergonomic Office Chair',
    price: 299.99,
    category: 'Furniture',
    productType: 'physical',
    status: 'active',
    updatedAt: '2026-04-01T14:30:00.000Z',
    stocks: [
      {
        id: 202,
        location_name: 'Patona Store Front',
        location_type: 'in-store',
        quantity: 3,         // 2 + 0 + 1 + 0
        available: 2,
        unavailable: 0,
        reserve: 1,
        preorder: 0,
        threshold: 3,
        updatedAt: '2026-04-01T14:30:00.000Z',
      },
      {
        id: 'loc-instore-2',
        location_name: 'สาขาสีลม',
        location_type: 'in-store',
        quantity: 18,        // 15 + 2 + 1 + 0
        available: 15,
        unavailable: 2,
        reserve: 1,
        preorder: 0,
        threshold: 8,
        updatedAt: '2026-04-01T14:30:00.000Z',
      },
    ],
  },
  {
    id: 3,
    sku: 'SKU-003',
    name: 'USB-C Hub 7-in-1',
    price: 49.99,
    category: 'Electronics',
    productType: 'physical',
    status: 'active',
    updatedAt: '2026-04-07T11:00:00.000Z',
    stocks: [
      {
        id: 302,
        location_name: 'Patona Store Front',
        location_type: 'in-store',
        quantity: 1,         // 1 + 0 + 0 + 0
        available: 1,
        unavailable: 0,
        reserve: 0,
        preorder: 0,
        threshold: 3,
        updatedAt: '2026-04-07T11:00:00.000Z',
      },
      {
        id: 'loc-instore-2',
        location_name: 'สาขาสีลม',
        location_type: 'in-store',
        quantity: 18,        // 15 + 2 + 1 + 0
        available: 15,
        unavailable: 2,
        reserve: 1,
        preorder: 0,
        threshold: null,
        updatedAt: '2026-04-07T11:00:00.000Z',
      },
    ],
  },
  {
    id: 4,
    sku: 'SKU-004',
    name: 'Height-Adjustable Standing Desk',
    price: 599.99,
    category: 'Furniture',
    productType: 'physical',
    status: 'active',
    updatedAt: '2026-04-10T16:45:00.000Z',
    stocks: [
      {
        id: 402,
        location_name: 'Patona Store Front',
        location_type: 'in-store',
        quantity: 0,
        available: 0,
        unavailable: 0,
        reserve: 0,
        preorder: 0,
        threshold: 1,
        updatedAt: '2026-04-10T16:45:00.000Z',
      },
      {
        id: 'loc-instore-2',
        location_name: 'สาขาสีลม',
        location_type: 'in-store',
        quantity: 18,        // 15 + 2 + 1 + 0
        available: 15,
        unavailable: 2,
        reserve: 1,
        preorder: 0,
        threshold: 1,
        updatedAt: '2026-04-10T16:45:00.000Z',
      },
    ],
  },
  {
    id: 5,
    sku: 'SKU-005',
    name: 'Mechanical Pencil Set (12pcs)',
    price: 12.99,
    category: 'Stationery',
    productType: 'physical',
    status: 'active',
    updatedAt: '2026-04-14T08:20:00.000Z',
    stocks: [
      {
        id: 502,
        location_name: 'Patona Store Front',
        location_type: 'in-store',
        quantity: 40,        // 35 + 2 + 3 + 0
        available: 35,
        unavailable: 2,
        reserve: 3,
        preorder: 0,
        threshold: null,
        updatedAt: '2026-04-14T08:20:00.000Z',
      },
      {
        id: 'loc-instore-2',
        location_name: 'สาขาสีลม',
        location_type: 'in-store',
        quantity: 18,        // 15 + 2 + 1 + 0
        available: 15,
        unavailable: 2,
        reserve: 1,
        preorder: 0,
        threshold: 20,
        updatedAt: '2026-04-14T08:20:00.000Z',
      },
    ],
  },
  // --- Non-physical products (no stock tracking, qty column shows "–") ---
  {
    id: 6,
    sku: 'SKU-006',
    name: 'Annual Software License',
    price: 199.00,
    category: 'Digital',
    productType: 'digital',
    status: 'active',
    updatedAt: '2026-04-20T10:00:00.000Z',
    stocks: [],
  },
  {
    id: 7,
    sku: 'SKU-007',
    name: 'On-site Installation Service',
    price: 150.00,
    category: 'Service',
    productType: 'service',
    status: 'active',
    updatedAt: '2026-04-22T15:30:00.000Z',
    stocks: [],
  },
]

// Mock API for Transfer Stock between in-store locations.
export async function transferStock(
  productId,
  sourceLocationId,
  destinationLocationId,
  qty,
) {
  await new Promise((r) => setTimeout(r, 400))

  if (qty % 13 === 0) {
    throw new Error('Transfer failed — mock error')
  }

  const product = mockProducts.find((p) => p.id === productId)
  if (!product) {
    throw new Error(`Product ${productId} not found`)
  }

  const nowIso = new Date().toISOString()

  const updatedStocks = product.stocks.map((s) => {
    if (s.id === sourceLocationId) {
      const nextAvail = (Number(s.available) || 0) - qty
      const nextQty = (Number(s.quantity) || 0) - qty
      return { ...s, available: nextAvail, quantity: nextQty, updatedAt: nowIso }
    }
    if (s.id === destinationLocationId) {
      const nextAvail = (Number(s.available) || 0) + qty
      const nextQty = (Number(s.quantity) || 0) + qty
      return { ...s, available: nextAvail, quantity: nextQty, updatedAt: nowIso }
    }
    return s
  })

  return updatedStocks
}
