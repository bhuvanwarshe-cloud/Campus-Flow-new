import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import campusflowLogo from "@/assets/campusflow-logo.png";

type Props = {
  className?: string;
  showWordmark?: boolean;
  size?: "sm" | "md";
};

export function CampusLogo({ className, showWordmark = true, size = "md" }: Props) {
  const iconSize = size === "sm" ? "h-8 w-8" : "h-9 w-9";

  return (
    <Link
      to="/dashboard"
      className={cn(
        "inline-flex items-center gap-2 hover:opacity-80 transition-opacity",
        className
      )}
      aria-label="CampusFlow Home"
    >
      <span className={cn("grid place-items-center rounded-lg bg-primary/10 p-1", iconSize)}>
        <img
          src={campusflowLogo}
          alt="CampusFlow logo"
          className="h-full w-full object-contain"
          loading="eager"
          decoding="async"
        />
      </span>
      {showWordmark && <span className="text-sm font-semibold tracking-tight">CampusFlow</span>}
    </Link>
  );
}
