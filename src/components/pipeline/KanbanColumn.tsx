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
    <div className="flex flex-col min-w-[280px] max-w-[280px]">
      {/* Column Header */}
      <div
        className={cn(
          "flex items-center justify-between rounded-t-lg px-3 py-2 border-b",
          isWonColumn 
            ? "bg-green-50 border-green-200" 
            : "bg-white border-border"
        )}
      >
        <h3 className="font-semibold text-primary truncate">{column.stage.name}</h3>
        <span className="flex items-center justify-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
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
              "flex-1 rounded-b-lg border border-t-0 p-2 space-y-2 min-h-[400px] transition-colors",
              snapshot.isDraggingOver 
                ? "bg-secondary/5 border-secondary" 
                : "bg-white border-border"
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
