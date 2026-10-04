import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mobigest-skeleton-shimmer rounded-md bg-slate-100", className)} {...props} />;
}

export { Skeleton };
