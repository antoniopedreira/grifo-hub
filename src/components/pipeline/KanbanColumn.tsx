import { Droppable } from "@hello-pangea/dnd";
import { DealCard } from "./DealCard";
import type { Deal, PipelineStage } from "./types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface KanbanColumnProps {
  stage: PipelineStage;
  deals: Deal[];
  totalValue: number;
  onDealClick: (deal: Deal) => void;
}

const stageTypeConfig: Record<string, { bgClass: string; dotClass: string }> = {
  won: { bgClass: "bg-amber-50", dotClass: "bg-secondary" },
  lost: { bgClass: "bg-red-50", dotClass: "bg-red-500" },
  meeting: { bgClass: "bg-blue-50", dotClass: "bg-blue-500" },
  default: { bgClass: "bg-muted/30", dotClass: "" },
};

export function KanbanColumn({ stage, deals, totalValue, onDealClick }: KanbanColumnProps) {
  const config = stageTypeConfig[stage.type || "default"] || stageTypeConfig.default;
  const hasSpecialType = stage.type && stage.type !== "default";

  return (
    <div className="flex flex-col w-80 shrink-0">
      {/* Header da Coluna */}
      <div className={cn(
        "flex items-center justify-between mb-2 px-3 py-2 rounded-lg",
        hasSpecialType ? config.bgClass : "bg-transparent"
      )}>
        <div className="flex items-center gap-2">
          {hasSpecialType && (
            <span className={cn("w-2 h-2 rounded-full", config.dotClass)} />
          )}
          <h3 className="font-semibold text-sm text-foreground uppercase tracking-wide">
            {stage.name}
          </h3>
          <Badge variant="secondary" className="text-xs px-2 h-5 rounded-full bg-secondary text-secondary-foreground">
            {deals.length}
          </Badge>
        </div>
      </div>

      {/* Área de Drop */}
      <Droppable droppableId={stage.id}>
        {(provided, snapshot) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className={cn(
              "flex-1 min-h-[400px] rounded-xl p-3 transition-all space-y-3",
              snapshot.isDraggingOver
                ? "bg-secondary/10 ring-2 ring-secondary/30"
                : "bg-muted/40"
            )}
          >
            {deals.map((deal, index) => (
              <DealCard key={deal.id} deal={deal} index={index} onClick={() => onDealClick(deal)} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
