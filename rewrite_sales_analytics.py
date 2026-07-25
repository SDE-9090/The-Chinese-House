import re

with open("frontend/src/components/dashboard/SalesAnalyticsTabs.tsx", "r") as f:
    text = f.read()

# Fix imports
text = text.replace('Crown, TrendingDown,', 'Crown, TrendingDown, ArrowUpDown, ChevronUp, ChevronDown,')

# Add the MenuPerformanceTable Component
table_component = """
const MenuPerformanceTable = ({ allItems }: { allItems?: { name: string; qty: number; rev: number }[] }) => {
  const [sortConfig, setSortConfig] = useState<{ key: 'name' | 'qty' | 'rev', direction: 'asc' | 'desc' }>({ key: 'qty', direction: 'desc' });

  if (!allItems || allItems.length === 0) return null;

  const sortedItems = [...allItems].sort((a, b) => {
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
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold">
            <tr>
              <th className="px-4 py-3 cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => requestSort('name')}>
                <div className="flex items-center gap-1">Item Name {renderSortIcon('name')}</div>
              </th>
              <th className="px-4 py-3 cursor-pointer hover:bg-muted/80 transition-colors text-right" onClick={() => requestSort('qty')}>
                <div className="flex items-center justify-end gap-1">Quantity Sold {renderSortIcon('qty')}</div>
              </th>
              <th className="px-4 py-3 cursor-pointer hover:bg-muted/80 transition-colors text-right" onClick={() => requestSort('rev')}>
                <div className="flex items-center justify-end gap-1">Revenue {renderSortIcon('rev')}</div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedItems.map((item, idx) => (
              <tr key={idx} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium text-foreground">{item.name}</td>
                <td className="px-4 py-3 text-right">{item.qty}</td>
                <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 font-medium">₹{item.rev.toLocaleString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
};
"""

text = text.replace("const ItemPopularityCharts = ({ topItems, leastItems, periodLabel }", table_component + "\nconst ItemPopularityCharts = ({ topItems, leastItems, periodLabel }")

# Inject it into the SalesAnalyticsTabs component
injection_pattern = r"{/\* Item Popularity Charts \*/}\s*<ItemPopularityCharts\s*topItems=\{data\.topItems\}\s*leastItems=\{data\.leastItems\}\s*periodLabel=\{getPeriodLabel\(\)\}\s*/>"
replacement = """{/* Item Popularity Charts */}
            <ItemPopularityCharts
              topItems={data.topItems}
              leastItems={data.leastItems}
              periodLabel={getPeriodLabel()}
            />
            
            <MenuPerformanceTable allItems={data.allItems} />"""
text = re.sub(injection_pattern, replacement, text)

with open("frontend/src/components/dashboard/SalesAnalyticsTabs.tsx", "w") as f:
    f.write(text)
