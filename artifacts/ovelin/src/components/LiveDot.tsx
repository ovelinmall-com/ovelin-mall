import { cn } from "@/lib/utils";

export function LiveDot({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex", className)}>
      <span className="absolute inset-0 rounded-full bg-pink-500 animate-ping opacity-75" />
      <span className="relative w-2 h-2 rounded-full bg-pink-500" />
    </span>
  );
}

export function LivePill({ label = "مباشر" }: { label?: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-white border border-pink-200 px-2 py-0.5 text-[10px] font-bold text-pink-700">
      <LiveDot />
      {label}
    </div>
  );
}
