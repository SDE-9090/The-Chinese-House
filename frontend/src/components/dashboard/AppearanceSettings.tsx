import { useState } from "react";
import { Loader2, Palette } from "lucide-react";
import { API_URL } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

export default function AppearanceSettings({ user, token }: { user: any, token: string }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  
  const availableThemes = user?.available_themes || ["classic"];
  const currentTheme = user?.active_dashboard_theme || "classic";
  
  const [selectedTheme, setSelectedTheme] = useState(currentTheme);

  const handleSave = async () => {
    if (selectedTheme === currentTheme) return;
    
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/admin/business-settings/theme`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ theme: selectedTheme })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      toast({ title: "Theme Updated", description: "Your dashboard will reload to apply the new theme." });
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      toast({ title: "Failed to update theme", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Palette className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Dashboard Theme</h2>
          <p className="text-sm text-muted-foreground">Select the appearance of your admin dashboard.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div 
          onClick={() => setSelectedTheme("classic")}
          className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
            selectedTheme === "classic" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
          }`}
        >
          <div className="font-bold text-lg mb-1 flex items-center justify-between">
            Classic Red
            {selectedTheme === "classic" && <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">Active</span>}
          </div>
          <p className="text-sm text-muted-foreground">The standard mode theme with red accents.</p>
          {!availableThemes.includes("classic") && (
            <div className="mt-2 text-xs font-semibold text-red-500">🔒 Not Unlocked</div>
          )}
        </div>
        
        <div 
          onClick={() => availableThemes.includes("saas-dark") && setSelectedTheme("saas-dark")}
          className={`border-2 rounded-xl p-4 transition-all ${
            availableThemes.includes("saas-dark") ? "cursor-pointer" : "opacity-50 cursor-not-allowed"
          } ${
            selectedTheme === "saas-dark" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
          }`}
        >
          <div className="font-bold text-lg mb-1 flex items-center justify-between">
            SaaS Premium (Indigo)
            {selectedTheme === "saas-dark" && <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">Active</span>}
          </div>
          <p className="text-sm text-muted-foreground">A sleek theme with deep indigo and violet accents, optimized for both light and dark modes.</p>
          {!availableThemes.includes("saas-dark") && (
            <div className="mt-2 text-xs font-semibold text-yellow-600 dark:text-yellow-400">🔒 Pro Plan Required</div>
          )}
        </div>

        <div 
          onClick={() => availableThemes.includes("aqua") && setSelectedTheme("aqua")}
          className={`border-2 rounded-xl p-4 transition-all ${
            availableThemes.includes("aqua") ? "cursor-pointer" : "opacity-50 cursor-not-allowed"
          } ${
            selectedTheme === "aqua" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
          }`}
        >
          <div className="font-bold text-lg mb-1 flex items-center justify-between">
            Aqua Glass (Teal)
            {selectedTheme === "aqua" && <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">Active</span>}
          </div>
          <p className="text-sm text-muted-foreground">A refreshing, modern theme with cool cyan and deep teal aesthetics.</p>
          {!availableThemes.includes("aqua") && (
            <div className="mt-2 text-xs font-semibold text-yellow-600 dark:text-yellow-400">🔒 Pro Plan Required</div>
          )}
        </div>

        <div 
          onClick={() => availableThemes.includes("sunset") && setSelectedTheme("sunset")}
          className={`border-2 rounded-xl p-4 transition-all ${
            availableThemes.includes("sunset") ? "cursor-pointer" : "opacity-50 cursor-not-allowed"
          } ${
            selectedTheme === "sunset" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
          }`}
        >
          <div className="font-bold text-lg mb-1 flex items-center justify-between">
            Sunset Glow (Coral)
            {selectedTheme === "sunset" && <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">Active</span>}
          </div>
          <p className="text-sm text-muted-foreground">An elegant and warm theme featuring rich coral and ambient sunset tones.</p>
          {!availableThemes.includes("sunset") && (
            <div className="mt-2 text-xs font-semibold text-yellow-600 dark:text-yellow-400">🔒 Pro Plan Required</div>
          )}
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving || selectedTheme === currentTheme} className="h-12 w-full md:w-auto px-8">
        {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : "Apply Theme"}
      </Button>
    </div>
  );
}
