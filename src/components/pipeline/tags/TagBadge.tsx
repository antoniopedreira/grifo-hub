import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { DealTag } from "./types";

interface TagBadgeProps {
  tag: DealTag;
  size?: "sm" | "md";
  showTooltip?: boolean;
  onRemove?: () => void;
}

export function TagBadge({ tag, size = "sm", showTooltip = true, onRemove }: TagBadgeProps) {
  const badge = (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium border",
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs"
      )}
      style={{
        backgroundColor: `${tag.color}15`,
        borderColor: `${tag.color}40`,
        color: tag.color,
      }}
    >
      <span
        className={cn("rounded-full", size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2")}
        style={{ backgroundColor: tag.color }}
      />
      {tag.name}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 hover:opacity-70"
        >
          ×
        </button>
      )}
    </span>
  );

  if (!showTooltip || !tag.description) {
    return badge;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px]">
          <p className="text-xs">{tag.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
