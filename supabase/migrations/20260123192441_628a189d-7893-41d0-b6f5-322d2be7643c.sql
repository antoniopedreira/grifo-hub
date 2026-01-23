-- 1. Adicionar novo tipo de template ao ENUM
ALTER TYPE template_type ADD VALUE IF NOT EXISTS 'nps_form';

-- 2. Adicionar coluna template_id em nps_forms
ALTER TABLE nps_forms 
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES page_templates(id);