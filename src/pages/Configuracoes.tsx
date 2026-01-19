import { useState } from "react";
import { Settings, GitBranch, Users, Sliders, ListTodo } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PipelineList } from "@/components/settings/PipelineList";
import { PipelineStageEditor } from "@/components/settings/PipelineStageEditor";
import { TeamMembersList } from "@/components/settings/TeamMembersList";
import { GeneralSettings } from "@/components/settings/GeneralSettings";
import { CrmSettings } from "@/components/settings/CrmSettings"; // Importação do componente CRM

interface Pipeline {
  id: string;
  name: string;
  archived?: boolean;
}

export default function Configuracoes() {
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Settings className="h-8 w-8 text-secondary" />
        <h1 className="text-3xl font-bold text-primary">Configurações</h1>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="geral" className="space-y-6">
        {/* Ajustado grid-cols para 4 para acomodar a nova aba */}
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="geral" className="gap-2">
            <Sliders className="h-4 w-4" />
            Geral
          </TabsTrigger>
          <TabsTrigger value="pipelines" className="gap-2">
            <GitBranch className="h-4 w-4" />
            Pipelines
          </TabsTrigger>
          <TabsTrigger value="equipe" className="gap-2">
            <Users className="h-4 w-4" />
            Equipe
          </TabsTrigger>
          <TabsTrigger value="crm" className="gap-2">
            <ListTodo className="h-4 w-4" />
            Checklists CRM
          </TabsTrigger>
        </TabsList>

        {/* Tab: Geral */}
        <TabsContent value="geral">
          <GeneralSettings />
        </TabsContent>

        {/* Tab: Pipelines */}
        <TabsContent value="pipelines">
          {selectedPipeline ? (
            <PipelineStageEditor pipeline={selectedPipeline} onBack={() => setSelectedPipeline(null)} />
          ) : (
            <PipelineList onSelectPipeline={setSelectedPipeline} />
          )}
        </TabsContent>

        {/* Tab: Equipe */}
        <TabsContent value="equipe">
          <TeamMembersList />
        </TabsContent>

        {/* Tab: CRM (Nova aba) */}
        <TabsContent value="crm">
          <CrmSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
