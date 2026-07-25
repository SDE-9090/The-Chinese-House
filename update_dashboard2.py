import re

with open("backend/src/routes/dashboard.js", "r") as f:
    text = f.read()

# WEEKLY
text = re.sub(r"topItems: topItemsResult\.rows,\s*leastItems: leastItemsResult\.rows,", "topItems: topItemsResult.rows,\n        leastItems: leastItemsResult.rows,\n        allItems: allItemsResult.rows,", text)

with open("backend/src/routes/dashboard.js", "w") as f:
    f.write(text)
