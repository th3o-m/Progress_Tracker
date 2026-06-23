import { BarChart3 } from "lucide-react";

export function EmptyState({ message = "Enter data in Data Entry to get metrics." }: { message?: string }) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center rounded-md border border-dashed border-border bg-secondary/20 px-6 text-center">
      <BarChart3 className="mb-3 h-8 w-8 text-muted-foreground/50" />
      <p className="text-sm font-semibold text-muted-foreground">{message}</p>
    </div>
  );
}
