import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { apiValidateCoupon, apiSessionClose, apiCompleteOrderPayment } from "@/lib/apiClient";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (printBill: boolean, method: string) => void;
  type: "table" | "order";
  id: string; // sessionId or orderId
  baseTotal: number;
  initialCustomerPhone?: string;
  title?: string;
}

export default function PaymentCollectionModal({
  isOpen,
  onClose,
  onSuccess,
  type,
  id,
  baseTotal,
  initialCustomerPhone = "",
  title = "Clear Table"
}: Props) {
  const { settings } = useBusinessSettings();
  const loyaltySettings = settings ? {
    enabled: settings.loyaltyEnabled,
    discount_per_point: settings.loyaltyDiscountPerPoint
  } : null;

  const [loyaltyPhone, setLoyaltyPhone] = useState(initialCustomerPhone);
  const [checkingLoyalty] = useState(false);
  // In a real scenario you might fetch loyalty points here, but sticking to existing logic:
  const [loyaltyPoints] = useState(0); 
  const [pointsRedeemed, setPointsRedeemed] = useState(0);

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState("");
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const [customDiscount, setCustomDiscount] = useState("");
  
  const [splitMode, setSplitMode] = useState(false);
  const [splitCash, setSplitCash] = useState("");
  const [splitUpi, setSplitUpi] = useState("");

  const [printBill, setPrintBill] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSplitMode(false);
      setSplitCash("");
      setSplitUpi("");
      setCustomDiscount("");
      setCouponCode("");
      setAppliedCoupon(null);
      setCouponError("");
      setPointsRedeemed(0);
      setLoyaltyPhone(initialCustomerPhone);
      setPrintBill(true);
      setIsProcessing(false);
    }
  }, [isOpen, id, initialCustomerPhone]);

  if (!isOpen) return null;

  const loyaltyDiscountValue = loyaltySettings?.enabled ? (pointsRedeemed * (loyaltySettings.discount_per_point || 1)) : 0;
  const couponDiscountValue = appliedCoupon ? appliedCoupon.discount : 0;
  const customDiscountValue = parseFloat(customDiscount) || 0;
  const finalTotal = Math.max(0, baseTotal - couponDiscountValue - loyaltyDiscountValue - customDiscountValue);

  const handleProcessPayment = async (method: string) => {
    try {
      setIsProcessing(true);
      
      const sCash = parseFloat(splitCash) || 0;
      const sUpi = parseFloat(splitUpi) || 0;
      const cPhone = loyaltyPhone || undefined;
      const cCode = appliedCoupon?.code;

      if (type === "table") {
        await apiSessionClose(id, method, sCash, sUpi, cPhone, pointsRedeemed, cCode, customDiscountValue);
      } else {
        await apiCompleteOrderPayment(id, method, sCash, sUpi, cPhone, pointsRedeemed, cCode, customDiscountValue);
      }

      toast({ title: "Payment Successful", description: "Payment recorded successfully." });
      onSuccess(printBill, method);
    } catch (err: any) {
      toast({ title: "Payment Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-900/60 backdrop-blur-md p-4">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-card w-full max-w-sm rounded-[2rem] p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} disabled={isProcessing} className="absolute top-5 right-5 text-muted-foreground hover:bg-muted p-2 rounded-full transition-colors disabled:opacity-50">
          <X size={20} />
        </button>
        
        <h3 className="text-2xl font-black mb-1">{title}</h3>
        <p className="text-sm font-semibold text-muted-foreground mb-6">How did the customer pay?</p>

        <div className="bg-primary/5 border border-primary/20 p-4 rounded-2xl mb-6 text-center space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground font-semibold px-4">
            <span>Subtotal</span>
            <span>₹{baseTotal.toFixed(2)}</span>
          </div>
          {appliedCoupon && (
            <div className="flex justify-between text-sm text-emerald-600 font-bold px-4">
              <span>Coupon ({appliedCoupon.code})</span>
              <span>-₹{couponDiscountValue.toFixed(2)}</span>
            </div>
          )}
          {pointsRedeemed > 0 && loyaltySettings?.enabled && (
            <div className="flex justify-between text-sm text-primary font-bold px-4">
              <span>Loyalty Reward</span>
              <span>-₹{loyaltyDiscountValue.toFixed(2)}</span>
            </div>
          )}
          {customDiscountValue > 0 && (
            <div className="flex justify-between text-sm text-amber-600 font-bold px-4">
              <span>Custom Discount</span>
              <span>-₹{customDiscountValue.toFixed(2)}</span>
            </div>
          )}
          <div className="pt-2 border-t border-primary/10">
            <p className="text-xs text-primary font-bold uppercase tracking-widest mb-1">Total Due</p>
            <p className="text-4xl font-black text-primary">₹{finalTotal.toFixed(0)}</p>
          </div>
        </div>

        <div className="mb-6 space-y-3">
          <div className="flex items-center gap-2 mt-4 pb-2 border-b border-border/50">
            <input 
              type="checkbox" 
              id="printBill" 
              checked={printBill}
              onChange={(e) => setPrintBill(e.target.checked)}
              className="w-4 h-4 text-primary rounded"
            />
            <label htmlFor="printBill" className="text-sm font-semibold text-muted-foreground cursor-pointer">
              Print physical bill automatically
            </label>
          </div>

          {loyaltySettings?.enabled && (
            <>
              <div>
                <label className="text-xs font-bold text-muted-foreground ml-1">Customer Phone (Loyalty)</label>
                <input
                  type="text"
                  maxLength={10}
                  value={loyaltyPhone}
                  onChange={(e) => setLoyaltyPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="Enter phone number..."
                  className="w-full bg-muted border-none rounded-xl p-3 font-semibold focus:ring-2 focus:ring-primary outline-none mt-1"
                />
              </div>

              {checkingLoyalty && <p className="text-xs text-muted-foreground ml-1">Checking loyalty points...</p>}
            </>
          )}

          {!checkingLoyalty && loyaltyPoints > 0 && loyaltySettings?.enabled && (
            <div className="bg-orange-500/10 border border-orange-500/20 p-3 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-orange-600">Loyalty Member</p>
                <p className="text-sm font-semibold text-orange-700">{loyaltyPoints} points available</p>
              </div>
              {pointsRedeemed > 0 ? (
                <button
                  onClick={() => setPointsRedeemed(0)}
                  className="text-xs font-bold bg-destructive/10 text-destructive px-3 py-1.5 rounded-lg"
                >
                  Remove
                </button>
              ) : (
                <button
                  onClick={() => {
                    const maxPoints = Math.floor(baseTotal / loyaltySettings.discount_per_point);
                    setPointsRedeemed(Math.min(loyaltyPoints, maxPoints || loyaltyPoints));
                  }}
                  className="text-xs font-bold bg-orange-500 text-white px-3 py-1.5 rounded-lg"
                >
                  Redeem
                </button>
              )}
            </div>
          )}

          <div className="pt-2 border-t border-border/50">
            <label className="text-xs font-bold text-muted-foreground ml-1">Discount Coupon</label>
            {!appliedCoupon ? (
              <div className="flex gap-2 mt-1">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(""); }}
                  placeholder="e.g. SUMMER20"
                  className="flex-1 bg-muted border-none rounded-xl p-3 font-semibold focus:ring-2 focus:ring-primary outline-none uppercase"
                />
                <button
                  disabled={validatingCoupon || !couponCode}
                  onClick={async () => {
                    setValidatingCoupon(true);
                    setCouponError("");
                    try {
                      const res = await apiValidateCoupon(couponCode, baseTotal);
                      setAppliedCoupon({ code: couponCode, ...res });
                      toast({ title: "Coupon Applied", description: `You saved ₹${res.discount.toFixed(2)}` });
                    } catch (err: any) {
                      setCouponError(err.message);
                    } finally {
                      setValidatingCoupon(false);
                    }
                  }}
                  className="bg-primary text-primary-foreground px-4 rounded-xl font-bold text-sm disabled:opacity-50"
                >
                  {validatingCoupon ? <Loader2 size={16} className="animate-spin" /> : "Apply"}
                </button>
              </div>
            ) : (
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl flex items-center justify-between mt-1">
                <div>
                  <p className="text-xs font-bold text-emerald-600">Coupon Applied</p>
                  <p className="text-sm font-semibold text-emerald-700">{appliedCoupon.code}</p>
                </div>
                <button
                  onClick={() => { setAppliedCoupon(null); setCouponCode(""); }}
                  className="text-xs font-bold bg-destructive/10 text-destructive px-3 py-1.5 rounded-lg"
                >
                  Remove
                </button>
              </div>
            )}
            {couponError && <p className="text-xs text-destructive ml-1 mt-1 font-semibold">{couponError}</p>}
          </div>
        </div>

        {/* Custom Discount Input */}
        <div className="bg-muted border border-border p-3 rounded-xl mb-6">
          <label className="text-xs font-bold text-muted-foreground mb-1 block">Custom Discount (₹) [Optional]</label>
          <input
            type="number"
            placeholder="Enter flat discount amount..."
            value={customDiscount}
            onChange={(e) => setCustomDiscount(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50"
            disabled={isProcessing}
          />
        </div>

        {!splitMode ? (
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              { id: 'cash', label: 'Cash', icon: '💵' },
              { id: 'upi', label: 'UPI', icon: '📱' },
              { id: 'card', label: 'Card', icon: '💳' },
            ].map(method => (
              <button
                key={method.id}
                disabled={isProcessing}
                onClick={() => handleProcessPayment(method.id)}
                className="bg-card hover:bg-primary/10 border-2 border-border hover:border-primary text-foreground p-4 rounded-2xl font-bold text-sm flex flex-col items-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
              >
                <span className="text-2xl">{method.icon}</span>
                {method.label}
              </button>
            ))}
            <button
              disabled={isProcessing}
              onClick={() => {
                setSplitMode(true);
                setSplitCash("");
                setSplitUpi("");
              }}
              className="bg-card hover:bg-primary/10 border-2 border-border hover:border-primary text-foreground p-4 rounded-2xl font-bold text-sm flex flex-col items-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            >
              <span className="text-2xl">⚖️</span>
              Split
            </button>
          </div>
        ) : (
          <div className="mb-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">💵</span>
              <div className="flex-1">
                <label className="text-xs font-bold text-muted-foreground ml-1">Cash Received</label>
                <input
                  type="number"
                  autoFocus
                  placeholder="₹0"
                  className="w-full bg-muted border-none rounded-xl p-3 font-bold text-lg focus:ring-2 focus:ring-primary outline-none"
                  value={splitCash}
                  onChange={(e) => {
                    setSplitCash(e.target.value);
                    const val = parseFloat(e.target.value) || 0;
                    setSplitUpi(Math.max(0, finalTotal - val).toString());
                  }}
                  disabled={isProcessing}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">📱</span>
              <div className="flex-1">
                <label className="text-xs font-bold text-muted-foreground ml-1">UPI Received</label>
                <input
                  type="number"
                  placeholder="₹0"
                  className="w-full bg-muted border-none rounded-xl p-3 font-bold text-lg focus:ring-2 focus:ring-primary outline-none"
                  value={splitUpi}
                  onChange={(e) => {
                    setSplitUpi(e.target.value);
                    const val = parseFloat(e.target.value) || 0;
                    setSplitCash(Math.max(0, finalTotal - val).toString());
                  }}
                  disabled={isProcessing}
                />
              </div>
            </div>
            <button
              disabled={isProcessing}
              onClick={() => handleProcessPayment('split')}
              className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold mt-2 hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {isProcessing && <Loader2 size={16} className="animate-spin" />}
              Confirm Split
            </button>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground text-center px-4 leading-tight">
          Selecting a payment method will irreversibly complete this payment and commit it to today's sales report.
        </p>
      </motion.div>
    </div>
  );
}
