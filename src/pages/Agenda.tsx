import { useState } from "react";
import { CalendarDays, LayoutGrid, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { AgendaCalendar } from "@/components/agenda/AgendaCalendar";
import { AgendaKanban } from "@/components/agenda/AgendaKanban";
import { MissionSheet } from "@/components/agenda/MissionSheet";

type ViewMode = "calendar" | "kanban";

export default function Agenda() {
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-8 w-8 text-secondary" />
          <h1 className="text-3xl font-bold text-primary">Agenda Operacional</h1>
        </div>

        <div className="flex items-center gap-3">
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(value) => value && setViewMode(value as ViewMode)}
            className="border rounded-lg"
          >
            <ToggleGroupItem value="kanban" aria-label="Visualização Kanban" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              Kanban
            </ToggleGroupItem>
            <ToggleGroupItem value="calendar" aria-label="Visualização Calendário" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              Calendário
            </ToggleGroupItem>
          </ToggleGroup>

          <Button
            onClick={() => setSheetOpen(true)}
            className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Missão
          </Button>
        </div>
      </div>

      {/* Content */}
      {viewMode === "calendar" ? <AgendaCalendar /> : <AgendaKanban />}

      {/* Mission Sheet */}
      <MissionSheet open={sheetOpen} onOpenChange={setSheetOpen} mission={null} />
    </div>
  );
}
