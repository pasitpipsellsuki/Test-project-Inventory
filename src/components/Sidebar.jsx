import React from 'react'
import { Sidebar as DSSidebar } from '@uxuissk/design-system'
import { Building2, MapPin, Package, Users } from 'lucide-react'

// CARD-014: nav groups for the SSK DS Sidebar.
// SidebarItem shape per DS spec: { id, label, icon?, badge? }.
const navGroups = [
  {
    label: 'Company & Store',
    items: [
      { id: 'company',  label: 'Company',  icon: <Building2 size={18} /> },
      { id: 'location', label: 'Location', icon: <MapPin size={18} /> },
    ],
  },
  {
    label: 'Product',
    items: [
      { id: 'inventory', label: 'Inventory', icon: <Package size={18} /> },
    ],
  },
  {
    label: 'Account Control',
    items: [
      { id: 'users', label: 'Users', icon: <Users size={18} /> },
    ],
  },
]

// CARD-014: DSSidebar valid props (per @uxuissk/design-system v0.8.16 types):
// brand, groups, activeItem, onNavigate, collapsed, onCollapsedChange, width, className.
// `showCollapseToggle` is NOT a DS prop and was removed.
export default function Sidebar({ expanded, onToggle }) {
  return (
    <DSSidebar
      brand={{ name: 'Inventory System' }}
      groups={navGroups}
      activeItem="inventory"
      onNavigate={() => {}}
      collapsed={!expanded}
      onCollapsedChange={(collapsed) => {
        if (typeof onToggle === 'function') onToggle(!collapsed)
      }}
    />
  )
}
