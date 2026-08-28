const sendWhatsAppTemplate = async (phone, templateName, parameters) => {
  const whatsappPayload = {
    messaging_product: "whatsapp",
    to: phone,
    type: "template",
    template: {
      name: templateName,
      language: { code: "en_US" },
      components: [
        {
          type: "body",
          parameters: parameters.map(p => ({ type: "text", text: String(p) }))
        }
      ]
    }
  };

  if (process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN) {
    const waResponse = await fetch(`https://graph.facebook.com/v17.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(whatsappPayload)
    });

    if (!waResponse.ok) {
      const waErr = await waResponse.text();
      console.error(`[WhatsApp API Error] for ${phone}:`, waErr);
      throw new Error(`WhatsApp API failed: ${waErr}`);
    }
    console.log(`[WhatsApp API] Template '${templateName}' sent to ${phone}`);
    return true;
  } else {
    // Dry-Run Mode
    console.log(`[WhatsApp API DRY-RUN] Would send '${templateName}' to ${phone}`);
    console.log(`[WhatsApp API DRY-RUN] Payload:`, JSON.stringify(whatsappPayload, null, 2));
    return true;
  }
};

module.exports = {
  sendWhatsAppTemplate
};
