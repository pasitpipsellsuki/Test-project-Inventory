import { useState, useMemo } from 'react'
import { ShieldAlert } from 'lucide-react'
import { Tabs, TopNavbar } from '@uxuissk/design-system'
import Sidebar from './components/Sidebar'
import ProductTable from './components/ProductTable'
import ProductForm from './components/ProductForm'
import DeleteConfirmDialog from './components/DeleteConfirmDialog'
import LowStockAlertBanner from './components/LowStockAlertBanner'
import LowStockAlertsView from './components/LowStockAlertsView'
import SearchFilterBar from './components/SearchFilterBar'
import StockBreakdownModal from './components/StockBreakdownModal'
import StockThresholdModal from './components/StockThresholdModal'
import StockAdjustmentModal from './components/StockAdjustmentModal'
// CARD-008: Leo's confirmation review modal (StockAdjustmentConfirmModal.jsx)
import StockAdjustmentConfirmModal from './components/StockAdjustmentConfirmModal'
import { mockProducts } from './data/mockProducts'
import { isLowStock, getStockStatus, getTotalQuantity } from './constants/inventory'

// CARD-006: role/context simulation for local dev (no real auth).
// Company Owner -> CCS3 (sees all locations).
// Store Admin / Store Staff -> Patona (sees own store; in-store locations only).
const ROLES = {
  COMPANY_OWNER: 'company_owner',
  STORE_ADMIN:   'store_admin',
  STORE_STAFF:   'store_staff',
}
const CONTEXTS = {
  CCS3:   'ccs3',
  PATONA: 'patona',
}
const ROLE_LABELS = {
  [ROLES.COMPANY_OWNER]: 'Company Owner',
  [ROLES.STORE_ADMIN]:   'Store Admin',
  [ROLES.STORE_STAFF]:   'Store Staff',
}
function contextForRole(role) {
  return role === ROLES.COMPANY_OWNER ? CONTEXTS.CCS3 : CONTEXTS.PATONA
}

const VIEWS = { PRODUCTS: 'products', ALERTS: 'alerts' }

