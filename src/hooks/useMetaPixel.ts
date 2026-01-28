import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook para injetar o Meta Pixel do Facebook baseado no ID do produto.
 * Busca o meta_pixel_id do produto e inicializa o pixel automaticamente.
 */
export function useMetaPixel(productId: string | undefined) {
  useEffect(() => {
    if (!productId) return;

    const initMetaPixel = async () => {
      try {
        const { data } = await supabase
          .from("products")
          .select("meta_pixel_id")
          .eq("id", productId)
          .single();

        const pixelId = data?.meta_pixel_id;

        if (pixelId) {
          // Verifica se já existe para não duplicar
          if (!document.getElementById(`pixel-${pixelId}`)) {
            console.log(`Inicializando Meta Pixel: ${pixelId}`);

            const script = document.createElement("script");
            script.id = `pixel-${pixelId}`;
            script.innerHTML = `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              
              fbq('init', '${pixelId}'); 
              fbq('track', 'PageView');
            `;
            document.head.appendChild(script);

            const noscript = document.createElement("noscript");
            noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1" />`;
            document.head.appendChild(noscript);
          } else {
            // Se já existir, apenas dispara o PageView novamente
            // @ts-ignore
            if (window.fbq) window.fbq("track", "PageView");
          }
        }
      } catch (error) {
        console.error("Erro ao carregar Meta Pixel:", error);
      }
    };

    initMetaPixel();
  }, [productId]);
}
