import { useEffect, useRef, useState } from "react";
import { animate, useInView } from "motion/react";

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function useCountUp(target: number) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const [value, setValue] = useState(prefersReducedMotion() ? target : 0);

  useEffect(() => {
    if (!inView || prefersReducedMotion()) return;
    const controls = animate(0, target, {
      duration: 1.1,
      ease: "easeOut",
      onUpdate: (v) => setValue(v),
    });
    return () => controls.stop();
  }, [inView, target]);

  return { ref, value };
}

export function StatTile({
  value,
  prefix = "",
  suffix = "",
  label,
  dark = false,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  label: string;
  dark?: boolean;
}) {
  const { ref, value: animated } = useCountUp(value);
  const displayed = Math.round(animated).toLocaleString("en-US");

  return (
    <div className="text-center sm:text-left">
      <div
        className="text-4xl sm:text-5xl font-semibold tabular-nums"
        style={{ color: dark ? "#f0f2f5" : "var(--color-app-text)" }}
      >
        {prefix}
        <span ref={ref}>{displayed}</span>
        {suffix}
      </div>
      <div
        className="text-xs sm:text-sm mt-1.5"
        style={{ color: dark ? "rgba(255,255,255,0.5)" : "var(--color-app-muted)" }}
      >
        {label}
      </div>
    </div>
  );
}
