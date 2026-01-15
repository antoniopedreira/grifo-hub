export interface Deal {
  id: string;
  title: string; // Adicionado
  value: number;
  company_name?: string; // Adicionado (opcional)
  status: "open" | "won" | "lost" | "abandoned" | "archived";
  created_at: string;
  pipeline_id?: string;
  stage_id: string; // Atenção: no banco pode ser stage_id ou pipeline_stage_id. Vamos padronizar.
  pipeline_stage_id?: string; // Adicionado para compatibilidade
  order_index?: number; // Adicionado
  meeting_date?: string; // Adicionado
  lead_id?: string;
  product_id?: string;
  description?: string;
}

export interface PipelineStage {
  id: string;
  name: string;
  pipeline_id: string;
  order_index: number;
  type?: "default" | "meeting" | "won" | "lost";
}

export interface Pipeline {
  id: string;
  name: string;
  created_at: string;
  active: boolean;
}
