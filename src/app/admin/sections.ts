export type AdminSection = {
  id: string;
  label: string;
  href: string;
  enabled: boolean;
};

// Section registry — the shell renders all entries; disabled ones are greyed
// out (visual proof the scaffold accepts future phases). Adding a section =
// one entry here. Active in Plan B: catalog (edit only).
export const adminSections: AdminSection[] = [
  { id: 'catalog', label: 'Каталог', href: '/admin/catalog', enabled: true },
  { id: 'inventory', label: 'Остатки', href: '/admin/inventory', enabled: false },
  { id: 'orders', label: 'Заказы', href: '/admin/orders', enabled: false },
  { id: 'site-media', label: 'Медиа сайта', href: '/admin/site-media', enabled: false },
  { id: 'blog', label: 'Блог', href: '/admin/blog', enabled: false },
];
