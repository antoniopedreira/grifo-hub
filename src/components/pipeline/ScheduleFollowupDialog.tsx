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
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ScheduleFollowupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealId: string;
  dealTitle: string;
  leadName?: string;
  currentDate?: string | null;
  onSuccess: () => void;
}

export function ScheduleFollowupDialog({
  open,
  onOpenChange,
  dealId,
  dealTitle,
  leadName,
  currentDate,
  onSuccess,
}: ScheduleFollowupDialogProps) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentDate) {
      const d = new Date(currentDate);
      setDate(d.toISOString().split("T")[0]);
      setTime(d.toTimeString().slice(0, 5));
    } else {
      // Reset when opening without current date
      setDate("");
      setTime("");
    }
  }, [currentDate, open]);

  const handleSave = async () => {
    if (!date || !time) {
      toast.error("Preencha data e horário do follow-up");
      return;
    }

    setLoading(true);
    // Salva como timestamp literal SEM conversão UTC para preservar o horário local
    const followupDateTime = `${date}T${time}:00`;

    try {
      // Atualiza o deal com followup_date
      const { error: dealError } = await supabase
        .from("deals")
        .update({ followup_date: followupDateTime })
        .eq("id", dealId);

      if (dealError) throw dealError;

      // Registra nota automática no deal
      const formattedDate = new Date(date + "T00:00:00").toLocaleDateString("pt-BR");
      const noteContent = `🔄 Follow-up agendado para ${formattedDate} às ${time}`;
      
      await supabase.from("deal_comments").insert({
        deal_id: dealId,
        content: noteContent,
      });

      toast.success("Follow-up agendado com sucesso!");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao agendar follow-up");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Agendar Follow-up</DialogTitle>
          <DialogDescription>
            Defina a data e horário para o follow-up com {leadName || dealTitle}.
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
