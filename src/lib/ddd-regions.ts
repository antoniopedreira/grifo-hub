// Mapeamento completo de DDDs brasileiros para Estado e Região

export interface RegionInfo {
  state: string;
  stateName: string;
  region: string;
}

export const DDD_TO_REGION: Record<string, RegionInfo> = {
  // São Paulo
  "11": { state: "SP", stateName: "São Paulo", region: "Sudeste" },
  "12": { state: "SP", stateName: "São Paulo", region: "Sudeste" },
  "13": { state: "SP", stateName: "São Paulo", region: "Sudeste" },
  "14": { state: "SP", stateName: "São Paulo", region: "Sudeste" },
  "15": { state: "SP", stateName: "São Paulo", region: "Sudeste" },
  "16": { state: "SP", stateName: "São Paulo", region: "Sudeste" },
  "17": { state: "SP", stateName: "São Paulo", region: "Sudeste" },
  "18": { state: "SP", stateName: "São Paulo", region: "Sudeste" },
  "19": { state: "SP", stateName: "São Paulo", region: "Sudeste" },

  // Rio de Janeiro
  "21": { state: "RJ", stateName: "Rio de Janeiro", region: "Sudeste" },
  "22": { state: "RJ", stateName: "Rio de Janeiro", region: "Sudeste" },
  "24": { state: "RJ", stateName: "Rio de Janeiro", region: "Sudeste" },

  // Espírito Santo
  "27": { state: "ES", stateName: "Espírito Santo", region: "Sudeste" },
  "28": { state: "ES", stateName: "Espírito Santo", region: "Sudeste" },

  // Minas Gerais
  "31": { state: "MG", stateName: "Minas Gerais", region: "Sudeste" },
  "32": { state: "MG", stateName: "Minas Gerais", region: "Sudeste" },
  "33": { state: "MG", stateName: "Minas Gerais", region: "Sudeste" },
  "34": { state: "MG", stateName: "Minas Gerais", region: "Sudeste" },
  "35": { state: "MG", stateName: "Minas Gerais", region: "Sudeste" },
  "37": { state: "MG", stateName: "Minas Gerais", region: "Sudeste" },
  "38": { state: "MG", stateName: "Minas Gerais", region: "Sudeste" },

  // Paraná
  "41": { state: "PR", stateName: "Paraná", region: "Sul" },
  "42": { state: "PR", stateName: "Paraná", region: "Sul" },
  "43": { state: "PR", stateName: "Paraná", region: "Sul" },
  "44": { state: "PR", stateName: "Paraná", region: "Sul" },
  "45": { state: "PR", stateName: "Paraná", region: "Sul" },
  "46": { state: "PR", stateName: "Paraná", region: "Sul" },

  // Santa Catarina
  "47": { state: "SC", stateName: "Santa Catarina", region: "Sul" },
  "48": { state: "SC", stateName: "Santa Catarina", region: "Sul" },
  "49": { state: "SC", stateName: "Santa Catarina", region: "Sul" },

  // Rio Grande do Sul
  "51": { state: "RS", stateName: "Rio Grande do Sul", region: "Sul" },
  "53": { state: "RS", stateName: "Rio Grande do Sul", region: "Sul" },
  "54": { state: "RS", stateName: "Rio Grande do Sul", region: "Sul" },
  "55": { state: "RS", stateName: "Rio Grande do Sul", region: "Sul" },

  // Distrito Federal
  "61": { state: "DF", stateName: "Distrito Federal", region: "Centro-Oeste" },

  // Goiás
  "62": { state: "GO", stateName: "Goiás", region: "Centro-Oeste" },
  "64": { state: "GO", stateName: "Goiás", region: "Centro-Oeste" },

  // Tocantins
  "63": { state: "TO", stateName: "Tocantins", region: "Norte" },

  // Mato Grosso
  "65": { state: "MT", stateName: "Mato Grosso", region: "Centro-Oeste" },
  "66": { state: "MT", stateName: "Mato Grosso", region: "Centro-Oeste" },

  // Mato Grosso do Sul
  "67": { state: "MS", stateName: "Mato Grosso do Sul", region: "Centro-Oeste" },

  // Acre
  "68": { state: "AC", stateName: "Acre", region: "Norte" },

  // Rondônia
  "69": { state: "RO", stateName: "Rondônia", region: "Norte" },

  // Bahia
  "71": { state: "BA", stateName: "Bahia", region: "Nordeste" },
  "73": { state: "BA", stateName: "Bahia", region: "Nordeste" },
  "74": { state: "BA", stateName: "Bahia", region: "Nordeste" },
  "75": { state: "BA", stateName: "Bahia", region: "Nordeste" },
  "77": { state: "BA", stateName: "Bahia", region: "Nordeste" },

  // Sergipe
  "79": { state: "SE", stateName: "Sergipe", region: "Nordeste" },

  // Pernambuco
  "81": { state: "PE", stateName: "Pernambuco", region: "Nordeste" },
  "87": { state: "PE", stateName: "Pernambuco", region: "Nordeste" },

  // Alagoas
  "82": { state: "AL", stateName: "Alagoas", region: "Nordeste" },

  // Paraíba
  "83": { state: "PB", stateName: "Paraíba", region: "Nordeste" },

  // Rio Grande do Norte
  "84": { state: "RN", stateName: "Rio Grande do Norte", region: "Nordeste" },

  // Ceará
  "85": { state: "CE", stateName: "Ceará", region: "Nordeste" },
  "88": { state: "CE", stateName: "Ceará", region: "Nordeste" },

  // Piauí
  "86": { state: "PI", stateName: "Piauí", region: "Nordeste" },
  "89": { state: "PI", stateName: "Piauí", region: "Nordeste" },

  // Maranhão
  "98": { state: "MA", stateName: "Maranhão", region: "Nordeste" },
  "99": { state: "MA", stateName: "Maranhão", region: "Nordeste" },

  // Pará
  "91": { state: "PA", stateName: "Pará", region: "Norte" },
  "93": { state: "PA", stateName: "Pará", region: "Norte" },
  "94": { state: "PA", stateName: "Pará", region: "Norte" },

  // Amazonas
  "92": { state: "AM", stateName: "Amazonas", region: "Norte" },
  "97": { state: "AM", stateName: "Amazonas", region: "Norte" },

  // Roraima
  "95": { state: "RR", stateName: "Roraima", region: "Norte" },

  // Amapá
  "96": { state: "AP", stateName: "Amapá", region: "Norte" },
};

