-- Atualiza a função handle_new_sale para criar deals automaticamente
-- se o produto tiver create_deal = true e pipeline_id configurado
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
    v_internal_product_id UUID;
    v_final_product_name TEXT;
    v_create_deal BOOLEAN;
    v_pipeline_id UUID;
    v_first_stage_id UUID;
BEGIN
    -- ===================================================
    -- 1. INTELIGÊNCIA DE PRODUTO
    -- ===================================================
    
    -- Tenta achar pelo ID Externo
    SELECT id, create_deal, pipeline_id INTO v_internal_product_id, v_create_deal, v_pipeline_id
    FROM products 
    WHERE external_id = p_product_external_id 
    LIMIT 1;

    -- Se não achou pelo ID, tenta achar pelo NOME
    IF v_internal_product_id IS NULL THEN
        SELECT id, create_deal, pipeline_id INTO v_internal_product_id, v_create_deal, v_pipeline_id
        FROM products 
        WHERE name ILIKE p_product_name_lastlink 
        LIMIT 1;

        -- Se achou pelo nome, salva o ID Externo para a próxima vez
        IF v_internal_product_id IS NOT NULL THEN
            UPDATE products 
            SET external_id = p_product_external_id 
            WHERE id = v_internal_product_id;
        END IF;
    END IF;

    -- Define o nome do produto para salvar na venda
    IF v_internal_product_id IS NOT NULL THEN
        SELECT name INTO v_final_product_name FROM products WHERE id = v_internal_product_id;
    ELSE
        v_final_product_name := p_product_name_lastlink;
    END IF;

    -- ===================================================
    -- 2. UPSERT DO LEAD
    -- ===================================================
    INSERT INTO leads (full_name, email, phone, status)
    VALUES (p_name, p_email, p_phone, 'Cliente')
    ON CONFLICT (email) DO UPDATE
    SET 
        full_name = EXCLUDED.full_name,
        phone = COALESCE(leads.phone, EXCLUDED.phone),
        status = 'Cliente'
    RETURNING id INTO v_lead_id;

    -- ===================================================
    -- 3. UPSERT DA VENDA
    -- ===================================================
    INSERT INTO sales (
        lead_id, 
        product_id, 
        product_external_id, 
        product_name,
        transaction_id, 
        amount, 
        origin, 
        status, 
        transaction_date
    )
    VALUES (
        v_lead_id, 
        v_internal_product_id, 
        p_product_external_id, 
        v_final_product_name,
        p_transaction_id, 
        p_amount, 
        'lastlink_auto', 
        'paid', 
        NOW()
    )
    ON CONFLICT (transaction_id) DO NOTHING;

    -- ===================================================
    -- 4. CRIAR DEAL SE create_deal = TRUE E pipeline_id CONFIGURADO
    -- ===================================================
    IF COALESCE(v_create_deal, FALSE) = TRUE AND v_pipeline_id IS NOT NULL THEN
        -- Busca a primeira etapa do pipeline configurado
        SELECT id INTO v_first_stage_id
        FROM pipeline_stages
        WHERE pipeline_id = v_pipeline_id
        ORDER BY order_index ASC
        LIMIT 1;

        -- Só cria o deal se encontrou uma etapa válida
        IF v_first_stage_id IS NOT NULL THEN
            INSERT INTO deals (
                lead_id,
                product_id,
                pipeline_id,
                stage_id,
                value,
                status,
                created_at
            )
            VALUES (
                v_lead_id,
                v_internal_product_id,
                v_pipeline_id,
                v_first_stage_id,
                p_amount,
                'open',
                NOW()
            );
        END IF;
    END IF;

    RETURN json_build_object(
        'success', true, 
        'lead_id', v_lead_id, 
        'product_linked', (v_internal_product_id IS NOT NULL),
        'deal_created', (v_create_deal = TRUE AND v_pipeline_id IS NOT NULL AND v_first_stage_id IS NOT NULL)
    );
END;
$function$;