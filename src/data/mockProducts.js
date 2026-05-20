// Stock data model — each `stocks` entry: { id, location_name, location_type,
// quantity, available, unavailable, reserve, preorder, threshold, updatedAt }.
// Invariant: quantity = available + unavailable + reserve + preorder.
// threshold: number | null — per-location stock alert threshold (available-based).
// Only in-store locations are managed by this system; fulfillment locations
// are managed by WMS and are not included here.
// `productType` drives qty-column display ('physical' shows total; digital/service show "–").
// stockLimits: { min, max } — per-SKU Min/Max stock limits (CARD-019). Physical
// products only. null means no limit configured. Min drives isLowStock when set
// (sum of in-store available <= min). Max is informational only.

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
    stockLimits: { min: 65, max: 120 },
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
      {
        id: 'loc-instore-3',
        location_name: 'สาขาอโศก',
        location_type: 'in-store',
        quantity: 11,        // 8 + 1 + 2 + 0
        available: 8,
        unavailable: 1,
        reserve: 2,
        preorder: 0,
        threshold: 12,
        updatedAt: '2026-03-28T09:15:00.000Z',
      },
      {
        id: 'loc-instore-4',
        location_name: 'สาขาสยาม',
        location_type: 'in-store',
        quantity: 27,        // 22 + 3 + 2 + 0
        available: 22,
        unavailable: 3,
        reserve: 2,
        preorder: 0,
        threshold: 15,
        updatedAt: '2026-03-28T09:15:00.000Z',
      },
      {
        id: 'loc-instore-5',
        location_name: 'สาขารัชดา',
        location_type: 'in-store',
        quantity: 7,         // 5 + 0 + 1 + 1
        available: 5,
        unavailable: 0,
        reserve: 1,
        preorder: 1,
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
    stockLimits: { min: 30, max: 60 },
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
      {
        id: 'loc-instore-3',
        location_name: 'สาขาอโศก',
        location_type: 'in-store',
        quantity: 5,         // 3 + 1 + 1 + 0
        available: 3,
        unavailable: 1,
        reserve: 1,
        preorder: 0,
        threshold: 6,
        updatedAt: '2026-04-01T14:30:00.000Z',
      },
      {
        id: 'loc-instore-4',
        location_name: 'สาขาสยาม',
        location_type: 'in-store',
        quantity: 9,         // 7 + 0 + 2 + 0
        available: 7,
        unavailable: 0,
        reserve: 2,
        preorder: 0,
        threshold: 5,
        updatedAt: '2026-04-01T14:30:00.000Z',
      },
      {
        id: 'loc-instore-5',
        location_name: 'สาขารัชดา',
        location_type: 'in-store',
        quantity: 1,         // 0 + 1 + 0 + 0
        available: 0,
        unavailable: 1,
        reserve: 0,
        preorder: 0,
        threshold: 4,
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
    stockLimits: { min: null, max: null },
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
      {
        id: 'loc-instore-3',
        location_name: 'สาขาอโศก',
        location_type: 'in-store',
        quantity: 24,        // 20 + 1 + 3 + 0
        available: 20,
        unavailable: 1,
        reserve: 3,
        preorder: 0,
        threshold: 8,
        updatedAt: '2026-04-07T11:00:00.000Z',
      },
      {
        id: 'loc-instore-4',
        location_name: 'สาขาสยาม',
        location_type: 'in-store',
        quantity: 6,         // 4 + 0 + 1 + 1
        available: 4,
        unavailable: 0,
        reserve: 1,
        preorder: 1,
        threshold: 10,
        updatedAt: '2026-04-07T11:00:00.000Z',
      },
      {
        id: 'loc-instore-5',
        location_name: 'สาขารัชดา',
        location_type: 'in-store',
        quantity: 12,        // 11 + 1 + 0 + 0
        available: 11,
        unavailable: 1,
        reserve: 0,
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
    stockLimits: { min: 20, max: 40 },
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
      {
        id: 'loc-instore-3',
        location_name: 'สาขาอโศก',
        location_type: 'in-store',
        quantity: 4,         // 1 + 1 + 1 + 1
        available: 1,
        unavailable: 1,
        reserve: 1,
        preorder: 1,
        threshold: 2,
        updatedAt: '2026-04-10T16:45:00.000Z',
      },
      {
        id: 'loc-instore-4',
        location_name: 'สาขาสยาม',
        location_type: 'in-store',
        quantity: 3,         // 2 + 0 + 1 + 0
        available: 2,
        unavailable: 0,
        reserve: 1,
        preorder: 0,
        threshold: 3,
        updatedAt: '2026-04-10T16:45:00.000Z',
      },
      {
        id: 'loc-instore-5',
        location_name: 'สาขารัชดา',
        location_type: 'in-store',
        quantity: 0,
        available: 0,
        unavailable: 0,
        reserve: 0,
        preorder: 0,
        threshold: 2,
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
    stockLimits: { min: null, max: null },
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
      {
        id: 'loc-instore-3',
        location_name: 'สาขาอโศก',
        location_type: 'in-store',
        quantity: 52,        // 46 + 3 + 3 + 0
        available: 46,
        unavailable: 3,
        reserve: 3,
        preorder: 0,
        threshold: 25,
        updatedAt: '2026-04-14T08:20:00.000Z',
      },
      {
        id: 'loc-instore-4',
        location_name: 'สาขาสยาม',
        location_type: 'in-store',
        quantity: 14,        // 9 + 2 + 1 + 2
        available: 9,
        unavailable: 2,
        reserve: 1,
        preorder: 2,
        threshold: 15,
        updatedAt: '2026-04-14T08:20:00.000Z',
      },
      {
        id: 'loc-instore-5',
        location_name: 'สาขารัชดา',
        location_type: 'in-store',
        quantity: 30,        // 28 + 1 + 1 + 0
        available: 28,
        unavailable: 1,
        reserve: 1,
        preorder: 0,
        threshold: null,
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
