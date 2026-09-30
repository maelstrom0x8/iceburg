import { MotionConfig } from "motion/react";
import { HeroCarousel } from "../features/marketing/components/HeroCarousel";

export function Home() {
  return (
    <MotionConfig reducedMotion="user">
      <main>
        <HeroCarousel />
      </main>
    </MotionConfig>
  );
}
