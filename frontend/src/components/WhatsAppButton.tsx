import { MessageCircle } from "lucide-react";

const WHATSAPP_NUMBER = "917083738373";
const WHATSAPP_MESSAGE = encodeURIComponent(
  "Hi The Chinese House! 🍜 I'd like to place an order for your delicious Chinese food."
);

const WhatsAppButton = () => {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const encodedMessage = WHATSAPP_MESSAGE; // Avoid double encoding

  const whatsappUrl = isMobile
    ? `whatsapp://send?phone=${WHATSAPP_NUMBER}&text=${encodedMessage}`
    : `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;

  return (
    <a
      href={whatsappUrl}
      className="fixed bottom-20 md:bottom-6 right-4 z-50 flex items-center gap-2 bg-[#25D366] text-[#fff] pl-4 pr-5 py-3 rounded-full font-semibold shadow-xl hover:shadow-2xl hover:scale-105 transition-all group"
      aria-label="Order on WhatsApp"
    >
      <MessageCircle size={22} className="group-hover:animate-bounce" />
      <span className="hidden sm:inline text-sm">WhatsApp Order</span>
    </a>
  );
};

export default WhatsAppButton;

export const getWhatsAppLink = (itemName?: string) => {
  const msg = itemName
    ? encodeURIComponent(`Hi! I'd like to order: ${itemName} from The Chinese House 🍜`)
    : WHATSAPP_MESSAGE;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`;
};
