import { Droppable } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";
import { DealCard } from "./DealCard";
import type { KanbanColumn as KanbanColumnType, Deal } from "./types";

interface KanbanColumnProps {
  column: KanbanColumnType;
  onDealClick: (deal: Deal) => void;
}

export function KanbanColumn({ column, onDealClick }: KanbanColumnProps) {
  const isWonColumn = column.stage.name.toLowerCase() === "ganho" || 
                      column.stage.name.toLowerCase() === "won";
  
  return (
    <div className="flex flex-col min-w-[300px] max-w-[300px]">
      {/* Column Header */}
      <div
        className={cn(
          "flex items-center justify-between rounded-t-xl px-4 py-3",
          isWonColumn 
            ? "bg-secondary/10 border-b-2 border-secondary" 
            : "bg-card border-b border-border"
        )}
      >
        <div className="flex items-center gap-2">
          {isWonColumn && (
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
          )}
          <h3 className={cn(
            "font-semibold text-sm",
            isWonColumn ? "text-secondary" : "text-foreground"
          )}>
            {column.stage.name}
          </h3>
        </div>
        <span className={cn(
          "flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold min-w-[24px]",
          isWonColumn 
            ? "bg-secondary text-secondary-foreground" 
            : "bg-muted text-muted-foreground"
        )}>
          {column.deals.length}
        </span>
      </div>

      {/* Droppable Area */}
      <Droppable droppableId={column.stage.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex-1 rounded-b-xl border border-t-0 p-3 space-y-3 min-h-[450px] transition-all duration-200",
              snapshot.isDraggingOver 
                ? "bg-secondary/5 border-secondary/30 ring-2 ring-secondary/20" 
                : "bg-grifo-kanban-column border-border"
            )}
          >
            {column.deals.map((deal, index) => (
              <DealCard
                key={deal.id}
                deal={deal}
                index={index}
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
