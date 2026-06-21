const { Groq } = require("groq-sdk");
const pool = require("../db/pool");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "YOUR_GROQ_API_KEY",
});

async function chatWithGroq(messageHistory, businessId) {
  try {
    // 1. Fetch Business Settings
    const settingsRes = await pool.query(
      `SELECT restaurant_name, address, phone FROM business_settings WHERE business_id = $1 LIMIT 1`,
      [businessId]
    );
    const settings = settingsRes.rows[0] || {
      restaurant_name: "The Chinese House",
      address: "Vishal Nagar, Pune",
      phone: "91 97666 66666"
    };

    const locationRes = await pool.query(
      `SELECT open_time,close_time,address,phone FROM location_content WHERE business_id = $1 LIMIT 1`,
      [businessId]
    );
    const location = locationRes.rows[0] || {
      open_time: "10:00",
      close_time: "23:00",
      address: "Vishal Nagar, Pune",
      phone: "91 97666 66666"
    };

    // 2. Fetch Active Menu Items
    const menuRes = await pool.query(
      `SELECT m.name, m.price, m.variants, m.description, m.diet_type, m.available, c.name as category_name
       FROM menu_items m
       JOIN menu_categories c ON m.category_id = c.id
       WHERE m.business_id = $1`,
      [businessId]
    );
    const menuItems = menuRes.rows;

    // 3. Construct the System Prompt
    let systemPrompt = `You are the friendly, professional, and concise customer support AI for a restaurant named "${settings.restaurant_name}".
Your goal is to assist customers with questions about the menu, hours, and location.

RESTAURANT INFO:
- Address: ${settings.address || location.address}
- Phone: ${settings.phone || location.phone}
- Hours: ${location.open_time} to ${location.close_time}

CURRENT MENU:
`;

    menuItems.forEach(item => {
      let variantStr = "";
      let parsedVariants = item.variants;
      if (typeof parsedVariants === "string") {
        try { parsedVariants = JSON.parse(parsedVariants); } catch (e) { parsedVariants = []; }
      }
      if (Array.isArray(parsedVariants) && parsedVariants.length > 0) {
        variantStr = " Variants: " + parsedVariants.map(v => `${v.name} (₹${v.price})`).join(", ");
      }
      const availabilityTag = item.available ? "" : "[OUT OF STOCK]";
      systemPrompt += `- ${item.name} (${item.category_name}) ${availabilityTag}: Base Price ₹${item.price}.${variantStr} ${item.diet_type !== 'none' ? `[${item.diet_type}]` : ''} ${item.description}\n`;
    });

    systemPrompt += `
RULES:
1. ONLY recommend items that are on the CURRENT MENU provided above. If a customer asks for something not on the menu (like pizza or burgers), politely explain that you are a Chinese restaurant and suggest a popular alternative from the menu.
2. Be concise and conversational.
3. If asked about allergies, rely ONLY on the item descriptions. If unsure, advise the customer to ask the staff directly upon ordering.
4. You cannot take actual orders or reservations. If asked to place an order, guide them to use the online ordering system or call the restaurant.
5. Format your response beautifully using Markdown. You MUST bold (**text**) the names of dishes, prices, and important statuses like "Out of Stock".
6. If the user asks how to order, or expresses a desire to order food, you MUST include the exact text "[ORDER_BTN]" somewhere in your response.
7. UPSELLING: Whenever a customer asks about a specific dish, you MUST act like an experienced waiter and suggest 1 or 2 complementary items STRICTLY FROM THE PROVIDED "CURRENT MENU" ONLY. DO NOT invent or suggest ANY items, drinks, or teas that are not explicitly listed in the menu above. If the menu has no drinks, DO NOT suggest a drink. IMPORTANT: If the customer specifies a dietary restriction (e.g., "only non-veg", "only veg"), your upselling suggestions MUST also strictly adhere to that restriction. Keep the suggestion natural and polite.
8. ORDER HISTORY: If the user asks about their past orders or order history, politely ask them to provide their 10-digit phone number. If they provide a 10-digit phone number in the context of checking orders, your ENTIRE response MUST be exactly the text "[FETCH_ORDERS: <their_10_digit_number>]" and absolutely nothing else. Do not add any conversational text.
9. OUT OF STOCK ITEMS: If a customer asks for a specific dish that is marked as [OUT OF STOCK], politely inform them that the dish is currently out of stock or sold out for the day, and immediately suggest a similar alternative from the menu. DO NOT ever recommend an item that is [OUT OF STOCK]. Never say the word "Available" or "In Stock" in your response; just suggest the dish naturally.`;

    // 4. Prepare messages array
    const messages = [
      { role: "system", content: systemPrompt },
      ...messageHistory
    ];

    // 5. Call Groq
    const completion = await groq.chat.completions.create({
      messages: messages,
      model: "llama-3.1-8b-instant", // Updated to current supported fast model
      temperature: 0.1,
      max_tokens: 256,
    });

    return completion.choices[0]?.message?.content || "I'm sorry, I couldn't process that request right now.";
  } catch (error) {
    console.error("Groq AI Error:", error);
    throw error;
  }
}

module.exports = {
  chatWithGroq
};
