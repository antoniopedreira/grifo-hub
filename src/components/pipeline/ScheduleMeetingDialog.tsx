import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type TeamMember = Tables<"team_members">;

interface ScheduleMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealId: string;
  dealTitle: string;
  currentDate?: string | null;
  onSuccess: () => void;
}

export function ScheduleMeetingDialog({
  open,
  onOpenChange,
  dealId,
  dealTitle,
  currentDate,
  onSuccess,
}: ScheduleMeetingDialogProps) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [selectedMember, setSelectedMember] = useState<string>("");
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchMembers() {
      const { data } = await supabase
        .from("team_members")
        .select("*")
        .eq("active", true)
        .order("name");
      if (data) setMembers(data);
    }
    if (open) fetchMembers();
  }, [open]);

  useEffect(() => {
    if (currentDate) {
      const d = new Date(currentDate);
      setDate(d.toISOString().split("T")[0]);
      setTime(d.toTimeString().slice(0, 5));
    }
  }, [currentDate]);

  const handleSave = async () => {
    if (!date || !time || !selectedMember) {
      toast.error("Preencha data, hora e responsável");
      return;
    }

    setLoading(true);
    const meetingDateTime = new Date(`${date}T${time}:00`).toISOString();

    try {
      const { error: dealError } = await supabase
        .from("deals")
        .update({ meeting_date: meetingDateTime })
        .eq("id", dealId);

      if (dealError) throw dealError;

      const { error: missionError } = await supabase.from("team_missions").insert({
        mission: `Qualificação: ${dealTitle}`,
        department: "Comercial",
        target_goal: "Reunião de Qualificação",
        owner_id: selectedMember,
        deadline: date,
        status: "Pendente",
      });

      if (missionError) throw missionError;

      toast.success("Qualificação agendada com sucesso!");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao agendar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Agendar Qualificação</DialogTitle>
          <DialogDescription>
            Defina a data e o responsável pela reunião.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Data</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Horário</Label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Responsável</Label>
            <Select value={selectedMember} onValueChange={setSelectedMember}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um membro" />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
