import { Droppable } from "@hello-pangea/dnd";
import { DealCard } from "./DealCard";
import type { Deal, PipelineStage } from "./types";
import { Badge } from "@/components/ui/badge";

interface KanbanColumnProps {
  stage: PipelineStage;
  deals: Deal[];
  totalValue: number;
  onDealClick: (deal: Deal) => void;
}

export function KanbanColumn({ stage, deals, totalValue, onDealClick }: KanbanColumnProps) {
  return (
    <div className="flex flex-col w-80 shrink-0">
      {/* Header da Coluna */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm text-foreground/80 uppercase tracking-wide">{stage.name}</h3>
          <Badge variant="secondary" className="text-[10px] px-1.5 h-5">
            {deals.length}
          </Badge>
        </div>
        {totalValue > 0 && (
          <span className="text-xs font-medium text-muted-foreground">
            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalValue)}
          </span>
        )}
      </div>

      {/* Área de Drop */}
      <Droppable droppableId={stage.id}>
        {(provided, snapshot) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className={`
              flex-1 min-h-[150px] rounded-lg p-2 transition-colors
              ${snapshot.isDraggingOver ? "bg-accent/50 ring-2 ring-primary/20" : "bg-muted/30"}
            `}
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
