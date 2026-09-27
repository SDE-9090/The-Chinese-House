import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import ClassicOrderPage from "@/themes/classic/ClassicOrderPage";
import ItalianOrderPage from "@/themes/italian/ItalianOrderPage";
import { Loader2 } from "lucide-react";

export interface OrderPageProps {
  isTableMode?: boolean;
  tableSessionId?: string;
  tableNumber?: string;
  defaultName?: string;
  defaultPhone?: string;
  onSessionDone?: () => void;
  markingDone?: boolean;
  onCancelSession?: () => void;
  cancellingSession?: boolean;
  isTableLocked?: boolean;
  tableId?: string;
}

export default function OrderPage(props: OrderPageProps) {
  const { settings, loading } = useBusinessSettings();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Route to the selected theme
  if (settings?.theme === "modern-italian") {
    return <ItalianOrderPage {...props} />;
  }

  // Fallback to classic
  return <ClassicOrderPage {...props} />;
}
