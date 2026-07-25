import re

with open("backend/src/routes/dashboard.js", "r") as f:
    text = f.read()

# 1. DAILY
daily_least_items_pattern = r"""      const leastItemsResult = await pool\.query\(\s*`\s*SELECT oi\.name, SUM\(oi\.quantity\)::int as qty\s*FROM order_items oi\s*JOIN orders o ON oi\.order_id = o\.id\s*WHERE o\.status != 'cancelled'\s*AND o\.business_id = \$2\s*AND \(o\.created_at AT TIME ZONE 'Asia/Kolkata'\)::date = \$1::date\$\{otFilter\}\s*GROUP BY oi\.name\s*ORDER BY qty ASC\s*LIMIT 5\s*`,\s*\[reportDate, req\.business_id\],\s*\);"""
daily_all_items_str = """
      // ---------------- ALL ITEMS ----------------
      const allItemsResult = await pool.query(
        `
    SELECT oi.name, SUM(oi.quantity)::int as qty, SUM(oi.quantity * oi.price)::numeric as rev
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE o.status != 'cancelled'
      AND o.business_id = $2
      AND (o.created_at AT TIME ZONE 'Asia/Kolkata')::date = $1::date${otFilter}
    GROUP BY oi.name
    ORDER BY qty DESC
    `,
        [reportDate, req.business_id],
      );
"""
text = re.sub(daily_least_items_pattern, lambda m: m.group(0) + daily_all_items_str, text, count=1)
text = text.replace("leastItems: leastItemsResult.rows,", "leastItems: leastItemsResult.rows,\n        allItems: allItemsResult.rows,")

# 2. WEEKLY
weekly_least_items_pattern = r"""      const leastItemsResult = await pool\.query\(\s*`\s*SELECT oi\.name, SUM\(oi\.quantity\)::int as qty\s*FROM order_items oi\s*JOIN orders o ON oi\.order_id = o\.id\s*WHERE o\.status != 'cancelled'\s*AND o\.business_id = \$3\s*AND \(o\.created_at AT TIME ZONE 'Asia/Kolkata'\)::date >= \$1::date\s*AND \(o\.created_at AT TIME ZONE 'Asia/Kolkata'\)::date < \$2::date\$\{otFilter\}\s*GROUP BY oi\.name\s*ORDER BY qty ASC\s*LIMIT 5\s*`,\s*\[start, end, req\.business_id\],\s*\);"""
weekly_all_items_str = """
      // ---------------- ALL ITEMS ----------------
      const allItemsResult = await pool.query(
        `
    SELECT oi.name, SUM(oi.quantity)::int as qty, SUM(oi.quantity * oi.price)::numeric as rev
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE o.status != 'cancelled'
      AND o.business_id = $3
      AND (o.created_at AT TIME ZONE 'Asia/Kolkata')::date >= $1::date
      AND (o.created_at AT TIME ZONE 'Asia/Kolkata')::date < $2::date${otFilter}
    GROUP BY oi.name
    ORDER BY qty DESC
    `,
        [start, end, req.business_id],
      );
"""
text = re.sub(weekly_least_items_pattern, lambda m: m.group(0) + weekly_all_items_str, text, count=1)


# 3. MONTHLY
monthly_least_items_pattern = r"""      const leastItemsResult = await pool\.query\(\s*`\s*SELECT oi\.name, SUM\(oi\.quantity\)::int as qty\s*FROM order_items oi JOIN orders o ON oi\.order_id = o\.id\s*WHERE o\.status != 'cancelled'\s*AND o\.business_id = \$3\s*AND EXTRACT\(YEAR FROM o\.created_at AT TIME ZONE 'Asia/Kolkata'\) = \$1\s*AND EXTRACT\(MONTH FROM o\.created_at AT TIME ZONE 'Asia/Kolkata'\) = \$2\$\{otFilter\}\s*GROUP BY oi\.name ORDER BY qty ASC LIMIT 5\s*`,\s*\[selectedYear, selectedMonth, req\.business_id\],\s*\);"""
monthly_all_items_str = """
      const allItemsResult = await pool.query(
        `
        SELECT oi.name, SUM(oi.quantity)::int as qty, SUM(oi.quantity * oi.price)::numeric as rev
        FROM order_items oi JOIN orders o ON oi.order_id = o.id
        WHERE o.status != 'cancelled'
          AND o.business_id = $3
          AND EXTRACT(YEAR FROM o.created_at AT TIME ZONE 'Asia/Kolkata') = $1
          AND EXTRACT(MONTH FROM o.created_at AT TIME ZONE 'Asia/Kolkata') = $2${otFilter}
        GROUP BY oi.name ORDER BY qty DESC
      `,
        [selectedYear, selectedMonth, req.business_id],
      );
"""
text = re.sub(monthly_least_items_pattern, lambda m: m.group(0) + monthly_all_items_str, text, count=1)


# 4. YEARLY
yearly_least_items_pattern = r"""      const leastItemsResult = await pool\.query\(\s*`\s*SELECT oi\.name, SUM\(oi\.quantity\)::int as qty\s*FROM order_items oi JOIN orders o ON oi\.order_id = o\.id\s*WHERE o\.status != 'cancelled'\s*AND o\.business_id = \$2\s*AND EXTRACT\(YEAR FROM o\.created_at AT TIME ZONE 'Asia/Kolkata'\) = \$1\$\{otFilter\}\s*GROUP BY oi\.name ORDER BY qty ASC LIMIT 5\s*`,\s*\[selectedYear, req\.business_id\],\s*\);"""
yearly_all_items_str = """
      const allItemsResult = await pool.query(
        `
        SELECT oi.name, SUM(oi.quantity)::int as qty, SUM(oi.quantity * oi.price)::numeric as rev
        FROM order_items oi JOIN orders o ON oi.order_id = o.id
        WHERE o.status != 'cancelled'
          AND o.business_id = $2
          AND EXTRACT(YEAR FROM o.created_at AT TIME ZONE 'Asia/Kolkata') = $1${otFilter}
        GROUP BY oi.name ORDER BY qty DESC
      `,
        [selectedYear, req.business_id],
      );
"""
text = re.sub(yearly_least_items_pattern, lambda m: m.group(0) + yearly_all_items_str, text, count=1)


with open("backend/src/routes/dashboard.js", "w") as f:
    f.write(text)
