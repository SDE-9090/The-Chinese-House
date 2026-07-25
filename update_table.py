import re

with open("frontend/src/components/dashboard/SalesAnalyticsTabs.tsx", "r") as f:
    text = f.read()

# Add Search icon to imports if not there
if "Search," not in text:
    text = text.replace('ArrowUpDown, ChevronUp, ChevronDown,', 'ArrowUpDown, ChevronUp, ChevronDown, Search,')

new_table_component = """
const MenuPerformanceTable = ({ allItems }: { allItems?: { name: string; qty: number; rev: number }[] }) => {
  const [sortConfig, setSortConfig] = useState<{ key: 'name' | 'qty' | 'rev', direction: 'asc' | 'desc' }>({ key: 'qty', direction: 'desc' });
  const [searchQuery, setSearchQuery] = useState("");

  if (!allItems || allItems.length === 0) return null;

  const filteredItems = allItems.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedItems = [...filteredItems].sort((a, b) => {
    if (sortConfig.key === 'name') {
      return sortConfig.direction === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    }
    return sortConfig.direction === 'asc' ? a[sortConfig.key] - b[sortConfig.key] : b[sortConfig.key] - a[sortConfig.key];
  });

  const requestSort = (key: 'name' | 'qty' | 'rev') => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const renderSortIcon = (key: 'name' | 'qty' | 'rev') => {
    if (sortConfig.key !== key) return <ArrowUpDown size={14} className="opacity-30" />;
    return sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  return (
    <ChartCard title="Comprehensive Menu Performance">
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <input
          type="text"
          placeholder="Search menu items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full md:w-1/3 bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
        />
      </div>
      <div className="overflow-y-auto overflow-x-auto rounded-xl border border-border max-h-[400px]">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted text-muted-foreground text-xs uppercase font-semibold sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-4 py-3 cursor-pointer hover:bg-muted/80 transition-colors bg-muted" onClick={() => requestSort('name')}>
                <div className="flex items-center gap-1">Item Name {renderSortIcon('name')}</div>
              </th>
              <th className="px-4 py-3 cursor-pointer hover:bg-muted/80 transition-colors text-right bg-muted" onClick={() => requestSort('qty')}>
                <div className="flex items-center justify-end gap-1">Quantity Sold {renderSortIcon('qty')}</div>
              </th>
              <th className="px-4 py-3 cursor-pointer hover:bg-muted/80 transition-colors text-right bg-muted" onClick={() => requestSort('rev')}>
                <div className="flex items-center justify-end gap-1">Revenue {renderSortIcon('rev')}</div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedItems.length > 0 ? (
              sortedItems.map((item, idx) => (
                <tr key={idx} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{item.name}</td>
                  <td className="px-4 py-3 text-right">{item.qty}</td>
                  <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 font-medium">₹{item.rev.toLocaleString("en-IN")}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                  No items match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
};
"""

# Extract everything before and after the old MenuPerformanceTable
start_idx = text.find("const MenuPerformanceTable =")
end_idx = text.find("const ItemPopularityCharts =")

if start_idx != -1 and end_idx != -1:
    text = text[:start_idx] + new_table_component + text[end_idx:]
    with open("frontend/src/components/dashboard/SalesAnalyticsTabs.tsx", "w") as f:
        f.write(text)
    print("Replaced successfully")
else:
    print("Could not find boundaries")
