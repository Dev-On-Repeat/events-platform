import { cn } from "@/lib/utils";

/**
 * Continuous ticker strip. Content is duplicated once; the CSS
 * marquee animation translates -50% for a seamless loop.
 */
export default function Marquee({
  items,
  className,
  slow = false,
  separator = "▪",
}: {
  items: string[];
  className?: string;
  slow?: boolean;
  separator?: string;
}) {
  const line = (
    <span className="inline-flex shrink-0 items-center">
      {items.map((item, i) => (
        <span key={i} className="inline-flex items-center">
          <span className="whitespace-nowrap">{item}</span>
          <span className="mx-6 opacity-60" aria-hidden>
            {separator}
          </span>
        </span>
      ))}
    </span>
  );

  return (
    <div
      className={cn(
        "overflow-hidden py-2.5 font-terminal text-[11px] uppercase tracking-[0.25em]",
        className
      )}
      aria-hidden
    >
      <div
        className={cn(
          "inline-flex w-max",
          slow ? "animate-marquee-slow" : "animate-marquee"
        )}
      >
        {line}
        {line}
      </div>
    </div>
  );
}
