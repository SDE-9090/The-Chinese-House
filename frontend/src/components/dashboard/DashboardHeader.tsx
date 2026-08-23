import { Volume2, VolumeX, LogOut } from "lucide-react";
import ThemeToggle from "../ThemeToggle";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { useNavigate } from "react-router-dom";

interface DashboardHeaderProps {
  soundEnabled: boolean;
  onToggleSound: () => void;
  onLogout: () => void;
}

const DashboardHeader = ({
  soundEnabled,
  onToggleSound,
  onLogout,
}: DashboardHeaderProps) => {
  const { settings } = useBusinessSettings();
  const navigate = useNavigate();

  const backupSuperToken = localStorage.getItem("backup_super_token");

  const handleEndImpersonation = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("backup_super_token");
    
    const backupSlug = localStorage.getItem("backup_tenant_slug");
    if (backupSlug) {
      localStorage.setItem("tenant_slug", backupSlug);
      localStorage.removeItem("backup_tenant_slug");
    } else {
      localStorage.removeItem("tenant_slug");
    }

    navigate("/super");
  };

  return (
    <header className="py-1">
      {backupSuperToken && (
        <div className="bg-red-600 text-white py-1 px-4 text-center text-xs font-bold flex justify-center items-center gap-4 shadow-md">
          <span>⚠️ You are currently IMPERSONATING this tenant.</span>
          <button 
            onClick={handleEndImpersonation} 
            className="bg-white text-red-600 px-3 py-1 rounded-full hover:bg-red-50 transition"
          >
            End Impersonation
          </button>
        </div>
      )}
      <div className="container mx-auto flex items-center justify-between py-3 px-4">
        <h1 className="font-heading text-xl font-bold flex items-center gap-2">
          {settings?.logoUrl && settings.logoUrl !== "/favicon.png" && (
            <img src={settings.logoUrl} alt="Logo" className="h-6 w-auto object-contain rounded" />
          )}
          <span className="text-primary">{settings?.restaurantName || "Restaurant"}</span>{" "}
          <span className="text-secondary hidden sm:inline">Dashboard</span>
        </h1>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          <button
            onClick={onToggleSound}
            className="p-2 rounded-xl hover:bg-muted transition-colors"
            aria-label="Toggle sound"
          >
            {soundEnabled ? (
              <Volume2 size={20} />
            ) : (
              <VolumeX size={20} className="text-muted-foreground" />
            )}
          </button>

          <button
            onClick={onLogout}
            className="p-2 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            aria-label="Logout"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