export default function App() {
  // Core state
  const [products, setProducts]           = useState(mockProducts)
  const [currentView, setCurrentView]     = useState(VIEWS.PRODUCTS)
  const [formOpen, setFormOpen]           = useState(false)
  const [deleteOpen, setDeleteOpen]       = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)

  // Concurrency conflict state
  const [conflictType, setConflictType]   = useState(null)
  const [conflictData, setConflictData]   = useState(null)

  // Search + filter state
  const [searchQuery, setSearchQuery]       = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [stockFilter, setStockFilter]       = useState('all')
  // CARD-007: separate low-stock-only toggle (independent of stock-status dropdown).
  const [lowStockOnly, setLowStockOnly]     = useState(false)

  // CARD-006: role + context (context derives from role).
  const [role, setRole] = useState(ROLES.COMPANY_OWNER)
  const context = contextForRole(role)

  // CARD-006: stock breakdown modal state.
  const [breakdownOpen, setBreakdownOpen]               = useState(false)
  const [selectedStockProduct, setSelectedStockProduct] = useState(null)

  // CARD-007: stock threshold modal state (Leo's component).
  const [thresholdOpen, setThresholdOpen]                       = useState(false)
  const [selectedThresholdProduct, setSelectedThresholdProduct] = useState(null)

  // CARD-006: stock failure simulation flag (toggleable in dev header).
  const [stockFailure, setStockFailure] = useState(false)

  // CARD-008: stock adjustment modal state (Aria's component).
  const [adjustOpen, setAdjustOpen]             = useState(false)
  const [adjustAction, setAdjustAction]         = useState(null) // 'add_stock' | 'decrease' | 'mark_damaged'
  const [adjustProduct, setAdjustProduct]       = useState(null)
  // CARD-008: confirmation review modal state (Leo's component).
  const [confirmOpen, setConfirmOpen]                 = useState(false)
  const [pendingAdjustment, setPendingAdjustment]     = useState(null)
  // CARD-008 fix B3: pre-fill state used when re-opening adjustment modal from
  // the confirm modal's Back button — restores Step 3 with prior qty + reason.
  const [adjustInitialState, setAdjustInitialState]   = useState(null)
  // CARD-008: dev toggle to simulate API failure on adjustment submission.
  const [mockApiError, setMockApiError]               = useState(false)

  // CARD-011: sidebar expanded/collapsed state.
  const [sidebarExpanded, setSidebarExpanded] = useState(true)

  // Derived: low stock products. CARD-007 switched to available-based per-threshold
  // evaluation. Non-physical / no-threshold products are excluded by isLowStock.
  const lowStockProducts = useMemo(
    () => products.filter((p) => isLowStock(p)),
    [products]
  )

  // Derived: unique categories for filter dropdown
  const allCategories = useMemo(
    () => [...new Set(products.map((p) => p.category))].sort(),
    [products]
  )

  // Derived: filtered product list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = searchQuery.toLowerCase()
      const matchesSearch =
        !searchQuery ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q)

      const matchesCategory =
        categoryFilter === 'all' || p.category === categoryFilter

      // Stock-status filter (badge-driven, CARD-006). Non-physical products always
      // pass through.
      const matchesStock =
        stockFilter === 'all' ||
        p.productType !== 'physical' ||
        getStockStatus(getTotalQuantity(p.stocks)) === stockFilter

      // CARD-007: low-stock-only toggle (available-based, per-threshold logic).
      const matchesLowStock = !lowStockOnly || isLowStock(p)

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStock &&
        matchesLowStock
      )
    })
  }, [products, searchQuery, categoryFilter, stockFilter, lowStockOnly])

  // Handlers — CRUD
  const handleAddClick = () => { setSelectedProduct(null); setFormOpen(true) }
  const handleEditClick = (product) => { setSelectedProduct(product); setFormOpen(true) }
  const handleDeleteClick = (product) => { setSelectedProduct(product); setDeleteOpen(true) }
  const handleFormClose = () => { setFormOpen(false); setSelectedProduct(null) }
  const handleDeleteClose = () => { setDeleteOpen(false); setSelectedProduct(null) }

  // CARD-006: breakdown modal handlers.
  const handleOpenBreakdown = (product) => {
    setSelectedStockProduct(product)
    setBreakdownOpen(true)
  }
  const handleCloseBreakdown = () => {
    setBreakdownOpen(false)
    setSelectedStockProduct(null)
  }

  // CARD-007: stock threshold modal handlers (Leo's component).
  const handleOpenThreshold = (product) => {
    // Defensive — Store Staff should never trigger this (action hidden in table),
    // but if anything calls it the modal itself is also role-gated.
    if (role === ROLES.STORE_STAFF) return
    setSelectedThresholdProduct(product)
    setThresholdOpen(true)
  }
  const handleCloseThreshold = () => {
    setThresholdOpen(false)
    setSelectedThresholdProduct(null)
  }
  // locationThresholds = [{ locationId, threshold: number | null }]
  const handleThresholdSave = (productId, locationThresholds) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p
        return {
          ...p,
          stocks: p.stocks.map((s) => {
            const found = locationThresholds.find((lt) => lt.locationId === s.id)
            return found !== undefined ? { ...s, threshold: found.threshold } : s
          }),
          updatedAt: new Date().toISOString(),
        }
      })
    )
    handleCloseThreshold()
  }

  const handleSave = (productData, openedAt) => {
    if (selectedProduct) {
      const current = products.find((p) => p.id === selectedProduct.id)
      if (!current) {
        handleConflictDeleted()
        return
      }
      if (current.updatedAt !== openedAt) {
        handleConflictModified(productData, current)
        return
      }
      setProducts((prev) =>
        prev.map((p) =>
          p.id === selectedProduct.id
            ? { ...productData, id: selectedProduct.id, updatedAt: new Date().toISOString() }
            : p
        )
      )
      handleFormClose()
    } else {
      setProducts((prev) => [
        ...prev,
        { ...productData, id: crypto.randomUUID(), updatedAt: new Date().toISOString() },
      ])
      handleFormClose()
    }
  }

  const handleConflictDeleted = () => {
    setConflictType('deleted')
  }

  const handleConflictModified = (productData, latestProduct) => {
    setConflictType('modified')
    setConflictData({ pending: productData, latest: latestProduct })
  }

  const handleReloadLatest = () => {
    const latest = conflictData?.latest
    setConflictType(null)
    setConflictData(null)
    setFormOpen(false)
    setSelectedProduct(null)
    if (latest) {
      setSelectedProduct(latest)
      setFormOpen(true)
    }
  }

  const handleSaveAnyway = (productData) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === selectedProduct.id
          ? { ...productData, id: selectedProduct.id, updatedAt: new Date().toISOString() }
          : p
      )
    )
    setConflictType(null)
    setConflictData(null)
    handleFormClose()
  }

  const handleConflictClose = () => {
    setConflictType(null)
    setConflictData(null)
    handleFormClose()
  }

  const handleDeleteConfirm = () => {
    setProducts((prev) => prev.filter((p) => p.id !== selectedProduct.id))
    handleDeleteClose()
  }

  // Stock adjustment flow handlers.
  const handleOpenAdjust = (product, action) => {
    // Fresh open from product table — clear any prior pre-fill from a Back nav.
    setAdjustInitialState(null)
    setAdjustProduct(product)
    setAdjustAction(action)
    setAdjustOpen(true)
  }

  const handleAdjustConfirm = (adjustmentData) => {
    // Step 3 -> hand off to Leo's confirmation modal.
    setAdjustOpen(false)
    setPendingAdjustment(adjustmentData)
    setConfirmOpen(true)
  }

  // Back from confirm modal restores entry step pre-filled (incl. note + imageFile).
  const handleAdjustBack = () => {
    setConfirmOpen(false)
    setAdjustInitialState({
      locationId: pendingAdjustment?.locationId,
      qty: String(pendingAdjustment?.qty),
      reason: pendingAdjustment?.reason,
      note: pendingAdjustment?.note ?? '',
      imageFile: pendingAdjustment?.imageFile ?? null,
    })
    setAdjustOpen(true)
  }

  const handleAdjustFinalConfirm = () => {
    if (!pendingAdjustment) return
    const { productId, action, locationId, qty } = pendingAdjustment
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p
        const newStocks = (p.stocks || []).map((s) => {
          if (s.id !== locationId) return s
          const avail = Number(s.available) || 0
          const unav = Number(s.unavailable) || 0
          const quan = Number(s.quantity) || 0
          if (action === 'add_stock') {
            return {
              ...s,
              available: avail + qty,
              quantity: quan + qty,
              updatedAt: new Date().toISOString(),
            }
          }
          if (action === 'decrease') {
            return {
              ...s,
              available: avail - qty,
              quantity: quan - qty,
              updatedAt: new Date().toISOString(),
            }
          }
          if (action === 'mark_damaged') {
            return {
              ...s,
              available: avail - qty,
              unavailable: unav + qty,
              // quantity unchanged
              updatedAt: new Date().toISOString(),
            }
          }
          return s
        })
        return { ...p, stocks: newStocks, updatedAt: new Date().toISOString() }
      })
    )
    setConfirmOpen(false)
    setPendingAdjustment(null)
    setAdjustProduct(null)
    setAdjustAction(null)
    setAdjustInitialState(null)
  }

  const handleAdjustCancel = () => {
    setAdjustOpen(false)
    setConfirmOpen(false)
    setPendingAdjustment(null)
    setAdjustProduct(null)
    setAdjustAction(null)
    setAdjustInitialState(null)
  }

  const handleClearFilters = () => {
    setSearchQuery('')
    setCategoryFilter('all')
    setStockFilter('all')
    setLowStockOnly(false)
  }

  // SKUs excluding the product currently being edited (for uniqueness check)
  const existingSKUs = products
    .filter((p) => !selectedProduct || p.id !== selectedProduct.id)
    .map((p) => p.sku)

  // Tab definitions for DS Tabs component
  const navTabs = [
    { id: VIEWS.PRODUCTS, label: 'Products' },
    {
      id: VIEWS.ALERTS,
      label: 'Low Stock Alerts',
      badge: lowStockProducts.length > 0 ? String(lowStockProducts.length) : undefined,
    },
  ]

  return (
    <div className="h-screen flex flex-col overflow-hidden">

      {/* ── TOP NAVBAR (DS) ── CARD-014: props aligned to DS spec.
          Valid TopNavbar props: brand, breadcrumbs, actions, user, height,
          showSearch, searchPlaceholder, onSearchClick, notificationCount,
          onNotificationClick, onMobileMenuClick, onUserClick, onBreadcrumbClick,
          className. `onSidebarToggle` is NOT a DS prop — use `onMobileMenuClick`. */}
      <TopNavbar
        brand={{ name: "Inventory System" }}
        onMobileMenuClick={() => setSidebarExpanded((v) => !v)}
        actions={
          <DevRoleSwitcher
            role={role}
            context={context}
            onRoleChange={setRole}
            stockFailure={stockFailure}
            onToggleStockFailure={() => setStockFailure((v) => !v)}
            mockApiError={mockApiError}
            onToggleMockApiError={() => setMockApiError((v) => !v)}
          />
        }
      />

      {/* ── BODY: sidebar + content ── */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar expanded={sidebarExpanded} onToggle={setSidebarExpanded} />

        {/* ── CONTENT AREA ── */}
        <main className="flex-1 overflow-auto bg-gray-100 p-6">

          {/* Nav tabs — DS Tabs, stays at top of PIS content */}
          <div className="mb-4">
            <Tabs
              tabs={navTabs}
              activeTab={currentView}
              onChange={(id) => setCurrentView(id)}
              variant="underline"
            />
          </div>

          {currentView === VIEWS.PRODUCTS && (
            <>
              {/* Alert banner */}
              <LowStockAlertBanner
                lowStockProducts={lowStockProducts}
                onViewAlerts={() => setCurrentView(VIEWS.ALERTS)}
              />

              {/* Search + filter */}
              <SearchFilterBar
                searchQuery={searchQuery}
                categoryFilter={categoryFilter}
                stockFilter={stockFilter}
                lowStockOnly={lowStockOnly}
                lowStockCount={lowStockProducts.length}
                allCategories={allCategories}
                filteredCount={filteredProducts.length}
                totalCount={products.length}
                onSearch={setSearchQuery}
                onCategoryFilter={setCategoryFilter}
                onStockFilter={setStockFilter}
                onToggleLowStock={() => setLowStockOnly((v) => !v)}
                onClearFilters={handleClearFilters}
              />

              {/* Product table */}
              <ProductTable
                products={filteredProducts}
                role={role}
                context={context}
                stockFailure={stockFailure}
                onAdd={handleAddClick}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
                onOpenBreakdown={handleOpenBreakdown}
                onOpenThreshold={handleOpenThreshold}
                onOpenAdjust={handleOpenAdjust}
                onTransferComplete={(productId, updatedStocks) =>
                  setProducts((prev) =>
                    prev.map((p) =>
                      p.id === productId
                        ? { ...p, stocks: updatedStocks, updatedAt: new Date().toISOString() }
                        : p
                    )
                  )
                }
              />
            </>
          )}

          {currentView === VIEWS.ALERTS && (
            <LowStockAlertsView lowStockProducts={lowStockProducts} />
          )}

        </main>
      </div>

      {/* ── ALL EXISTING MODALS — kept exactly as-is ── */}
      {formOpen && (
        <ProductForm
          product={selectedProduct}
          existingSKUs={existingSKUs}
          onSave={handleSave}
          onClose={handleFormClose}
          conflictType={conflictType}
          conflictData={conflictData}
          onReloadLatest={handleReloadLatest}
          onSaveAnyway={handleSaveAnyway}
          onConflictClose={handleConflictClose}
        />
      )}

      {deleteOpen && selectedProduct && (
        <DeleteConfirmDialog
          product={selectedProduct}
          stocks={selectedProduct?.stocks}
          onConfirm={handleDeleteConfirm}
          onClose={handleDeleteClose}
          onGoToAdjust={() => {
            handleDeleteClose()
            handleOpenAdjust(selectedProduct, 'decrease')
          }}
        />
      )}

      {/* CARD-006: Stock breakdown modal (component owned by Leo) */}
      {breakdownOpen && selectedStockProduct && (
        <StockBreakdownModal
          product={selectedStockProduct}
          role={role}
          context={context}
          onClose={handleCloseBreakdown}
        />
      )}

      {/* CARD-007: Stock threshold modal (component owned by Leo) */}
      {thresholdOpen && selectedThresholdProduct && (
        <StockThresholdModal
          product={selectedThresholdProduct}
          role={role}
          onSave={handleThresholdSave}
          onClose={handleCloseThreshold}
        />
      )}

      {/* CARD-008: Stock adjustment modal (Aria) — Step 1-3 of the flow */}
      {adjustOpen && adjustProduct && adjustAction && (
        <StockAdjustmentModal
          product={adjustProduct}
          action={adjustAction}
          role={role}
          context={context}
          onConfirm={handleAdjustConfirm}
          onClose={handleAdjustCancel}
          mockApiError={mockApiError}
          initialStep={adjustInitialState ? 3 : undefined}
          initialState={adjustInitialState}
        />
      )}

      {/* CARD-008: Stock adjustment confirmation review modal (Leo) — Step 4 */}
      {confirmOpen && pendingAdjustment && (
        <StockAdjustmentConfirmModal
          product={adjustProduct}
          adjustment={pendingAdjustment}
          stocks={adjustProduct?.stocks}
          onConfirm={handleAdjustFinalConfirm}
          onBack={handleAdjustBack}
          onCancel={handleAdjustCancel}
        />
      )}

    </div>
  )
}

