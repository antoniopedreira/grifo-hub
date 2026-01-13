import { Users } from "lucide-react";

export default function Leads() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-8 w-8 text-secondary" />
        <h1 className="text-3xl font-bold text-primary">Leads</h1>
      </div>
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-muted-foreground">
          Gestão de Leads será implementada aqui.
        </p>
      </div>
    </div>
  );
}
