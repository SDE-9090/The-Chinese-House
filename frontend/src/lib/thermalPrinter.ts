import { Capacitor } from "@capacitor/core";
import { BluetoothPrinter } from "@candraadiw/capacitor-bluetooth-printer";
import type { Order, OrderItem } from "./orderStore";

// ESC/POS Commands
const ESC = "\x1B";
const GS = "\x1D";

const INIT = ESC + "@";
const ALIGN_LEFT = ESC + "a0";
const ALIGN_CENTER = ESC + "a1";
const ALIGN_RIGHT = ESC + "a2";
const BOLD_ON = ESC + "E1";
const BOLD_OFF = ESC + "E0";
const TEXT_NORMAL = ESC + "!0";
const TEXT_DOUBLE_HEIGHT = ESC + "!16";
const TEXT_DOUBLE_WIDTH = ESC + "!32";
const TEXT_DOUBLE_BOTH = ESC + "!48";
const CUT_PAPER = GS + "V1";

export async function printReceiptNative(
  order: Order,
  business: { restaurantName: string; address?: string; phone?: string; gstin?: string | null },
  printerWidth: string = "58mm",
  isKOT: boolean = false
): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    console.warn("Native printing is not available in browser.");
    return false;
  }

  // 32 chars for 58mm, 48 chars for 80mm
  const lineLength = printerWidth === "80mm" ? 48 : 32;

  let receipt = INIT;

  // Helper to pad strings for alignment
  const padRight = (str: string, len: number) => str.padEnd(len, " ").substring(0, len);
  const padLeft = (str: string, len: number) => str.padStart(len, " ").substring(0, len);
  const padBetween = (left: string, right: string, len: number) => {
    const spaces = len - left.length - right.length;
    return left + (spaces > 0 ? " ".repeat(spaces) : " ") + right;
  };
  const separator = "-".repeat(lineLength) + "\n";
  const thickSeparator = "=".repeat(lineLength) + "\n";

  if (isKOT) {
    receipt += ALIGN_CENTER + BOLD_ON + TEXT_DOUBLE_BOTH + "K.O.T\n\n" + TEXT_NORMAL + BOLD_OFF;
    receipt += ALIGN_LEFT;
    receipt += `Order #: ${order.id}\n`;
    receipt += `Time: ${new Date(order.createdAt).toLocaleTimeString()}\n`;
    receipt += `Type: ${order.orderType?.toUpperCase() || "DINE-IN"}\n`;
    if (order.tableSessionId) {
      receipt += `Table: ${order.tableSessionId.split("-")[0]}\n`;
    }
    receipt += thickSeparator;
    
    receipt += BOLD_ON;
    receipt += padBetween("ITEM", "QTY", lineLength) + "\n";
    receipt += BOLD_OFF;
    receipt += separator;

    order.items.forEach(item => {
      let itemName = item.name.substring(0, lineLength - 6);
      receipt += padBetween(itemName, item.quantity.toString(), lineLength) + "\n";
    });

    receipt += thickSeparator;
    if (order.specialInstructions) {
      receipt += `Notes: ${order.specialInstructions}\n`;
    }
  } else {
    // BILL
    receipt += ALIGN_CENTER + BOLD_ON + TEXT_DOUBLE_HEIGHT + business.restaurantName + "\n\n" + TEXT_NORMAL + BOLD_OFF;
    if (business.address) {
      receipt += business.address + "\n";
    }
    if (business.phone) {
      receipt += "Ph: " + business.phone + "\n";
    }
    if (business.gstin) {
      receipt += "GSTIN: " + business.gstin + "\n";
    }
    receipt += "\nTAX INVOICE\n";
    receipt += ALIGN_LEFT;
    receipt += separator;
    receipt += `Order #: ${order.id}\n`;
    receipt += `Date: ${new Date(order.createdAt).toLocaleString()}\n`;
    receipt += `Customer: ${order.customerName || "Walk-in"}\n`;
    if (order.customerPhone) receipt += `Phone: ${order.customerPhone}\n`;
    receipt += separator;

    receipt += BOLD_ON;
    receipt += padBetween("ITEM x QTY", "AMOUNT", lineLength) + "\n";
    receipt += BOLD_OFF;
    receipt += separator;

    let subtotal = 0;
    order.items.forEach(item => {
      let lineTotal = item.price * item.quantity;
      subtotal += lineTotal;
      let itemName = item.name.substring(0, lineLength - 10);
      let left = `${itemName} x${item.quantity}`;
      receipt += padBetween(left, lineTotal.toFixed(2), lineLength) + "\n";
    });

    receipt += separator;
    receipt += ALIGN_RIGHT;
    receipt += padBetween("Subtotal:", subtotal.toFixed(2), lineLength) + "\n";
    
    let taxes = (order.cgst || 0) + (order.sgst || 0) + (order.gst || 0);
    if (taxes > 0) {
      receipt += padBetween("Taxes:", taxes.toFixed(2), lineLength) + "\n";
    }
    if (order.discount && order.discount > 0) {
      receipt += padBetween("Discount:", "-" + order.discount.toFixed(2), lineLength) + "\n";
    }

    receipt += thickSeparator;
    receipt += BOLD_ON;
    receipt += padBetween("TOTAL:", (order.total || subtotal).toFixed(2), lineLength) + "\n";
    receipt += BOLD_OFF;
    receipt += thickSeparator;
    
    receipt += ALIGN_CENTER;
    receipt += "Thank you for dining with us!\n";
    receipt += "Please visit again\n";
  }

  // Feed paper & Cut
  receipt += "\n\n\n\n\n";
  receipt += CUT_PAPER;

  try {
    // Before printing, we need to ensure we are connected to a printer.
    // The UI should have handled this, but we'll try to just print.
    // The plugin might automatically use the last connected printer,
    // or we might need to connect first. We will assume the UI connects it.
    await BluetoothPrinter.print({ data: receipt });
    return true;
  } catch (err) {
    console.error("Bluetooth print failed:", err);
    return false;
  }
}
