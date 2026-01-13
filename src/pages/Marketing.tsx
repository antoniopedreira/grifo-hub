import { Megaphone } from "lucide-react";

export default function Marketing() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Megaphone className="h-8 w-8 text-secondary" />
        <h1 className="text-3xl font-bold text-primary">Marketing</h1>
      </div>
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-muted-foreground">
          Ferramentas de Marketing serão implementadas aqui.
        </p>
      </div>
    </div>
  );
}
