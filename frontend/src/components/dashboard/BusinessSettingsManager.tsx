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
import { Loader2, AlertTriangle } from "lucide-react";
import { apiAdminFactoryReset } from "@/lib/apiClient";

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
};

const BusinessSettingsManager = () => {
  const { toast } = useToast();
  const [data, setData] = useState<BusinessSettings>(defaultState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    apiAdminGetBusinessSettings()
      .then(setData)
      .catch((err: Error) => setError(err.message || "Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setError("");

    if (!data.restaurantName.trim()) {
      setError("Restaurant name is required");
      return;
    }

    const normalizedGstin = data.gstin?.trim().toUpperCase() || "";
    if (normalizedGstin && !GSTIN_REGEX.test(normalizedGstin)) {
      setError("Enter a valid GSTIN");
      return;
    }

    if (data.cgstRate < 0 || data.sgstRate < 0) {
      setError("GST rates must be non-negative");
      return;
    }

    setSaving(true);
    try {
      const updated = await apiAdminUpdateBusinessSettings({
        restaurantName: data.restaurantName.trim(),
        gstin: normalizedGstin || null,
        address: data.address.trim(),
        phone: data.phone?.trim() || "",
        email: data.email?.trim() || "",
        isGstEnabled: data.isGstEnabled,
        cgstRate: data.cgstRate,
        sgstRate: data.sgstRate,
        features: data.features,
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

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 text-sm text-muted-foreground">
        Loading business settings...
      </div>
    );
  }

  const totalGst = Number((data.cgstRate + data.sgstRate).toFixed(2));

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="text-primary" size={18} />
          </div>
          <div>
            <h2 className="font-heading text-lg font-bold">Business & GST</h2>
            <p className="text-sm text-muted-foreground">
              Manage invoice identity and GST billing settings.
            </p>
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Restaurant Name
            </label>
            <input
              value={data.restaurantName}
              onChange={(e) =>
                setData((prev) => ({ ...prev, restaurantName: e.target.value }))
              }
              className="w-full rounded-xl border border-border bg-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Restaurant name"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              GSTIN
            </label>
            <div className="relative">
              <ReceiptText
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                value={data.gstin ?? ""}
                onChange={(e) =>
                  setData((prev) => ({
                    ...prev,
                    gstin: e.target.value.toUpperCase(),
                  }))
                }
                className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring uppercase"
                placeholder="27ABCDE1234F1Z5"
                maxLength={15}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Leave empty if you don't want GSTIN printed.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              GST Enabled
            </label>

            <div className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3 h-[52px]">
              <span className="text-sm text-muted-foreground">
                Enable GST for billing
              </span>

              <Switch
                id="gst-toggle"
                checked={data.isGstEnabled}
                onCheckedChange={(checked) =>
                  setData((prev) => ({ ...prev, isGstEnabled: checked }))
                }
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Online Payments
            </label>

            <div className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3 h-[52px]">
              <span className="text-sm text-muted-foreground">
                Enable "Pay Online" option
              </span>

              <Switch
                id="online-payment-toggle"
                checked={data.features?.isOnlinePaymentEnabled ?? true}
                onCheckedChange={(checked) =>
                  setData((prev) => ({
                    ...prev,
                    features: { ...prev.features, isOnlinePaymentEnabled: checked },
                  }))
                }
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Order Workflow
            </label>
            <select
              value={data.orderWorkflow || "quick-complete"}
              onChange={(e) =>
                setData((prev) => ({ ...prev, orderWorkflow: e.target.value as "multi-step" | "quick-complete" }))
              }
              className="w-full rounded-xl border border-border bg-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="quick-complete">Quick Complete (1-Click)</option>
              <option value="multi-step">Detailed (Start ➔ Ready ➔ Complete)</option>
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              Choose how orders are advanced on the dashboard.
            </p>
          </div>



          {/* GST Rate Inputs */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              CGST Rate (%)
            </label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={data.cgstRate}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setData((prev) => ({
                  ...prev,
                  cgstRate: isNaN(val) ? 0 : Math.max(0, val),
                }));
              }}
              disabled={!data.isGstEnabled}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="2.5"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              SGST Rate (%)
            </label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={data.sgstRate}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setData((prev) => ({
                  ...prev,
                  sgstRate: isNaN(val) ? 0 : Math.max(0, val),
                }));
              }}
              disabled={!data.isGstEnabled}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="2.5"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Phone
            </label>
            <input
              value={data.phone ?? ""}
              onChange={(e) =>
                setData((prev) => ({ ...prev, phone: e.target.value }))
              }
              className="w-full rounded-xl border border-border bg-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="+91 98765 43210"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Email
            </label>
            <input
              value={data.email ?? ""}
              onChange={(e) =>
                setData((prev) => ({ ...prev, email: e.target.value }))
              }
              className="w-full rounded-xl border border-border bg-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="billing@example.com"
            />
          </div>

          {/* Kitchen PIN */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Kitchen Display PIN
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={data.kitchenPin ?? ""}
              onChange={(e) =>
                setData((prev) => ({
                  ...prev,
                  kitchenPin: e.target.value.replace(/\D/g, ""),
                }))
              }
              className="w-full rounded-xl border border-border bg-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring font-mono tracking-widest"
              placeholder="1234"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              4-6 digit PIN for kitchen staff to access /kitchen
            </p>
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Address
            </label>
            <div className="relative">
              <MapPin
                size={16}
                className="absolute left-3 top-4 text-muted-foreground"
              />
              <textarea
                value={data.address}
                onChange={(e) =>
                  setData((prev) => ({ ...prev, address: e.target.value }))
                }
                className="min-h-28 w-full rounded-xl border border-border bg-background pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Business address for invoices"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3 text-sm">
          <span className="text-muted-foreground">Total GST rate</span>
          <span className="font-semibold text-foreground">
            {data.isGstEnabled
              ? `${totalGst}% (${data.cgstRate}% CGST + ${data.sgstRate}% SGST)`
              : "GST disabled"}
          </span>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground transition-opacity disabled:opacity-50"
        >
          <Save size={16} /> {saving ? "Saving..." : "Save Business Settings"}
        </button>
      </div>

      {/* Danger Zone */}
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
    </div>
  );
};

export default BusinessSettingsManager;
