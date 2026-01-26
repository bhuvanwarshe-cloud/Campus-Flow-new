import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "brand2" | "ai";
  icon?: React.ReactNode;
}) {
  return (
    <Card className={cn("relative overflow-hidden", tone === "ai" && "border-ai/25", tone === "brand2" && "border-brand2/25")}>
      <CardContent className="p-5">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}

        {tone !== "default" && (
          <div
            className={cn(
              "pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full blur-2xl",
              tone === "ai" && "bg-ai/20",
              tone === "brand2" && "bg-brand2/20",
            )}
          />
        )}
      </CardContent>
    </Card>
  );
}
