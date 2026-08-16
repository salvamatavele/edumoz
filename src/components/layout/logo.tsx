import { cn } from "@/lib/cn";

/**
 * EduMoz mark: an open book whose pages rise like a chart — the product turns
 * school records into readable progress.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        viewBox="0 0 32 32"
        aria-hidden="true"
        className="size-8 shrink-0"
        fill="none"
      >
        <rect width="32" height="32" rx="9" className="fill-primary" />
        <path
          d="M7 21.5V11.2c0-.5.5-.9 1-.7l6.6 2.3c.3.1.4.3.4.6v9.1c0 .5-.5.9-1 .7L7.4 21c-.2-.1-.4-.3-.4-.6Z"
          className="fill-on-primary"
          opacity="0.55"
        />
        <path
          d="M25 21.5V11.2c0-.5-.5-.9-1-.7l-6.6 2.3c-.3.1-.4.3-.4.6v9.1c0 .5.5.9 1 .7l6.6-2.1c.2-.1.4-.3.4-.6Z"
          className="fill-on-primary"
        />
        <path
          d="m19 19.5 2-2.6 2 1.3"
          className="stroke-accent"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="font-heading text-xl font-semibold tracking-tight text-foreground">
        Edu<span className="text-primary">Moz</span>
      </span>
    </span>
  );
}
