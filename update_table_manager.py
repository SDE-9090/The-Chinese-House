import re

with open("frontend/src/components/dashboard/TableManager.tsx", "r") as f:
    text = f.read()

# 1. Add customDiscount state
state_injection = """  const [customDiscount, setCustomDiscount] = useState("");
  const [showSettledBills, setShowSettledBills] = useState(false);"""

text = text.replace('  const [showSettledBills, setShowSettledBills] = useState(false);', state_injection)

# 2. Add custom discount UI in payment modal (right before the splitMode UI, after coupons)
ui_injection = """
              {/* Custom Discount Input */}
              <div className="bg-muted border border-border p-3 rounded-xl mb-6">
                <label className="text-xs font-bold text-muted-foreground mb-1 block">Custom Discount (₹) [Optional]</label>
                <input
                  type="number"
                  placeholder="Enter flat discount amount..."
                  value={customDiscount}
                  onChange={(e) => setCustomDiscount(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50"
                  disabled={!!closingId}
                />
              </div>

"""
# We'll inject it right before `            {!splitMode ? (`
text = text.replace('            {!splitMode ? (', ui_injection + '            {!splitMode ? (')

# 3. Modify the handleCloseSession logic to accept custom discount
# Find `const handleCloseSession = async (sessionId: string, method: string, printBill: boolean = true) => {`
func_start = "  const handleCloseSession = async (sessionId: string, method: string, printBill: boolean = true) => {\n    setClosingId(sessionId);\n    try {\n      await apiSessionClose(sessionId, method, parseFloat(splitCash) || 0, parseFloat(splitUpi) || 0, loyaltyPhone || undefined, pointsRedeemed, appliedCoupon?.code);"
func_replacement = "  const handleCloseSession = async (sessionId: string, method: string, printBill: boolean = true) => {\n    setClosingId(sessionId);\n    try {\n      await apiSessionClose(sessionId, method, parseFloat(splitCash) || 0, parseFloat(splitUpi) || 0, loyaltyPhone || undefined, pointsRedeemed, appliedCoupon?.code, parseFloat(customDiscount) || 0);"
text = text.replace(func_start, func_replacement)

# 4. Modify the `splitUpi` and `splitCash` onChange handlers to calculate from the new total (which subtracts customDiscount)
def replace_total_logic(match):
    return "const customDiscountValue = parseFloat(customDiscount) || 0;\n                        const total = Math.max(0, baseTotal - loyaltyDiscountValue - customDiscountValue);"
    
text = re.sub(r'const total = Math\.max\(0, baseTotal - loyaltyDiscountValue\);', replace_total_logic, text)

# 5. Reset customDiscount when handleClearTableClick is clicked
clear_start = """  const handleClearTableClick = (sessionId: string, customerPhone?: string | null) => {
    const bill = billsMap[sessionId];
    if (bill && bill.totalAmount === 0) {
      handleCloseSession(sessionId, 'none', false);
    } else {
      setShowPaymentModal(sessionId);"""

clear_replacement = """  const handleClearTableClick = (sessionId: string, customerPhone?: string | null) => {
    const bill = billsMap[sessionId];
    if (bill && bill.totalAmount === 0) {
      handleCloseSession(sessionId, 'none', false);
    } else {
      setShowPaymentModal(sessionId);
      setCustomDiscount("");"""
text = text.replace(clear_start, clear_replacement)


with open("frontend/src/components/dashboard/TableManager.tsx", "w") as f:
    f.write(text)
