import { useEffect, useState } from "react";
import { apiGetPublicBusinessInfo, type PublicBusinessInfo } from "@/lib/apiClient";
import { socket } from "@/lib/socket";

const ALL_THEME_CLASSES = [
  "theme-hennys-classic",
  "theme-gourmet-royal",
  "theme-midnight-bistro",
  "theme-summer-cafe",
  "theme-chalkboard",
  "theme-neon-pulse",
  "theme-rose-garden",
  "theme-ocean-breeze",
  "theme-ember-grill",
  "theme-matcha-zen",
  "theme-lavender-dusk",
  "theme-truffle-noir",
];

const ThemeInjector = () => {
  const [settings, setSettings] = useState<PublicBusinessInfo | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await apiGetPublicBusinessInfo();
        setSettings(data);
        
        // --- DYNAMIC BRANDING & SEO ---
        
        // 1. Update Document Title
        document.title = `${data.name} | Order Online`;
        
        // 2. Update Meta Tags
        const setMeta = (selector: string, content: string) => {
          let meta = document.querySelector(selector) as HTMLMetaElement;
          if (meta) meta.content = content;
        };
        setMeta('meta[name="description"]', `Order online from ${data.name}. Fresh and delicious!`);
        setMeta('meta[property="og:title"]', `${data.name} | Order Online`);
        setMeta('meta[property="og:site_name"]', data.name);
        setMeta('meta[name="twitter:title"]', `${data.name} | Order Online`);
        if (data.logo_url) {
          setMeta('meta[property="og:image"]', data.logo_url);
          setMeta('meta[name="twitter:image"]', data.logo_url);
        }

        // 3. Update Favicons
        if (data.logo_url) {
          const icon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
          if (icon) icon.href = data.logo_url;
          const appleIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
          if (appleIcon) appleIcon.href = data.logo_url;
        }

        // 4. Generate Dynamic PWA Manifest
        const manifest = {
          name: data.name,
          short_name: data.name,
          description: `Order online from ${data.name}`,
          start_url: "/",
          display: "standalone",
          background_color: "#FAF8F5",
          theme_color: "#E23744",
          icons: [
            {
              src: data.logo_url || "/favicon.png",
              sizes: "192x192 512x512",
              type: "image/png",
              purpose: "any maskable"
            }
          ]
        };
        const manifestDataUri = `data:application/manifest+json;charset=utf-8,${encodeURIComponent(JSON.stringify(manifest))}`;
        let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
        if (!manifestLink) {
          manifestLink = document.createElement('link');
          manifestLink.rel = 'manifest';
          document.head.appendChild(manifestLink);
        }
        manifestLink.href = manifestDataUri;
        
      } catch (err) {
        console.error("ThemeInjector: failed to fetch public business info", err);
      }
    };

    fetchSettings();

    // Re-fetch if settings update via websocket
    const handler = () => fetchSettings();
    socket.on("business-settings-updated", handler);
    return () => { socket.off("business-settings-updated", handler); };
  }, []);

  useEffect(() => {
    const root = document.documentElement;

    // Clear all previous theme classes
    ALL_THEME_CLASSES.forEach((t) => root.classList.remove(t));

    // Determine theme: from API or fallback
    const themeName = settings?.theme || "hennys-classic";
    const themeClass = `theme-${themeName}`;
    root.classList.add(themeClass);

    // Push font CSS vars for Tailwind utilities
    requestAnimationFrame(() => {
      const styles = getComputedStyle(root);
      const headingFont = styles.getPropertyValue("--theme-font-heading").trim();
      const bodyFont = styles.getPropertyValue("--theme-font-body").trim();
      const primaryColor = styles.getPropertyValue("--theme-primary").trim();

      if (headingFont) root.style.setProperty("--font-heading", headingFont);
      if (bodyFont) root.style.setProperty("--font-body", bodyFont);
      
      // Update PWA theme color if primary is defined
      if (primaryColor) {
        const themeMeta = document.querySelector('meta[name="theme-color"]');
        if (themeMeta) themeMeta.setAttribute("content", `hsl(${primaryColor})`);
      }
    });

    return () => {
      root.classList.remove(themeClass);
    };
  }, [settings?.theme]);

  return null;
};

export default ThemeInjector;
