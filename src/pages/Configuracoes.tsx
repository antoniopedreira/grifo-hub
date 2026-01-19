import { useState } from "react";
import { Settings, Users, GitBranch, ListTodo } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GeneralSettings } from "@/components/settings/GeneralSettings";
import { TeamMembersList } from "@/components/settings/TeamMembersList";
import { PipelineList } from "@/components/settings/PipelineList";
import { CrmSettings } from "@/components/settings/CrmSettings"; // Importamos o novo componente

export default function Configuracoes() {
  const [activeTab, setActiveTab] = useState("geral");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-8 w-8 text-secondary" />
        <h1 className="text-3xl font-bold text-primary">Configurações</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="geral" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Geral
          </TabsTrigger>
          <TabsTrigger value="equipe" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Equipe
          </TabsTrigger>
          <TabsTrigger value="pipelines" className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Pipelines (Vendas)
          </TabsTrigger>
          {/* Nova Aba CRM */}
          <TabsTrigger value="crm" className="flex items-center gap-2">
            <ListTodo className="h-4 w-4" />
            Checklists CRM
          </TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="space-y-4">
          <GeneralSettings />
        </TabsContent>

        <TabsContent value="equipe" className="space-y-4">
          <TeamMembersList />
        </TabsContent>

        <TabsContent value="pipelines" className="space-y-4">
          <PipelineList />
        </TabsContent>

        {/* Conteúdo da Aba CRM */}
        <TabsContent value="crm" className="space-y-4">
          <CrmSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
