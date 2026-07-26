import { useEffect, useState } from "react";
import { apiGetTokens } from "@/lib/apiClient";
import { socket } from "@/lib/socket";

type TokenRow = {
  id: string;
  token: number;
  status: "new" | "preparing" | "ready" | "completed";
};

export function useTokens(intervalMs = 3000) {
  const [tokens, setTokens] = useState<TokenRow[]>([]);

  async function loadTokens() {
    try {
      const data = await apiGetTokens();
      setTokens(data as TokenRow[]);
    } catch (err) {
      console.error("Failed to fetch tokens:", err);
    }
  }

  useEffect(() => {
    loadTokens();
    
    socket.on("orders-updated", loadTokens);
    socket.on("new-order", loadTokens);
    
    return () => {
      socket.off("orders-updated", loadTokens);
      socket.off("new-order", loadTokens);
    };
  }, []);

  return { tokens };
}
