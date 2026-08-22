import { io } from "socket.io-client";
import { getTenantSlug } from "./apiClient";

export const socket = io(
  import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:4000",
  {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
    query: {
      slug: getTenantSlug() || ""
    }
  }
);

socket.on("connect", () => {
  console.log("✅ Socket connected:", socket.id);
});

socket.on("disconnect", () => {
  console.log("❌ Socket disconnected");
});