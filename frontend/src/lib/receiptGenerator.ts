// Generates a receipt as a downloadable image using Canvas API
// Optimized for thermal printer width (80mm ≈ 420px)

import { roundCurrency } from "./billing";

export interface ReceiptData {
  token: number;
  customerName: string;
  customerPhone: string;
  items: { name: string; price: number; quantity: number }[];
  subtotal?: number;
  discount?: number;
  couponCode?: string | null;
  cgst?: number;
  sgst?: number;
  cgstRate?: number;
  sgstRate?: number;
  gst?: number;
  total: number;
  paymentMethod: "counter" | "online";
  paymentStatus?: string;
  paidAmount?: number;
  createdAt: string;
  business?: {
    restaurantName?: string;
    gstin?: string | null;
    address?: string;
  };
  orderType?: string;
  specialInstructions?: string;
}

const W = 420;
const PAD = 24;
const LINE_H = 22;
const FONT = "'Segoe UI', system-ui, sans-serif";

function fmt(v: number): string {
  return `₹${roundCurrency(v).toFixed(2)}`;
}

function drawDashedLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y: number,
  x2: number,
) {
  ctx.beginPath();
  ctx.setLineDash([4, 3]);
  ctx.strokeStyle = "#d1d5db";
  ctx.lineWidth = 1;
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.setLineDash([]);
}

/** Wrap text that exceeds maxWidth, returns lines */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [text];
}

