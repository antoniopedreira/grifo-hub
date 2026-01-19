-- Remove duplicatas mantendo apenas o registro mais antigo de cada combinação
DELETE FROM crm_checklist_items 
WHERE id NOT IN (
  SELECT DISTINCT ON (journey_id, quarter, title, order_index) id 
  FROM crm_checklist_items 
  ORDER BY journey_id, quarter, title, order_index, created_at ASC
);