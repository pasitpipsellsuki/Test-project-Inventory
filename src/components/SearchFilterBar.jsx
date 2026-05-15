import { Search, X, AlertTriangle } from 'lucide-react'
import { DSButton, DSInput, Dropdown } from "@uxuissk/design-system"

const STOCK_STATUS_OPTIONS = [
  { value: 'all',           label: 'All Statuses'   },
  { value: 'in-stock',      label: 'In Stock'        },
  { value: 'low-stock',     label: 'Low Stock'       },
  { value: 'out-of-stock',  label: 'Out of Stock'    },
]

export default function SearchFilterBar({
  searchQuery,
  categoryFilter,
  stockFilter,
  lowStockOnly = false,
  lowStockCount = 0,
  allCategories,
  filteredCount,
  totalCount,
  onSearch,
  onCategoryFilter,
  onStockFilter,
  onToggleLowStock,
  onClearFilters,
}) {
  const isFiltered =
    searchQuery || categoryFilter !== 'all' || stockFilter !== 'all' || lowStockOnly

  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <DSInput
            leftIcon={<Search size={15} />}
            placeholder="Search by name or SKU…"
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            clearable
            fullWidth
          />
        </div>

        {/* Category filter */}
        <Dropdown
          options={[
            { value: 'all', label: 'All Categories' },
            ...allCategories.map((c) => ({ value: c, label: c })),
          ]}
          value={categoryFilter}
          onChange={onCategoryFilter}
          placeholder="All Categories"
        />

        {/* Stock status filter */}
        <Dropdown
          options={STOCK_STATUS_OPTIONS}
          value={stockFilter}
          onChange={onStockFilter}
        />

        {/* CARD-007: Low Stock toggle (separate from stock-status dropdown) */}
        <DSButton
          variant={lowStockOnly ? 'primary' : 'outline'}
          size="md"
          leftIcon={<AlertTriangle size={14} />}
          onClick={onToggleLowStock}
          aria-pressed={lowStockOnly}
        >
          {lowStockOnly ? `Low Stock (${lowStockCount})` : 'Low Stock'}
        </DSButton>

        {/* Clear filters */}
        {isFiltered && (
          <DSButton
            variant="outline"
            leftIcon={<X size={14} />}
            onClick={onClearFilters}
          >
            Clear filters
          </DSButton>
        )}
      </div>

      {/* Result count */}
      <p className="text-xs text-gray-500">
        {isFiltered
          ? `Showing ${filteredCount} of ${totalCount} product${totalCount !== 1 ? 's' : ''}`
          : `${totalCount} product${totalCount !== 1 ? 's' : ''} in inventory`}
      </p>
    </div>
  )
}
