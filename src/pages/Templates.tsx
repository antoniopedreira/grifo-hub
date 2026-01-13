import { FileText } from "lucide-react";

export default function Templates() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="h-8 w-8 text-secondary" />
        <h1 className="text-3xl font-bold text-primary">Templates</h1>
      </div>
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-muted-foreground">
          Biblioteca de Templates será implementada aqui.
        </p>
      </div>
    </div>
  );
}
