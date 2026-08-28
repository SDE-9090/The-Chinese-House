import { useEffect, useState } from "react";
import { Building2, MapPin, ReceiptText, Save } from "lucide-react";
import {
  apiAdminGetBusinessSettings,
  apiAdminUpdateBusinessSettings,
  type BusinessSettings,
} from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, AlertTriangle, Printer, Bluetooth, Settings, Utensils } from "lucide-react";
import { apiAdminFactoryReset } from "@/lib/apiClient";
import { Capacitor } from "@capacitor/core";
import { BluetoothPrinter } from "@candraadiw/capacitor-bluetooth-printer";
import { apiAdminGetMarketingHistory, type MarketingCampaign } from "@/lib/apiClient";
import { format } from "date-fns";

import { validateName, validateMobile, validateGST } from "@/lib/validators";

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const defaultState: BusinessSettings = {
  restaurantName: "",
  gstin: null,
  address: "",
  phone: "",
  email: "",
  isGstEnabled: true,
  isOnlinePaymentEnabled: true,
  cgstRate: 2.5,
  sgstRate: 2.5,
  kitchenPin: "1234",
  loyaltyEnabled: true,
  loyaltyPointsPer100: 10,
  loyaltyDiscountPerPoint: 1.00,
  winbackDiscountType: "percent",
  winbackDiscountValue: 15.00,
};

interface Props {
  user?: any;
}