/** Build receipt canvas and return the canvas element */
export function buildReceiptCanvas(data: ReceiptData): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  const businessLines = [
    data.business?.restaurantName || "The Chinese House",
    data.business?.gstin ? `GSTIN: ${data.business.gstin}` : null,
    data.business?.address || null,
  ].filter(Boolean) as string[];

  const hasDiscount = (data.discount ?? 0) > 0;
  const cgst = data.cgst ?? 0;
  const sgst = data.sgst ?? 0;
  const hasGst = cgst + sgst > 0;
  const hasDue = (data.paidAmount ?? data.total) < data.total;

  // Pre-calculate height - items may wrap
  canvas.width = W;
  canvas.height = 800; // temporary for measurement
  ctx.font = `13px ${FONT}`;
  const maxItemTextW = W - PAD * 2 - 80; // leave room for amount

  let itemTotalLines = 0;
  const wrappedItems: { lines: string[]; amount: string }[] = [];
  for (const item of data.items) {
    const label = `${item.name} × ${item.quantity}`;
    const lines = wrapText(ctx, label, maxItemTextW);
    wrappedItems.push({ lines, amount: fmt(item.price * item.quantity) });
    itemTotalLines += lines.length;
  }

  const hasOrderType = !!data.orderType;
  const instrLines2 = data.specialInstructions ? wrapText(ctx, `Note: ${data.specialInstructions}`, W - PAD * 2) : [];

  let H =
    360 +
    itemTotalLines * LINE_H +
    businessLines.length * 16 +
    (hasDiscount ? LINE_H : 0) +
    (hasGst ? LINE_H * 2 : 0) +
    (hasDue ? LINE_H : 0) +
    (hasOrderType ? 18 : 0) +
    instrLines2.length * 16;
  H = Math.max(H, 430);

  canvas.width = W;
  canvas.height = H;

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 2;
  ctx.strokeRect(4, 4, W - 8, H - 8);

  let y = PAD;

  // ─── Business header ───
  ctx.fillStyle = "#111827";
  ctx.font = `bold 20px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText(businessLines[0], W / 2, y + 4);
  y += 24;

  ctx.font = `12px ${FONT}`;
  ctx.fillStyle = "#6b7280";
  for (const line of businessLines.slice(1)) {
    ctx.fillText(line, W / 2, y);
    y += 16;
  }

  ctx.fillText("Tax Invoice / Receipt", W / 2, y + 4);
  y += 24;

  drawDashedLine(ctx, PAD, y, W - PAD);
  y += 16;

  // ─── Token + date ───
  ctx.textAlign = "left";
  ctx.font = `bold 18px ${FONT}`;
  ctx.fillStyle = "#111827";
  ctx.fillText(`Token #${data.token}`, PAD, y);
  ctx.textAlign = "right";
  ctx.font = `11px ${FONT}`;
  ctx.fillStyle = "#6b7280";
  ctx.fillText(
    new Date(data.createdAt).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }),
    W - PAD,
    y,
  );
  y += 24;

  // ─── Customer ───
  ctx.textAlign = "left";
  ctx.font = `13px ${FONT}`;
  ctx.fillStyle = "#374151";
  ctx.fillText(`${data.customerName}  •  ${data.customerPhone}`, PAD, y);
  y += 20;

  // ─── Order Type ───
  if (data.orderType) {
    ctx.font = `bold 12px ${FONT}`;
    ctx.fillStyle = "#374151";
    const typeLabel = data.orderType === "dine-in" ? "Dine-in" : data.orderType === "takeaway" ? "Takeaway" : "Delivery";
    ctx.fillText(`Order Type: ${typeLabel}`, PAD, y);
    y += 18;
  }

  // ─── Special Instructions ───
  if (data.specialInstructions) {
    ctx.font = `italic 11px ${FONT}`;
    ctx.fillStyle = "#6b7280";
    const instrLines = wrapText(ctx, `Note: ${data.specialInstructions}`, W - PAD * 2);
    for (const line of instrLines) {
      ctx.fillText(line, PAD, y);
      y += 16;
    }
  }

  drawDashedLine(ctx, PAD, y, W - PAD);
  y += 16;

  // ─── Column headers ───
  ctx.font = `bold 12px ${FONT}`;
  ctx.fillStyle = "#6b7280";
  ctx.textAlign = "left";
  ctx.fillText("ITEM", PAD, y);
  ctx.textAlign = "right";
  ctx.fillText("AMOUNT", W - PAD, y);
  y += LINE_H;

  // ─── Items with wrapping ───
  ctx.font = `13px ${FONT}`;
  ctx.fillStyle = "#111827";
  for (const { lines, amount } of wrappedItems) {
    for (let i = 0; i < lines.length; i++) {
      ctx.textAlign = "left";
      ctx.fillText(lines[i], PAD, y);
      if (i === 0) {
        ctx.textAlign = "right";
        ctx.fillText(amount, W - PAD, y);
      }
      y += LINE_H;
    }
  }

  y += 4;
  drawDashedLine(ctx, PAD, y, W - PAD);
  y += 16;

  // ─── Totals section ───
  const drawRow = (
    label: string,
    value: string,
    color = "#111827",
    bold = false,
  ) => {
    ctx.textAlign = "left";
    ctx.font = bold ? `bold 14px ${FONT}` : `13px ${FONT}`;
    ctx.fillStyle = color;
    ctx.fillText(label, PAD, y);
    ctx.textAlign = "right";
    ctx.fillText(value, W - PAD, y);
    y += LINE_H;
  };

  drawRow("Subtotal", fmt(data.subtotal ?? data.total));

  if (hasDiscount) {
    drawRow(
      `Discount${data.couponCode ? ` (${data.couponCode})` : ""}`,
      `-${fmt(data.discount!)}`,
      "#059669",
    );
  }

  if (hasGst) {
    const cgstPct = data.cgstRate ?? 2.5;
    const sgstPct = data.sgstRate ?? 2.5;
    drawRow(`CGST @ ${cgstPct}%`, fmt(cgst), "#374151");
    drawRow(`SGST @ ${sgstPct}%`, fmt(sgst), "#374151");
  }

  // Total
  ctx.textAlign = "left";
  ctx.font = `bold 16px ${FONT}`;
  ctx.fillStyle = "#111827";
  ctx.fillText("Total", PAD, y);
  ctx.textAlign = "right";
  ctx.fillText(fmt(data.total), W - PAD, y);
  y += LINE_H + 4;

  // ─── Payment info ───
  ctx.font = `12px ${FONT}`;
  ctx.fillStyle = "#6b7280";
  ctx.textAlign = "left";
  const payLabel =
    data.paymentMethod === "counter" ? "Pay at Counter" : "Paid Online";
  ctx.fillText(`Payment: ${payLabel}`, PAD, y);

  if (hasDue) {
    ctx.textAlign = "right";
    ctx.fillStyle = "#dc2626";
    const due = data.total - (data.paidAmount ?? 0);
    ctx.fillText(`Due: ${fmt(due)}`, W - PAD, y);
  }
  y += 24;

  drawDashedLine(ctx, PAD, y, W - PAD);
  y += 18;
  ctx.textAlign = "center";
  ctx.font = `11px ${FONT}`;
  ctx.fillStyle = "#9ca3af";
  ctx.fillText("Thank you for your order!", W / 2, y);

  return canvas;
}

/** Download receipt as PNG */
export function downloadReceipt(data: ReceiptData) {
  const canvas = buildReceiptCanvas(data);
  const link = document.createElement("a");
  link.download = `receipt-token-${data.token}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

/** Open receipt in a new window and trigger print dialog */
export function printReceipt(data: ReceiptData) {
  const canvas = buildReceiptCanvas(data);
  const dataUrl = canvas.toDataURL("image/png");

  // 🖥️ ELECTRON → silent print
  if (window.electronAPI) {
    window.electronAPI.printReceipt(dataUrl);
    return;
  }

  // 🌐 fallback (browser)
  const printWindow = window.open("", "_blank", "width=500,height=700");
  if (!printWindow) return;

  printWindow.document.write(`
    <html>
    <body style="margin:0;display:flex;justify-content:center;">
      <img src="${dataUrl}" style="width:80mm" 
        onload="window.print();window.close();" />
    </body>
    </html>
  `);

  printWindow.document.close();
}