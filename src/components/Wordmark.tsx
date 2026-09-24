import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * HACKB4 wordmark — pure typography, no glyphs.
 * The "4" carries the acid accent.
 */
export default function Wordmark({
  className,
  href = "/",
  size = "md",
}: {
  className?: string;
  href?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const sizes = {
    sm: "text-lg tracking-[0.08em]",
    md: "text-2xl tracking-[0.06em]",
    lg: "text-5xl tracking-[0.04em]",
    xl: "text-[clamp(4rem,14vw,12rem)] tracking-[0.02em]",
  } as const;

  const mark = (
    <span
      className={cn(
        "font-display uppercase leading-none select-none",
        sizes[size],
        className
      )}
    >
      HackB<span className="text-acid">4</span>
    </span>
  );

  if (!href) return mark;

  return (
    <Link href={href} aria-label="HackB4 home" className="inline-block">
      {mark}
    </Link>
  );
}
