import { Droppable } from "@hello-pangea/dnd";
import { DealCard } from "./DealCard";
import type { Deal, PipelineStage } from "./types";
import { cn } from "@/lib/utils";

interface KanbanColumnProps {
  stage: PipelineStage;
  deals: Deal[];
  totalValue: number;
  onDealClick: (deal: Deal) => void;
}

const stageTypeStyles: Record<string, {
  headerBg: string;
  headerText: string;
  dotColor: string;
  badgeBg: string;
  badgeText: string;
  dropBg: string;
  animation?: string;
}> = {
  won: {
    headerBg: "bg-emerald-50 border-emerald-200",
    headerText: "text-emerald-700",
    dotColor: "bg-emerald-500",
    badgeBg: "bg-emerald-600",
    badgeText: "text-white",
    dropBg: "bg-emerald-50/50",
    animation: "animate-pulse-slow",
  },
  lost: {
    headerBg: "bg-red-50 border-red-200",
    headerText: "text-red-700",
    dotColor: "bg-red-500",
    badgeBg: "bg-red-600",
    badgeText: "text-white",
    dropBg: "bg-red-50/50",
    animation: "animate-pulse-slow",
  },
  meeting: {
    headerBg: "bg-blue-50 border-blue-200",
    headerText: "text-blue-700",
    dotColor: "bg-blue-500",
    badgeBg: "bg-blue-600",
    badgeText: "text-white",
    dropBg: "bg-blue-50/30",
    animation: "",
  },
  negotiation: {
    headerBg: "bg-amber-50 border-amber-200",
    headerText: "text-amber-700",
    dotColor: "bg-amber-500",
    badgeBg: "bg-amber-600",
    badgeText: "text-white",
    dropBg: "bg-amber-50/30",
    animation: "",
  },
  default: {
    headerBg: "bg-white border-border",
    headerText: "text-foreground",
    dotColor: "",
    badgeBg: "bg-secondary",
    badgeText: "text-secondary-foreground",
    dropBg: "bg-muted/30",
    animation: "",
  },
};

export function KanbanColumn({ stage, deals, totalValue, onDealClick }: KanbanColumnProps) {
  const stageType = stage.type || "default";
  const styles = stageTypeStyles[stageType] || stageTypeStyles.default;
  const hasSpecialType = stageType !== "default";

  return (
    <div className="flex flex-col w-[320px] shrink-0">
      {/* Header da Coluna */}
      <div
        className={cn(
          "flex items-center justify-between px-4 py-3 rounded-xl border mb-3 transition-all duration-300",
          styles.headerBg,
          hasSpecialType && styles.animation
        )}
      >
        <div className="flex items-center gap-2">
          {hasSpecialType && (
            <span className={cn(
              "w-2.5 h-2.5 rounded-full transition-all",
              styles.dotColor
            )} />
          )}
          <h3 className={cn(
            "font-semibold text-sm tracking-wide",
            styles.headerText
          )}>
            {stage.name}
          </h3>
        </div>
        <span
          className={cn(
            "flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full text-xs font-bold transition-all",
            styles.badgeBg,
            styles.badgeText
          )}
        >
          {deals.length}
        </span>
      </div>

      {/* Área de Drop */}
      <Droppable droppableId={stage.id}>
        {(provided, snapshot) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className={cn(
              "flex-1 min-h-[500px] rounded-xl p-3 transition-colors duration-200 space-y-3",
              snapshot.isDraggingOver
                ? "bg-secondary/10 ring-2 ring-secondary/40"
                : styles.dropBg
            )}
          >
            {deals.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex items-center justify-center h-24 border-2 border-dashed border-muted-foreground/20 rounded-lg">
                <p className="text-xs text-muted-foreground">Arraste deals aqui</p>
              </div>
            )}
            {deals.map((deal, index) => (
              <DealCard 
                key={deal.id} 
                deal={deal} 
                index={index} 
                stageType={stageType}
                onClick={() => onDealClick(deal)} 
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
