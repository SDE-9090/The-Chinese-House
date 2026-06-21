import React, { useState, useRef, useEffect } from "react";
import { motion, useAnimation } from "framer-motion";
import { Loader2, RefreshCw } from "lucide-react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  pullThreshold?: number;
  maxPull?: number;
}

export function PullToRefresh({
  onRefresh,
  children,
  pullThreshold = 80,
  maxPull = 120,
}: PullToRefreshProps) {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);
  
  const startY = useRef(0);
  const currentY = useRef(0);
  const isAtTop = useRef(true);
  
  const controls = useAnimation();
  const containerRef = useRef<HTMLDivElement>(null);

  // Check if we are at the top of the container before allowing pull
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    isAtTop.current = e.currentTarget.scrollTop <= 0;
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (!isAtTop.current || isRefreshing) return;
    startY.current = e.touches[0].clientY;
    currentY.current = e.touches[0].clientY;
    setIsPulling(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!isPulling || !isAtTop.current || isRefreshing) return;
    
    currentY.current = e.touches[0].clientY;
    const distance = currentY.current - startY.current;
    
    // Only handle pull down, not swipe up
    if (distance > 0) {
      // Prevent default scrolling when pulling
      if (e.cancelable) e.preventDefault();
      
      // Apply some resistance (friction)
      const pullDistance = Math.min(distance * 0.5, maxPull);
      
      setPullProgress(Math.min(pullDistance / pullThreshold, 1));
      
      controls.set({ 
        y: pullDistance,
      });
    }
  };

  const onTouchEnd = async () => {
    if (!isPulling || isRefreshing) return;
    setIsPulling(false);
    
    const distance = currentY.current - startY.current;
    const pullDistance = distance * 0.5;

    if (pullDistance >= pullThreshold) {
      // Trigger refresh
      setIsRefreshing(true);
      controls.start({
        y: pullThreshold * 0.6, // Keep the spinner visible while refreshing
        transition: { type: "spring", bounce: 0, duration: 0.3 }
      });
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullProgress(0);
        controls.start({
          y: 0,
          transition: { type: "spring", bounce: 0, duration: 0.4 }
        });
      }
    } else {
      // Cancel pull
      setPullProgress(0);
      controls.start({
        y: 0,
        transition: { type: "spring", bounce: 0, duration: 0.3 }
      });
    }
  };

  return (
    <div 
      className="relative w-full h-full overflow-hidden"
    >
      {/* Loading Indicator */}
      <motion.div 
        className="absolute top-0 left-0 w-full flex justify-center items-center z-50 pointer-events-none"
        style={{ height: pullThreshold }}
        initial={{ y: -pullThreshold }}
        animate={isRefreshing ? { y: 0 } : controls}
      >
        <div 
          className={`bg-card shadow-lg rounded-full p-2 flex items-center justify-center transition-colors ${
            pullProgress >= 1 ? 'text-primary border border-primary/20' : 'text-muted-foreground border border-border'
          }`}
          style={{
            transform: `scale(${Math.max(0.8, pullProgress)})`,
            opacity: pullProgress > 0 || isRefreshing ? 1 : 0
          }}
        >
          {isRefreshing ? (
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          ) : (
            <RefreshCw 
              className="w-5 h-5 transition-transform duration-100" 
              style={{ transform: `rotate(${pullProgress * 180}deg)` }}
            />
          )}
        </div>
      </motion.div>

      {/* Main Content Area */}
      <motion.div
        ref={containerRef}
        onScroll={handleScroll}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        animate={controls}
        className="w-full h-full overflow-y-auto no-scrollbar relative z-10"
        style={{ touchAction: isPulling ? 'none' : 'auto' }}
      >
        {children}
      </motion.div>
    </div>
  );
}
