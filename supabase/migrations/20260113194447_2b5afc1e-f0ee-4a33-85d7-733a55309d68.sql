INSERT INTO public.settings (key, value) VALUES ('webhook_lastlink', 'https://api.grifo.academy/webhook/lastlink')
ON CONFLICT (key) DO NOTHING;