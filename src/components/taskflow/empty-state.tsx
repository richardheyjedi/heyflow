import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-2xl border border-border/60 bg-card/40 px-6 py-14 text-center animate-fade-slide-in",
        className
      )}
    >
      <EmptyIllustration />
      <div className="space-y-1.5">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description ? <p className="max-w-xs text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

function EmptyIllustration() {
  return (
    <svg width="120" height="88" viewBox="0 0 120 88" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="empty-grad" x1="0" y1="0" x2="120" y2="88" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7C3AED" />
          <stop offset="1" stopColor="#C084FC" />
        </linearGradient>
      </defs>
      <rect x="14" y="18" width="72" height="54" rx="10" fill="url(#empty-grad)" fillOpacity="0.14" />
      <rect x="14.5" y="18.5" width="71" height="53" rx="9.5" stroke="url(#empty-grad)" strokeOpacity="0.4" />
      <rect x="26" y="32" width="34" height="6" rx="3" fill="url(#empty-grad)" fillOpacity="0.55" />
      <rect x="26" y="44" width="48" height="6" rx="3" fill="url(#empty-grad)" fillOpacity="0.3" />
      <rect x="26" y="56" width="24" height="6" rx="3" fill="url(#empty-grad)" fillOpacity="0.3" />
      <circle cx="94" cy="24" r="16" fill="url(#empty-grad)" fillOpacity="0.18" />
      <path
        d="M87 24.5l4.5 4.5L102 18"
        stroke="url(#empty-grad)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