const BusinessSettingsManager = ({ user }: Props) => {
  const { toast } = useToast();
  const [data, setData] = useState<BusinessSettings>(defaultState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{name?: string, mobile?: string, gst?: string}>({});

  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [resetting, setResetting] = useState(false);

  // Marketing History States
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [marketingHistory, setMarketingHistory] = useState<MarketingCampaign[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Bluetooth Printer States
  const [btDevices, setBtDevices] = useState<any[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [connectedPrinter, setConnectedPrinter] = useState<string | null>(null);

  useEffect(() => {
    apiAdminGetBusinessSettings()
      .then(setData)
      .catch((err: Error) => setError(err.message || "Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setError("");

    // Run validators
    const nameErr = validateName(data.restaurantName);
    const mobileErr = validateMobile(data.phone || "");
    const gstErr = validateGST(data.gstin || "");

    if (nameErr || mobileErr || gstErr) {
      setFieldErrors({ name: nameErr || undefined, mobile: mobileErr || undefined, gst: gstErr || undefined });
      setError("Please fix the validation errors before saving.");
      return;
    }

    const parsedCgst = Number(data.cgstRate);
    const parsedSgst = Number(data.sgstRate);
    if (isNaN(parsedCgst) || parsedCgst < 0 || isNaN(parsedSgst) || parsedSgst < 0) {
      setError("GST rates must be valid non-negative numbers");
      return;
    }

    setSaving(true);
    try {
      const updated = await apiAdminUpdateBusinessSettings({
        restaurantName: data.restaurantName.trim(),
        gstin: data.gstin?.trim().toUpperCase() || null,
        address: data.address.trim(),
        phone: data.phone?.trim() || "",
        email: data.email?.trim() || "",
        isGstEnabled: data.isGstEnabled,
        cgstRate: parsedCgst,
        sgstRate: parsedSgst,
        features: data.features,
        loyaltyEnabled: data.loyaltyEnabled,
        loyaltyPointsPer100: data.loyaltyPointsPer100,
        loyaltyDiscountPerPoint: data.loyaltyDiscountPerPoint,
        winbackDiscountType: data.winbackDiscountType,
        winbackDiscountValue: data.winbackDiscountValue,
        qrRoutingMode: data.qrRoutingMode,
        printerWidth: data.printerWidth,
      });
      setData(updated);
      toast({ title: "Saved", description: "Business settings updated." });
    } catch (err: any) {
      setError(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleFactoryReset = async () => {
    if (resetConfirmText !== "DELETE ALL DATA") return;
    setResetting(true);
    try {
      await apiAdminFactoryReset(resetConfirmText);
      toast({ title: "Success", description: "Database has been reset." });
      setResetModalOpen(false);
      setResetConfirmText("");
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      toast({ title: "Reset Failed", description: err.message, variant: "destructive" });
      setResetting(false);
    }
  };

  const handleOpenMarketingHistory = async () => {
    setHistoryModalOpen(true);
    setLoadingHistory(true);
    try {
      const history = await apiAdminGetMarketingHistory();
      setMarketingHistory(history);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleScanPrinters = async () => {
    if (!Capacitor.isNativePlatform()) {
      toast({ title: "Not Supported", description: "Bluetooth printing is only available on the Android app.", variant: "destructive" });
      return;
    }
    setIsScanning(true);
    try {
      const res = await BluetoothPrinter.listDevices();
      setBtDevices(res.devices || []);
      if (res.devices && res.devices.length === 0) {
        toast({ title: "No Printers Found", description: "Ensure the printer is turned on and paired in Android Settings." });
      }
    } catch (err: any) {
      toast({ title: "Scan Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsScanning(false);
    }
  };

  const handleConnectPrinter = async (address: string, name: string) => {
    try {
      toast({ title: "Connecting...", description: `Connecting to ${name}` });
      await BluetoothPrinter.connect({ address });
      setConnectedPrinter(address);
      toast({ title: "Connected", description: `Successfully connected to ${name}` });
    } catch (err: any) {
      toast({ title: "Connection Failed", description: err.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 text-sm text-muted-foreground">
        Loading business settings...
      </div>
    );
  }

  const totalGst = Number((Number(data.cgstRate) + Number(data.sgstRate)).toFixed(2)) || 0;

  const isPrinterOnly = user?.role !== 'admin' && user?.permissions?.systemAccess?.printerOnly === true;


  return (
    <div className="space-y-6">
      {!isPrinterOnly && (
        <>
          {/* 1. Business Profile */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building2 className="text-primary" size={18} />
              </div>
              <div>
                <h2 className="font-heading text-lg font-bold">Business Profile</h2>
                <p className="text-sm text-muted-foreground">Manage your restaurant identity and contact details.</p>
              </div>
            </div>

            {error ? (
              <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-foreground mb-1.5 block">Restaurant Name</label>
                <input
                  value={data.restaurantName}
                  onChange={(e) => {
                    setData((prev) => ({ ...prev, restaurantName: e.target.value }));
                    if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: undefined }));
                  }}
                  onBlur={(e) => {
                    const err = validateName(e.target.value);
                    setFieldErrors(prev => ({ ...prev, name: err || undefined }));
                  }}
                  className={`w-full rounded-xl border ${fieldErrors.name ? 'border-red-500' : 'border-border'} bg-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring`}
                  placeholder="Restaurant name"
                />
                {fieldErrors.name && <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>}
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Phone</label>
                <input
                  value={data.phone ?? ""}
                  onChange={(e) => {
                    setData((prev) => ({ ...prev, phone: e.target.value }));
                    if (fieldErrors.mobile) setFieldErrors(prev => ({ ...prev, mobile: undefined }));
                  }}
                  onBlur={(e) => {
                    const err = validateMobile(e.target.value);
                    setFieldErrors(prev => ({ ...prev, mobile: err || undefined }));
                  }}
                  className={`w-full rounded-xl border ${fieldErrors.mobile ? 'border-red-500' : 'border-border'} bg-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring`}
                  placeholder="9876543210"
                  maxLength={10}
                />
                {fieldErrors.mobile && <p className="text-red-500 text-xs mt-1">{fieldErrors.mobile}</p>}
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
                <input
                  value={data.email ?? ""}
                  onChange={(e) => setData((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="billing@example.com"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium text-foreground mb-1.5 block">Address</label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3 top-4 text-muted-foreground" />
                  <textarea
                    value={data.address}
                    onChange={(e) => setData((prev) => ({ ...prev, address: e.target.value }))}
                    className="min-h-28 w-full rounded-xl border border-border bg-background pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Business address for invoices"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. Taxation & Billing */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <ReceiptText className="text-purple-500" size={18} />
              </div>
              <div>
                <h2 className="font-heading text-lg font-bold">Taxation & Billing</h2>
                <p className="text-sm text-muted-foreground">Configure GST rates and invoicing.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">GST Enabled</label>
                <div className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3 h-[52px]">
                  <span className="text-sm text-muted-foreground">Enable GST for billing</span>
                  <Switch
                    id="gst-toggle"
                    checked={data.isGstEnabled}
                    onCheckedChange={(checked) => setData((prev) => ({ ...prev, isGstEnabled: checked }))}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">GSTIN</label>
                <div className="relative">
                  <ReceiptText size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={data.gstin ?? ""}
                    onChange={(e) => {
                      setData((prev) => ({ ...prev, gstin: e.target.value.toUpperCase() }));
                      if (fieldErrors.gst) setFieldErrors(prev => ({ ...prev, gst: undefined }));
                    }}
                    onBlur={(e) => {
                      const err = validateGST(e.target.value);
                      setFieldErrors(prev => ({ ...prev, gst: err || undefined }));
                    }}
                    className={`w-full rounded-xl border ${fieldErrors.gst ? 'border-red-500' : 'border-border'} bg-background pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring uppercase`}
                    placeholder="27ABCDE1234F1Z5"
                    maxLength={15}
                  />
                </div>
                {fieldErrors.gst && <p className="text-red-500 text-xs mt-1">{fieldErrors.gst}</p>}
                <p className="mt-1 text-xs text-muted-foreground">Leave empty if you don't want GSTIN printed.</p>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">CGST Rate (%)</label>
                <input
                  type="number" min={0} step={0.01}
                  value={data.cgstRate}
                  onChange={(e) => setData((prev) => ({ ...prev, cgstRate: e.target.value as any }))}
                  disabled={!data.isGstEnabled}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="2.5"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">SGST Rate (%)</label>
                <input
                  type="number" min={0} step={0.01}
                  value={data.sgstRate}
                  onChange={(e) => setData((prev) => ({ ...prev, sgstRate: e.target.value as any }))}
                  disabled={!data.isGstEnabled}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="2.5"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3 text-sm">
              <span className="text-muted-foreground">Total GST rate</span>
              <span className="font-semibold text-foreground">
                {data.isGstEnabled ? `${totalGst}% (${data.cgstRate}% CGST + ${data.sgstRate}% SGST)` : "GST disabled"}
              </span>
            </div>
          </div>

          {/* 3. Operations & Ordering */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Utensils className="text-blue-500" size={18} />
              </div>
              <div>
                <h2 className="font-heading text-lg font-bold">Operations & Ordering</h2>
                <p className="text-sm text-muted-foreground">Manage order flows, payments, and kitchen access.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Online Payments</label>
                <div className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3 h-[52px]">
                  <span className="text-sm text-muted-foreground">Enable "Pay Online" option</span>
                  <Switch
                    id="online-payment-toggle"
                    checked={data.features?.isOnlinePaymentEnabled ?? true}
                    onCheckedChange={(checked) => setData((prev) => ({ ...prev, features: { ...prev.features, isOnlinePaymentEnabled: checked } }))}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Kitchen Display PIN</label>
                <input
                  type="text" inputMode="numeric" maxLength={6}
                  value={data.kitchenPin ?? ""}
                  onChange={(e) => setData((prev) => ({ ...prev, kitchenPin: e.target.value.replace(/\D/g, "") }))}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring font-mono tracking-widest"
                  placeholder="1234"
                />
                <p className="mt-1 text-xs text-muted-foreground">4-6 digit PIN for kitchen staff to access /kitchen</p>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Order Workflow</label>
                <select
                  value={data.orderWorkflow || "quick-complete"}
                  onChange={(e) => setData((prev) => ({ ...prev, orderWorkflow: e.target.value as "multi-step" | "quick-complete" }))}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="quick-complete">Quick Complete (1-Click)</option>
                  <option value="multi-step">Detailed (Start ➔ Ready ➔ Complete)</option>
                </select>
                <p className="mt-1 text-xs text-muted-foreground">Choose how orders are advanced on the dashboard.</p>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">QR Code Ordering Mode</label>
                <select
                  value={data.qrRoutingMode || "claim"}
                  onChange={(e) => setData((prev) => ({ ...prev, qrRoutingMode: e.target.value as "claim" | "waiter_unlock" }))}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="claim">Claim Method (Open Access)</option>
                  <option value="waiter_unlock">Waiter Unlock Method (Secure Access)</option>
                </select>
                <p className="mt-1 text-xs text-muted-foreground">Choose how QR code orders are assigned to waiters.</p>
              </div>
            </div>
          </div>

      {/* Loyalty Program Settings */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-500 lucide lucide-gift"><polyline points="20 12 20 22 4 22 4 12"/><rect width="20" height="5" x="2" y="7"/><line x1="12" x2="12" y1="22" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
          </div>
          <div>
            <h2 className="font-heading text-lg font-bold">Loyalty Program</h2>
            <p className="text-sm text-muted-foreground">
              Configure points earned per ₹100 and discount value per point.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Program Status
            </label>

            <div className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3 h-[52px]">
              <span className="text-sm text-muted-foreground">
                Enable Loyalty Program
              </span>

              <Switch
                id="loyalty-toggle"
                checked={data.loyaltyEnabled ?? true}
                onCheckedChange={(checked) =>
                  setData((prev) => ({ ...prev, loyaltyEnabled: checked }))
                }
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Points Earned (per ₹100 spent)
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={data.loyaltyPointsPer100 ?? 10}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setData((prev) => ({
                  ...prev,
                  loyaltyPointsPer100: isNaN(val) ? 0 : Math.max(0, val),
                }));
              }}
              disabled={!data.loyaltyEnabled}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="10"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Discount Value (₹ per Point)
            </label>
            <input
              type="number"
              min={0}
              step={0.1}
              value={data.loyaltyDiscountPerPoint ?? 1}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setData((prev) => ({
                  ...prev,
                  loyaltyDiscountPerPoint: isNaN(val) ? 0 : Math.max(0, val),
                }));
              }}
              disabled={!data.loyaltyEnabled}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="1.0"
            />
          </div>
        </div>
      </div>

      {/* Win-Back CRM Settings */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500 lucide lucide-message-circle-heart"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/><path d="M15.8 9.2a2.5 2.5 0 0 0-3.5 0l-.3.4-.3-.4a2.5 2.5 0 1 0-3.6 3.5l3.9 3.9 3.9-3.9a2.5 2.5 0 0 0-.1-3.5Z"/></svg>
          </div>
          <div>
            <h2 className="font-heading text-lg font-bold">Automated Win-Back CRM</h2>
            <p className="text-sm text-muted-foreground">
              Configure the automated discount sent to customers who haven't ordered in 30 days.
            </p>
          </div>
          <div className="ml-auto">
            <Button variant="outline" size="sm" onClick={handleOpenMarketingHistory}>
              View History
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Discount Type</label>
            <select
              value={data.winbackDiscountType || "percent"}
              onChange={(e) => setData((prev) => ({ ...prev, winbackDiscountType: e.target.value as "percent" | "flat" }))}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="percent">Percentage (%)</option>
              <option value="flat">Flat Amount (₹)</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Discount Value
            </label>
            <input
              type="number"
              min={0}
              step={data.winbackDiscountType === "percent" ? 1 : 10}
              value={data.winbackDiscountValue ?? 15}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setData((prev) => ({
                  ...prev,
                  winbackDiscountValue: isNaN(val) ? 0 : Math.max(0, val),
                }));
              }}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="15"
            />
          </div>
        </div>
      </div>
      </>
      )}

      
      {/* 4. Hardware & Printing */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-500/10 flex items-center justify-center">
            <Printer className="text-slate-500" size={18} />
          </div>
          <div>
            <h2 className="font-heading text-lg font-bold">Hardware & Printing</h2>
            <p className="text-sm text-muted-foreground">Manage receipt printers and hardware integrations.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Global Printer Width</label>
            <select
              value={data.printerWidth || "58mm"}
              onChange={(e) => setData((prev) => ({ ...prev, printerWidth: e.target.value }))}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="58mm">58mm (Small Thermal Printers)</option>
              <option value="80mm">80mm (Large Thermal Printers)</option>
            </select>
            <p className="mt-1 text-xs text-muted-foreground">Select the paper size for your receipt printer.</p>
          </div>
        </div>

        {Capacitor.isNativePlatform() && (
          <div className="mt-4 pt-4 border-t border-border">
            <h3 className="font-semibold mb-3 flex items-center gap-2 text-blue-600"><Bluetooth size={16}/> Bluetooth Printer (Android OS)</h3>
            <div className="space-y-4">
              <Button onClick={handleScanPrinters} disabled={isScanning} variant="secondary" className="w-full md:w-auto">
                <Bluetooth className="w-4 h-4 mr-2" /> 
                {isScanning ? "Scanning..." : "Scan for Paired Printers"}
              </Button>

              {btDevices.length > 0 && (
                <div className="space-y-2 mt-4">
                  <label className="text-sm font-medium text-foreground block">Paired Devices</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {btDevices.map((device, i) => (
                      <div key={i} className="flex items-center justify-between p-3 border border-border rounded-xl bg-background">
                        <div className="overflow-hidden">
                          <p className="font-medium text-sm truncate">{device.name || "Unknown Printer"}</p>
                          <p className="text-xs text-muted-foreground truncate font-mono">{device.address}</p>
                        </div>
                        <Button 
                          size="sm" 
                          variant={connectedPrinter === device.address ? "default" : "outline"}
                          onClick={() => handleConnectPrinter(device.address, device.name)}
                        >
                          {connectedPrinter === device.address ? "Connected" : "Connect"}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Global Save Button */}
      {!isPrinterOnly && (
      <div className="flex justify-end sticky bottom-6 z-10 pt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-4 font-bold text-primary-foreground transition-all hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shadow-xl shadow-primary/30"
        >
          <Save size={20} /> {saving ? "Saving..." : "Save All Settings"}
        </button>
      </div>
      )}

      {/* Danger Zone */}
      {!isPrinterOnly && (
      <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-6 space-y-4 mt-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="text-destructive" size={18} />
          </div>
          <div>
            <h2 className="font-heading text-lg font-bold text-destructive">Danger Zone</h2>
            <p className="text-sm text-muted-foreground">
              Destructive actions that cannot be undone.
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-background border border-border rounded-xl">
          <div>
            <h3 className="font-semibold text-foreground">Factory Reset Database</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Wipe all orders, tables, menu items, reviews, and staff data. 
              Landing page and business settings will remain untouched.
            </p>
          </div>
          <Button 
            variant="destructive" 
            onClick={() => setResetModalOpen(true)}
            className="shrink-0"
          >
            Reset Database
          </Button>
        </div>
      </div>
      )}

      {/* Reset Modal */}
      <Dialog open={resetModalOpen} onOpenChange={setResetModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This action <b>cannot be undone</b>. This will permanently delete your menu items,
              orders, tables, staff, and sales history. Your admin login and landing page data will be kept.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <Label className="text-foreground">
              Please type <span className="font-mono font-bold text-destructive select-all">DELETE ALL DATA</span> to confirm.
            </Label>
            <Input 
              value={resetConfirmText}
              onChange={(e) => setResetConfirmText(e.target.value)}
              placeholder="DELETE ALL DATA"
              className="font-mono"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setResetModalOpen(false); setResetConfirmText(""); }} disabled={resetting}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleFactoryReset} 
              disabled={resetConfirmText !== "DELETE ALL DATA" || resetting}
            >
              {resetting ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
              Confirm Factory Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Marketing History Modal */}
      <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Marketing Campaign History</DialogTitle>
            <DialogDescription>
              A log of all automated Win-Back SMS/WhatsApp messages sent to your customers.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {loadingHistory ? (
              <div className="flex justify-center p-8">
                <Loader2 className="animate-spin w-6 h-6 text-muted-foreground" />
              </div>
            ) : marketingHistory.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
                No campaigns have been sent yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium rounded-tl-xl">Date</th>
                      <th className="px-4 py-3 font-medium">Customer</th>
                      <th className="px-4 py-3 font-medium">Phone</th>
                      <th className="px-4 py-3 font-medium">Campaign</th>
                      <th className="px-4 py-3 font-medium rounded-tr-xl">Coupon Code</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {marketingHistory.map((log) => (
                      <tr key={log.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3 whitespace-nowrap">
                          {format(new Date(log.sent_at), "dd MMM yyyy, hh:mm a")}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {log.customer_name || "Unknown"}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {log.customer_phone}
                        </td>
                        <td className="px-4 py-3 capitalize">
                          {log.campaign_type.replace("-", " ")}
                        </td>
                        <td className="px-4 py-3">
                          <span className="bg-primary/10 text-primary px-2 py-1 rounded-md font-mono text-xs font-bold">
                            {log.coupon_code}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setHistoryModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BusinessSettingsManager;
