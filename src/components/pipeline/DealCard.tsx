import { Draggable } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, Clock, User } from "lucide-react";
import type { Deal } from "./types";

interface DealCardProps {
  deal: Deal;
  index: number;
  stageType?: string;
  onClick: () => void;
}

const priorityConfig: Record<string, { label: string; className: string }> = {
  High: { label: "Alta", className: "bg-red-50 text-red-600 border-red-200" },
  Medium: { label: "Média", className: "bg-amber-50 text-amber-600 border-amber-200" },
  Low: { label: "Baixa", className: "bg-emerald-50 text-emerald-600 border-emerald-200" },
};

export function DealCard({ deal, index, stageType, onClick }: DealCardProps) {
  const priority = deal.priority || "Medium";
  const config = priorityConfig[priority] || priorityConfig.Medium;
  const isMeetingStage = stageType === "meeting";

  const formattedValue = deal.value
    ? new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(deal.value)
    : "—";

  // Parse meeting date preservando horário local
  const meetingInfo = deal.meeting_date
    ? (() => {
        const dateStr = deal.meeting_date.includes("T") 
          ? deal.meeting_date 
          : `${deal.meeting_date}T00:00:00`;
        const date = parseISO(dateStr);
        return {
          date: format(date, "dd/MM", { locale: ptBR }),
          time: format(date, "HH:mm"),
        };
      })()
    : null;

  return (
    <Draggable draggableId={deal.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          style={{
            ...provided.draggableProps.style,
            // Remove transition during drag to prevent jerky movement
            transition: snapshot.isDragging 
              ? undefined 
              : 'box-shadow 0.2s ease, border-color 0.2s ease, transform 0.15s ease',
          }}
          className={cn(
            "rounded-xl border border-border bg-card p-4 shadow-card cursor-pointer",
            "hover:border-secondary/50 hover:shadow-card-hover",
            snapshot.isDragging && "shadow-soft-lg ring-2 ring-secondary/40 rotate-1 scale-[1.02]"
          )}
        >
          <div className="space-y-3">
            {/* Lead Name */}
            <p className="font-semibold text-foreground truncate text-sm">
              {deal.lead?.full_name || "Lead desconhecido"}
            </p>

            {/* Product Name */}
            <p className="text-sm text-muted-foreground truncate">
              {deal.product?.name || "Sem produto"}
            </p>

            {/* Meeting Info Badges - Only in meeting stage */}
            {isMeetingStage && (meetingInfo || deal.meeting_owner) && (
              <div className="flex flex-wrap items-center gap-1.5">
                {meetingInfo && (
                  <>
                    <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-200 px-1.5 py-0.5 text-xs font-medium text-blue-700">
                      <CalendarDays className="h-3 w-3" />
                      {meetingInfo.date}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-200 px-1.5 py-0.5 text-xs font-medium text-blue-700">
                      <Clock className="h-3 w-3" />
                      {meetingInfo.time}
                    </span>
                  </>
                )}
                {deal.meeting_owner && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 border border-purple-200 px-1.5 py-0.5 text-xs font-medium text-purple-700">
                    <User className="h-3 w-3" />
                    {deal.meeting_owner.name.split(" ")[0]}
                  </span>
                )}
              </div>
            )}

            {/* Value and Priority */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="font-bold text-secondary text-base">{formattedValue}</span>
              <span
                className={cn(
                  "inline-flex items-center rounded-lg border px-2 py-1 text-xs font-semibold",
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