export interface PhoneRegionResult {
  state: string;
  stateName: string;
  region: string;
  isInternational: boolean;
  ddd: string | null;
}

/**
 * Identifica a região do Brasil baseado no número de telefone.
 * Retorna null se não for possível identificar.
 */
export function getRegionByPhone(phone: string | null): PhoneRegionResult | null {
  if (!phone) return null;

  // Remove todos os caracteres não numéricos
  const cleanPhone = phone.replace(/\D/g, "");

  if (cleanPhone.length < 2) return null;

  // Detecta números internacionais
  // Se começa com + e código diferente de 55, ou se o número original tinha +
  const originalHasPlus = phone.trim().startsWith("+");

  if (originalHasPlus) {
    // Se começa com +55, é brasileiro
    if (cleanPhone.startsWith("55")) {
      // Remove o 55 e pega o DDD
      const withoutCountry = cleanPhone.substring(2);
      const ddd = withoutCountry.substring(0, 2);
      const regionInfo = DDD_TO_REGION[ddd];

      if (regionInfo) {
        return {
          ...regionInfo,
          isInternational: false,
          ddd,
        };
      }
    }

    // É internacional (começa com + mas não é 55)
    return {
      state: "INT",
      stateName: "Internacional",
      region: "Internacional",
      isInternational: true,
      ddd: null,
    };
  }

  // Número sem +, assume brasileiro
  // Se começa com 55 e tem mais de 12 dígitos, remove o código do país
  let nationalNumber = cleanPhone;
  if (cleanPhone.startsWith("55") && cleanPhone.length >= 12) {
    nationalNumber = cleanPhone.substring(2);
  }

  // Pega os 2 primeiros dígitos como DDD
  const ddd = nationalNumber.substring(0, 2);
  const regionInfo = DDD_TO_REGION[ddd];

  if (regionInfo) {
    return {
      ...regionInfo,
      isInternational: false,
      ddd,
    };
  }

  // DDD não reconhecido
  return null;
}

/**
 * Retorna uma cor de badge baseada na região
 */
export function getRegionColor(region: string): string {
  switch (region) {
    case "Sudeste":
      return "bg-blue-100 text-blue-800";
    case "Sul":
      return "bg-green-100 text-green-800";
    case "Nordeste":
      return "bg-orange-100 text-orange-800";
    case "Norte":
      return "bg-emerald-100 text-emerald-800";
    case "Centro-Oeste":
      return "bg-purple-100 text-purple-800";
    case "Internacional":
      return "bg-slate-100 text-slate-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}
