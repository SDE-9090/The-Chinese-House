import { useState } from "react";

interface Props {
  src?: string | null;
  alt: string;
  className?: string;
}

export default function LazyImage({ src, alt, className }: Props) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Skeleton loader */}
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-muted via-muted/60 to-muted animate-pulse" />
      )}

      <img
        src={src || "/placeholder.svg"}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={(e) => {
          e.currentTarget.src = "/placeholder.svg";
          setLoaded(true);
        }}
        className={`${className} transition-opacity duration-500 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}