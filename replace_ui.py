import re

with open("frontend/src/components/dashboard/BusinessSettingsManager.tsx", "r") as f:
    text = f.read()

# Add Settings and Utensils to lucide imports
text = text.replace(
    "import { Loader2, AlertTriangle, Printer, Bluetooth } from \"lucide-react\";",
    "import { Loader2, AlertTriangle, Printer, Bluetooth, Settings, Utensils } from \"lucide-react\";"
)

# Define the new JSX structure for the top part
new_jsx = """
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
"""

# Extract everything up to the return statement
idx_start = text.find("  return (\n    <div className=\"space-y-6\">")
idx_end = text.find("{/* Loyalty Program Settings */}")

if idx_start != -1 and idx_end != -1:
    text = text[:idx_start] + new_jsx + "\n      " + text[idx_end:]

# Now we need to move "Global Printer Width" into the Bluetooth Printer Settings block or create a Hardware block.
# Let's see the Bluetooth Printer section.
idx_bt_start = text.find("{/* Bluetooth Printer Settings (Native Only) */}")

if idx_bt_start != -1:
    hardware_jsx = """
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
"""
    # Replace the old Bluetooth Printer Settings section
    idx_bt_end = text.find("{/* Global Save Button */}")
    text = text[:idx_bt_start] + hardware_jsx + "\n      " + text[idx_bt_end:]

with open("frontend/src/components/dashboard/BusinessSettingsManager.tsx", "w") as f:
    f.write(text)
