import { Draggable } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";
import type { Deal } from "./types";

interface DealCardProps {
  deal: Deal;
  index: number;
  onClick: () => void;
}

const priorityConfig: Record<string, { label: string; className: string }> = {
  High: { label: "Alta", className: "bg-red-100 text-red-700 border-red-200" },
  Medium: { label: "Média", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  Low: { label: "Baixa", className: "bg-green-100 text-green-700 border-green-200" },
};

export function DealCard({ deal, index, onClick }: DealCardProps) {
  const priority = deal.priority || "Medium";
  const config = priorityConfig[priority] || priorityConfig.Medium;

  const formattedValue = deal.value
    ? new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(deal.value)
    : "—";

  return (
    <Draggable draggableId={deal.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={cn(
            "rounded-lg border bg-white p-3 shadow-sm transition-all cursor-pointer",
            "hover:border-secondary hover:shadow-md",
            snapshot.isDragging && "shadow-lg ring-2 ring-secondary/30"
          )}
        >
          <div className="space-y-2">
            {/* Lead Name */}
            <p className="font-semibold text-primary truncate">
              {deal.lead?.full_name || "Lead desconhecido"}
            </p>

            {/* Product Name */}
            <p className="text-sm text-muted-foreground truncate">
              {deal.product?.name || "Sem produto"}
            </p>

            {/* Value and Priority */}
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-secondary">{formattedValue}</span>
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                  config.className
                )}
              >
                {config.label}
              </span>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
