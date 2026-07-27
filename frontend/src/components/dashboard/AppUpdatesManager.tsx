import { useState, useEffect } from "react";
import { UploadCloud, CheckCircle2, DownloadCloud, AlertTriangle } from "lucide-react";
import { apiCheckForUpdates, apiUploadUpdate } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { Capacitor } from '@capacitor/core';

interface AppUpdatesManagerProps {
  user: any;
}

export default function AppUpdatesManager({ user }: AppUpdatesManagerProps) {
  const { toast } = useToast();
  const [checking, setChecking] = useState(false);
  const [latestUpdate, setLatestUpdate] = useState<any>(null);
  
  // Admin upload state
  const [file, setFile] = useState<File | null>(null);
  const [version, setVersion] = useState("");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    checkUpdates();
  }, []);

  const checkUpdates = async () => {
    try {
      setChecking(true);
      const res = await apiCheckForUpdates();
      
      let currentVersion = "";
      if (Capacitor.isNativePlatform()) {
        try {
          const current = await CapacitorUpdater.current();
          currentVersion = current.bundle.version;
        } catch (e) {
          console.log("No current bundle found or not supported", e);
        }
      }

      if (res.updateAvailable) {
        // If we're on native and the current version matches the latest backend version, we are already up to date
        if (Capacitor.isNativePlatform() && currentVersion === res.update.version) {
          setLatestUpdate(null);
        } else {
          setLatestUpdate(res.update);
        }
      } else {
        setLatestUpdate(null);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setChecking(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !version) return;
    try {
      setUploading(true);
      await apiUploadUpdate(file, version, notes);
      toast({ title: "Update Uploaded", description: "The new app update is live!" });
      setFile(null);
      setVersion("");
      setNotes("");
      checkUpdates(); // Refresh latest
    } catch (err: any) {
      toast({ title: "Upload Failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const applyUpdate = async () => {
    if (!latestUpdate) return;
    try {
      setDownloading(true);
      
      // If we're not running natively, just mock it
      if (!Capacitor.isNativePlatform()) {
        toast({ title: "Web Environment", description: "In a browser, simply refresh the page to update." });
        setTimeout(() => window.location.reload(), 2000);
        return;
      }
      
      toast({ title: "Downloading Update..." });
      
      const downloadedVersion = await CapacitorUpdater.download({
        url: window.location.origin + latestUpdate.url,
        version: latestUpdate.version
      });
      
      toast({ title: "Update Downloaded", description: "Applying update and restarting..." });
      
      // Apply the update (this restarts the webview automatically)
      await CapacitorUpdater.set(downloadedVersion);
      
    } catch (err: any) {
      toast({ title: "Update Failed", description: err.message, variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Tablet Update Side */}
      <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <DownloadCloud className="text-primary" /> Install OTA Update
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          Check if a new version of the app is available and install it seamlessly without downloading an APK.
        </p>

        {checking ? (
          <div className="bg-muted p-4 rounded-xl text-center text-sm font-semibold text-muted-foreground">
            Checking server for updates...
          </div>
        ) : latestUpdate ? (
          <div className="bg-primary/5 border border-primary/20 p-5 rounded-xl space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-bold text-primary flex items-center gap-1"><CheckCircle2 size={16}/> New Update Available</p>
                <h4 className="text-2xl font-black mt-1">v{latestUpdate.version}</h4>
                <p className="text-xs text-muted-foreground mt-1">Released: {new Date(latestUpdate.created_at).toLocaleString()}</p>
              </div>
            </div>
            
            {latestUpdate.release_notes && (
              <div className="bg-background rounded-lg p-3 text-sm">
                <span className="font-bold text-xs text-muted-foreground block mb-1">Release Notes:</span>
                {latestUpdate.release_notes}
              </div>
            )}
            
            <button 
              onClick={applyUpdate}
              disabled={downloading}
              className="w-full bg-primary text-primary-foreground font-bold rounded-xl py-3 shadow-lg shadow-primary/30 transition-all hover:-translate-y-1 active:translate-y-0 disabled:opacity-50"
            >
              {downloading ? "Downloading & Applying..." : "Download & Apply Update Now"}
            </button>
          </div>
        ) : (
          <div className="bg-muted/50 p-6 rounded-xl text-center">
            <CheckCircle2 size={32} className="mx-auto text-muted-foreground mb-2 opacity-50" />
            <p className="font-semibold">App is up to date!</p>
            <p className="text-xs text-muted-foreground mt-1">No updates found on the server.</p>
            <button onClick={checkUpdates} className="mt-4 px-4 py-2 bg-background border border-border rounded-lg text-sm font-bold hover:bg-muted">Check Again</button>
          </div>
        )}
      </div>

      {/* Admin Upload Side */}
      {user?.role === "admin" && (
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <UploadCloud className="text-primary" /> Publish Update (Admin)
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            Upload a zipped `dist` folder to push a live Over-The-Air update to all tablets instantly.
          </p>

          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="text-sm font-bold text-muted-foreground block mb-1">Version Number (e.g. 1.0.5)</label>
              <input 
                required
                type="text" 
                value={version}
                onChange={e => setVersion(e.target.value)}
                className="w-full bg-muted border-none rounded-xl p-3 font-semibold focus:ring-2 focus:ring-primary outline-none"
                placeholder="1.0.0"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-muted-foreground block mb-1">Release Notes</label>
              <textarea 
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full bg-muted border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none min-h-[80px]"
                placeholder="What's new in this version?"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-muted-foreground block mb-1">Select Build (.zip)</label>
              <input 
                required
                type="file"
                accept=".zip"
                onChange={e => setFile(e.target.files?.[0] || null)}
                className="w-full file:bg-primary file:text-primary-foreground file:border-none file:px-4 file:py-2 file:rounded-lg file:mr-4 file:font-bold text-sm text-muted-foreground bg-muted p-2 rounded-xl"
              />
            </div>
            
            <div className="pt-2">
              <button 
                type="submit"
                disabled={uploading || !file || !version}
                className="w-full bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 font-bold rounded-xl py-3 transition-all hover:scale-[1.02] disabled:opacity-50 flex justify-center items-center gap-2"
              >
                <UploadCloud size={18} /> {uploading ? "Uploading..." : "Publish Update to Tablets"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
