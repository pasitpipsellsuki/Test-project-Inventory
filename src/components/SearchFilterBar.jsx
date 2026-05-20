import { AlertTriangle } from 'lucide-react'
import { SearchField, Dropdown, DSButton } from "@uxuissk/design-system"

const STOCK_STATUS_OPTIONS = [
  { value: 'all',          label: 'All Statuses'  },
  { value: 'in-stock',     label: 'In Stock'       },
  { value: 'low-stock',    label: 'Low Stock'      },
  { value: 'out-of-stock', label: 'Out of Stock'   },
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

  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    ...allCategories.map((c) => ({ value: c, label: c })),
  ]

  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px]">
          <SearchField
            value={searchQuery}
            onChange={onSearch}
            placeholder="Search by name or SKU…"
            clearable
          />
        </div>

        <Dropdown
          options={categoryOptions}
          value={categoryFilter}
          onChange={(v) => onCategoryFilter(v ?? 'all')}
          placeholder="All Categories"
        />

        <Dropdown
          options={STOCK_STATUS_OPTIONS}
          value={stockFilter}
          onChange={(v) => onStockFilter(v ?? 'all')}
          placeholder="All Statuses"
        />

        <DSButton
          variant={lowStockOnly ? 'primary' : 'outline'}
          size="md"
          leftIcon={<AlertTriangle size={14} />}
          onClick={onToggleLowStock}
          aria-pressed={lowStockOnly}
        >
          {lowStockOnly ? `Low Stock (${lowStockCount})` : 'Low Stock'}
        </DSButton>

        {isFiltered && (
          <DSButton variant="outline" onClick={onClearFilters}>
            Clear filters
          </DSButton>
        )}
      </div>

      <p className="text-xs text-gray-500">
        {isFiltered
          ? `Showing ${filteredCount} of ${totalCount} product${totalCount !== 1 ? 's' : ''}`
          : `${totalCount} product${totalCount !== 1 ? 's' : ''} in inventory`}
      </p>
    </div>
  )
}
