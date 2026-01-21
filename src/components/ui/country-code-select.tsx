import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Country {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
}

const countries: Country[] = [
  { code: "BR", name: "Brasil", dialCode: "+55", flag: "🇧🇷" },
  { code: "US", name: "Estados Unidos", dialCode: "+1", flag: "🇺🇸" },
  { code: "PT", name: "Portugal", dialCode: "+351", flag: "🇵🇹" },
  { code: "ES", name: "Espanha", dialCode: "+34", flag: "🇪🇸" },
  { code: "AR", name: "Argentina", dialCode: "+54", flag: "🇦🇷" },
  { code: "MX", name: "México", dialCode: "+52", flag: "🇲🇽" },
  { code: "CO", name: "Colômbia", dialCode: "+57", flag: "🇨🇴" },
  { code: "CL", name: "Chile", dialCode: "+56", flag: "🇨🇱" },
  { code: "PE", name: "Peru", dialCode: "+51", flag: "🇵🇪" },
  { code: "UY", name: "Uruguai", dialCode: "+598", flag: "🇺🇾" },
];

interface CountryCodeSelectProps {
  value: string;
  onChange: (dialCode: string) => void;
  className?: string;
  variant?: "default" | "dark";
}

export function CountryCodeSelect({ 
  value, 
  onChange, 
  className,
  variant = "default" 
}: CountryCodeSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const selectedCountry = countries.find(c => c.dialCode === value) || countries[0];

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isDark = variant === "dark";

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all min-w-[100px]",
          isDark 
            ? "bg-transparent border-[#E1D8CF]/20 text-[#E1D8CF] hover:border-[#A47428]"
            : "bg-white/10 border-white/20 text-white hover:border-secondary"
        )}
      >
        <span className="text-xl">{selectedCountry.flag}</span>
        <span className="font-medium">{selectedCountry.dialCode}</span>
        <ChevronDown className={cn(
          "w-4 h-4 transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>

      {isOpen && (
        <div className={cn(
          "absolute top-full left-0 mt-1 w-56 rounded-lg border shadow-xl z-50 max-h-60 overflow-y-auto",
          isDark 
            ? "bg-[#112232] border-[#E1D8CF]/20"
            : "bg-primary border-white/20"
        )}>
          {countries.map((country) => (
            <button
              key={country.code}
              type="button"
              onClick={() => {
                onChange(country.dialCode);
                setIsOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                isDark
                  ? "text-[#E1D8CF] hover:bg-[#A47428]/20"
                  : "text-white hover:bg-white/10",
                selectedCountry.code === country.code && (isDark ? "bg-[#A47428]/10" : "bg-white/5")
              )}
            >
              <span className="text-xl">{country.flag}</span>
              <span className="flex-1 font-medium">{country.name}</span>
              <span className={cn(
                "text-sm",
                isDark ? "text-[#E1D8CF]/60" : "text-white/60"
              )}>{country.dialCode}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export { countries };
