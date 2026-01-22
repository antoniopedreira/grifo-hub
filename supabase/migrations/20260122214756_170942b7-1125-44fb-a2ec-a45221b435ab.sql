-- Corrige registros com 'cliente' minúsculo para 'Cliente' maiúsculo
UPDATE leads
SET status = 'Cliente'
WHERE status = 'cliente';