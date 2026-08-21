import React, { useState } from "react";
import { API_URL } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Store } from "lucide-react";

export default function MobileSetup() {
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug.trim()) return;

    setLoading(true);
    try {
      const cleanSlug = slug.trim().toLowerCase();
      const res = await fetch(`${API_URL}/verify-tenant/${cleanSlug}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to verify restaurant code");
      }

      // Success! Save the slug and reload the app
      localStorage.setItem("tenant_slug", cleanSlug);
      toast({ title: `Welcome to ${data.name}!` });
      
      // Reload perfectly resets all React state and routing context
      window.location.href = "/";
      
    } catch (err: any) {
      toast({ title: "Verification Failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-lg border border-zinc-100 dark:border-zinc-800 text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Store className="w-8 h-8 text-primary" />
        </div>
        
        <h1 className="text-2xl font-bold mb-2">Welcome to the App</h1>
        <p className="text-gray-500 mb-8">Please enter your Restaurant Code to continue.</p>

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <Input 
              type="text" 
              required 
              value={slug} 
              onChange={e => setSlug(e.target.value)} 
              placeholder="e.g. hotelpatil"
              className="text-center text-lg py-6"
              autoCapitalize="none"
              autoCorrect="off"
            />
          </div>
          <Button type="submit" className="w-full py-6 text-lg" disabled={loading}>
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Verify & Continue"}
          </Button>
        </form>
      </div>
      
      <p className="text-sm text-gray-400 mt-8">
        Need help? Contact support or ask your manager for the code.
      </p>
    </div>
  );
}