// Dev-only role switcher. Amber border makes it visually distinct from production UI.
function DevRoleSwitcher({
  role,
  context,
  onRoleChange,
  stockFailure,
  onToggleStockFailure,
  mockApiError,
  onToggleMockApiError,
}) {
  const contextLabel = context === CONTEXTS.CCS3 ? 'CCS3' : 'Patona'
  return (
    <div
      className="flex items-center gap-2 px-2 py-1 border-2 border-dashed border-amber-400 bg-amber-50 rounded-md"
      title="Local dev role/context simulator — not production UI"
    >
      <ShieldAlert size={14} className="text-amber-600" />
      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
        Dev: Role Switcher
      </span>
      <select
        value={role}
        onChange={(e) => onRoleChange(e.target.value)}
        className="text-xs px-2 py-1 border border-amber-300 rounded bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
      >
        {Object.entries(ROLE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
      <span className="text-[10px] font-semibold text-amber-800 px-1.5 py-0.5 bg-amber-100 rounded">
        {contextLabel}
      </span>
      <button
        type="button"
        onClick={onToggleStockFailure}
        title="Simulate stock API failure"
        className={`text-[10px] font-medium px-2 py-0.5 rounded border transition-colors ${
          stockFailure
            ? 'bg-red-100 border-red-300 text-red-700'
            : 'bg-white border-amber-300 text-amber-700 hover:bg-amber-100'
        }`}
      >
        Stock API: {stockFailure ? 'FAIL' : 'OK'}
      </button>
      <button
        type="button"
        onClick={onToggleMockApiError}
        title="Simulate adjustment API failure"
        className={`text-[10px] font-medium px-2 py-0.5 rounded border transition-colors ${
          mockApiError
            ? 'bg-red-100 border-red-300 text-red-700'
            : 'bg-white border-amber-300 text-amber-700 hover:bg-amber-100'
        }`}
      >
        Adjust API: {mockApiError ? 'FAIL' : 'OK'}
      </button>
    </div>
  )
}
