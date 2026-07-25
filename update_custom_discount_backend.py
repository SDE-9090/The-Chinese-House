import re

with open("backend/src/routes/tables.js", "r") as f:
    text = f.read()

# 1. Add customDiscountAmount to extracted body params
text = text.replace(
    'const { paymentMethod = "counter", splitCash = 0, splitUpi = 0, customerPhone, pointsRedeemed, couponCode } = req.body;',
    'const { paymentMethod = "counter", splitCash = 0, splitUpi = 0, customerPhone, pointsRedeemed, couponCode, customDiscountAmount = 0 } = req.body;'
)

# 2. Add custom discount application logic right after loyalty points logic
custom_discount_logic = """

    // Custom Ad-hoc Discount
    let customDiscount = parseFloat(customDiscountAmount) || 0;
    if (customDiscount > sessionTotal) customDiscount = sessionTotal;

    if (customDiscount > 0) {
      await client.query(
        "UPDATE table_sessions SET discount_amount = COALESCE(discount_amount, 0) + $1 WHERE id = $2",
        [customDiscount, sessionId]
      );
      
      await client.query(`
        UPDATE orders 
        SET total = GREATEST(0, total - $1),
            discount = COALESCE(discount, 0) + $1
        WHERE id = (
          SELECT id FROM orders 
          WHERE table_session_id = $2 AND status != 'cancelled' 
          ORDER BY created_at DESC LIMIT 1
        )
      `, [customDiscount, sessionId]);
      
      sessionTotal = Math.max(0, sessionTotal - customDiscount);
    }
"""

text = text.replace(
    '      } // End if settings && settings.loyalty_enabled\n    } // End if finalPhone',
    '      }\n    }' # Normalize
)
# We can inject it right before `// Mark outstanding orders as settled by the provided payment method`
injection_point = "// Mark outstanding orders as settled by the provided payment method"
if injection_point in text:
    text = text.replace(injection_point, custom_discount_logic + "\n    " + injection_point)

with open("backend/src/routes/tables.js", "w") as f:
    f.write(text)
