"use client";

import { Mic } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "../../lib/utils";

interface AIVoiceInputProps {
  onStart?: () => void;
  onStop?: (duration: number) => void;
  visualizerBars?: number;
  demoMode?: boolean;
  demoInterval?: number;
  className?: string;
}

export function AIVoiceInput({
  onStart,
  onStop,
  visualizerBars = 48,
  demoMode = false,
  demoInterval = 3000,
  className
}: AIVoiceInputProps) {
  const [submitted, setSubmitted] = useState(false);
  const [time, setTime] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const [isDemo, setIsDemo] = useState(demoMode);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    let intervalId: number;

    if (submitted) {
      onStart?.();
      intervalId = setInterval(() => {
        setTime((t) => t + 1);
      }, 1000);
    } else {
      onStop?.(time);
      setTime(0);
    }

    return () => clearInterval(intervalId);
  }, [submitted, time, onStart, onStop]);

  useEffect(() => {
    if (!isDemo) return;

    let timeoutId: number;
    const runAnimation = () => {
      setSubmitted(true);
      timeoutId = setTimeout(() => {
        setSubmitted(false);
        timeoutId = setTimeout(runAnimation, 1000);
      }, demoInterval);
    };

    const initialTimeout = setTimeout(runAnimation, 100);
    return () => {
      clearTimeout(timeoutId);
      clearTimeout(initialTimeout);
    };
  }, [isDemo, demoInterval]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleClick = () => {
    if (isDemo) {
      setIsDemo(false);
      setSubmitted(false);
    } else {
      setSubmitted((prev) => !prev);
    }
  };

  return (
    <div className={cn("w-full py-4", className)}>
      <div className="relative max-w-xl w-full mx-auto flex items-center flex-col gap-2">
        <button
          className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center transition-colors border-2 cursor-pointer",
            submitted
              ? "bg-oasis-blue border-oasis-blue animate-pulse"
              : "border-oasis-blue"
          )}
          type="button"
          onClick={handleClick}
          title={submitted ? "Stop recording" : "Start recording"}
        >
          <Mic
            className={submitted ? "w-6 h-6 text-white" : "w-6 h-6 text-oasis-blue"}
          />
        </button>

        <span
          className={cn(
            "font-mono text-sm transition-opacity duration-300",
            submitted
              ? "text-foreground"
              : "text-muted-foreground"
          )}
        >
          {formatTime(time)}
        </span>

        <div className="h-4 w-64 flex items-center justify-center gap-0.5">
          {[...Array(visualizerBars)].map((_, i) => {
            const height = submitted && isClient ? 20 + Math.random() * 80 : 25;
            const delay = i * 0.05;
            return (
              <div
                key={i}
                className={cn(
                  "w-0.5 rounded-full transition-all duration-300",
                  submitted
                    ? "bg-primary/50 animate-pulse"
                    : "bg-secondary h-1"
                )}
                {...(submitted && isClient && {
                  style: {
                    '--bar-height': `${height}%`,
                    '--animation-delay': `${delay}s`,
                    height: `var(--bar-height)`,
                    animationDelay: `var(--animation-delay)`
                  } as React.CSSProperties
                })}
              />
            );
          })}
        </div>
        
        <div className="h-4"></div>
      </div>
    </div>
  );
}
