
-- Corrige a função handle_new_sale para criar deals no pipeline correto
CREATE OR REPLACE FUNCTION public.handle_new_sale(
  p_email text, 
  p_name text, 
  p_phone text, 
  p_product_external_id text, 
  p_product_name_lastlink text, 
  p_amount numeric, 
  p_transaction_id text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_lead_id UUID;
    v_deal_id UUID;
    v_internal_product_id UUID;
    v_final_product_name TEXT;
    v_pipeline_id UUID;
    v_stage_id UUID;
    v_create_deal BOOLEAN;
BEGIN
    -- 1. BUSCA INTELIGENTE DE PRODUTO
    SELECT id, name, pipeline_id, create_deal 
    INTO v_internal_product_id, v_final_product_name, v_pipeline_id, v_create_deal 
    FROM products 
    WHERE external_id = p_product_external_id 
    LIMIT 1;
    
    IF v_internal_product_id IS NULL THEN
        SELECT id, name, pipeline_id, create_deal 
        INTO v_internal_product_id, v_final_product_name, v_pipeline_id, v_create_deal 
        FROM products 
        WHERE name ILIKE p_product_name_lastlink 
        LIMIT 1;
        
        IF v_internal_product_id IS NOT NULL THEN
            UPDATE products SET external_id = p_product_external_id WHERE id = v_internal_product_id;
        END IF;
    END IF;
    
    IF v_final_product_name IS NULL THEN
        v_final_product_name := p_product_name_lastlink;
    END IF;

    -- 2. UPSERT DO LEAD
    INSERT INTO leads (full_name, email, phone, status)
    VALUES (p_name, p_email, p_phone, 'Cliente')
    ON CONFLICT (email) DO UPDATE
    SET full_name = EXCLUDED.full_name, phone = COALESCE(leads.phone, EXCLUDED.phone), status = 'Cliente'
    RETURNING id INTO v_lead_id;

    -- 3. BUSCA O PRIMEIRO STAGE DO PIPELINE "GANHO" OU O PRIMEIRO STAGE
    IF v_pipeline_id IS NOT NULL AND v_create_deal IS TRUE THEN
        -- Tenta achar o stage "Ganho"
        SELECT id INTO v_stage_id 
        FROM pipeline_stages 
        WHERE pipeline_id = v_pipeline_id AND LOWER(name) = 'ganho' 
        LIMIT 1;
        
        -- Se não achou, pega o primeiro stage
        IF v_stage_id IS NULL THEN
            SELECT id INTO v_stage_id 
            FROM pipeline_stages 
            WHERE pipeline_id = v_pipeline_id 
            ORDER BY order_index ASC 
            LIMIT 1;
        END IF;
    END IF;

    -- 4. CRIA O DEAL COM PIPELINE E STAGE CORRETOS
    INSERT INTO deals (title, status, lead_id, product_id, value, pipeline_id, stage_id, created_at)
    VALUES (
        'Venda: ' || v_final_product_name, 
        'won', 
        v_lead_id,
        v_internal_product_id,
        p_amount,
        v_pipeline_id,  -- Agora insere o pipeline correto
        v_stage_id,     -- Agora insere o stage correto
        NOW()
    )
    RETURNING id INTO v_deal_id;

    -- 5. INSERE A VENDA
    INSERT INTO sales (lead_id, deal_id, product_id, product_external_id, product_name, transaction_id, amount, origin, status, transaction_date)
    VALUES (v_lead_id, v_deal_id, v_internal_product_id, p_product_external_id, v_final_product_name, p_transaction_id, p_amount, 'lastlink_auto', 'paid', NOW())
    ON CONFLICT (transaction_id) DO NOTHING;

    RETURN json_build_object('success', true, 'lead_id', v_lead_id, 'deal_id', v_deal_id);
END;
$function$;

-- Corrige o deal existente do João Henrique que ficou sem pipeline
UPDATE deals 
SET 
  pipeline_id = 'c92d07fb-5ffe-4706-8a6a-4ff62141f90d',
  stage_id = (
    SELECT id FROM pipeline_stages 
    WHERE pipeline_id = 'c92d07fb-5ffe-4706-8a6a-4ff62141f90d' 
      AND LOWER(name) = 'ganho' 
    LIMIT 1
  )
WHERE id = '34823935-9f65-462c-b50e-e2d088e42142';
