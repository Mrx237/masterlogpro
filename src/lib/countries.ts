export interface Country {
  code: string;       // ISO-2
  name: string;
  flag: string;       // emoji
  continent: Continent;
  subRegion: string;
}

export type Continent = "Africa" | "Europe" | "Asia" | "Americas" | "Oceania";

export const COUNTRIES: Country[] = [
  // Africa - West
  { code: "CM", name: "Cameroun", flag: "🇨🇲", continent: "Africa", subRegion: "Afrique Centrale" },
  { code: "CD", name: "Congo (RDC)", flag: "🇨🇩", continent: "Africa", subRegion: "Afrique Centrale" },
  { code: "CG", name: "Congo (Brazzaville)", flag: "🇨🇬", continent: "Africa", subRegion: "Afrique Centrale" },
  { code: "GA", name: "Gabon", flag: "🇬🇦", continent: "Africa", subRegion: "Afrique Centrale" },
  { code: "TD", name: "Tchad", flag: "🇹🇩", continent: "Africa", subRegion: "Afrique Centrale" },
  { code: "CF", name: "Centrafrique", flag: "🇨🇫", continent: "Africa", subRegion: "Afrique Centrale" },
  { code: "GQ", name: "Guinée Équatoriale", flag: "🇬🇶", continent: "Africa", subRegion: "Afrique Centrale" },
  { code: "SN", name: "Sénégal", flag: "🇸🇳", continent: "Africa", subRegion: "Afrique de l'Ouest" },
  { code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮", continent: "Africa", subRegion: "Afrique de l'Ouest" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬", continent: "Africa", subRegion: "Afrique de l'Ouest" },
  { code: "GH", name: "Ghana", flag: "🇬🇭", continent: "Africa", subRegion: "Afrique de l'Ouest" },
  { code: "ML", name: "Mali", flag: "🇲🇱", continent: "Africa", subRegion: "Afrique de l'Ouest" },
  { code: "BF", name: "Burkina Faso", flag: "🇧🇫", continent: "Africa", subRegion: "Afrique de l'Ouest" },
  { code: "BJ", name: "Bénin", flag: "🇧🇯", continent: "Africa", subRegion: "Afrique de l'Ouest" },
  { code: "TG", name: "Togo", flag: "🇹🇬", continent: "Africa", subRegion: "Afrique de l'Ouest" },
  { code: "GN", name: "Guinée", flag: "🇬🇳", continent: "Africa", subRegion: "Afrique de l'Ouest" },
  { code: "MA", name: "Maroc", flag: "🇲🇦", continent: "Africa", subRegion: "Afrique du Nord" },
  { code: "DZ", name: "Algérie", flag: "🇩🇿", continent: "Africa", subRegion: "Afrique du Nord" },
  { code: "TN", name: "Tunisie", flag: "🇹🇳", continent: "Africa", subRegion: "Afrique du Nord" },
  { code: "EG", name: "Égypte", flag: "🇪🇬", continent: "Africa", subRegion: "Afrique du Nord" },
  { code: "LY", name: "Libye", flag: "🇱🇾", continent: "Africa", subRegion: "Afrique du Nord" },
  { code: "KE", name: "Kenya", flag: "🇰🇪", continent: "Africa", subRegion: "Afrique de l'Est" },
  { code: "ET", name: "Éthiopie", flag: "🇪🇹", continent: "Africa", subRegion: "Afrique de l'Est" },
  { code: "TZ", name: "Tanzanie", flag: "🇹🇿", continent: "Africa", subRegion: "Afrique de l'Est" },
  { code: "UG", name: "Ouganda", flag: "🇺🇬", continent: "Africa", subRegion: "Afrique de l'Est" },
  { code: "RW", name: "Rwanda", flag: "🇷🇼", continent: "Africa", subRegion: "Afrique de l'Est" },
  { code: "ZA", name: "Afrique du Sud", flag: "🇿🇦", continent: "Africa", subRegion: "Afrique Australe" },
  { code: "AO", name: "Angola", flag: "🇦🇴", continent: "Africa", subRegion: "Afrique Australe" },
  { code: "ZW", name: "Zimbabwe", flag: "🇿🇼", continent: "Africa", subRegion: "Afrique Australe" },
  { code: "MZ", name: "Mozambique", flag: "🇲🇿", continent: "Africa", subRegion: "Afrique Australe" },

  // Europe
  { code: "FR", name: "France", flag: "🇫🇷", continent: "Europe", subRegion: "Europe de l'Ouest" },
  { code: "BE", name: "Belgique", flag: "🇧🇪", continent: "Europe", subRegion: "Europe de l'Ouest" },
  { code: "NL", name: "Pays-Bas", flag: "🇳🇱", continent: "Europe", subRegion: "Europe de l'Ouest" },
  { code: "DE", name: "Allemagne", flag: "🇩🇪", continent: "Europe", subRegion: "Europe de l'Ouest" },
  { code: "CH", name: "Suisse", flag: "🇨🇭", continent: "Europe", subRegion: "Europe de l'Ouest" },
  { code: "GB", name: "Royaume-Uni", flag: "🇬🇧", continent: "Europe", subRegion: "Europe de l'Ouest" },
  { code: "IE", name: "Irlande", flag: "🇮🇪", continent: "Europe", subRegion: "Europe de l'Ouest" },
  { code: "ES", name: "Espagne", flag: "🇪🇸", continent: "Europe", subRegion: "Europe du Sud" },
  { code: "PT", name: "Portugal", flag: "🇵🇹", continent: "Europe", subRegion: "Europe du Sud" },
  { code: "IT", name: "Italie", flag: "🇮🇹", continent: "Europe", subRegion: "Europe du Sud" },
  { code: "GR", name: "Grèce", flag: "🇬🇷", continent: "Europe", subRegion: "Europe du Sud" },
  { code: "PL", name: "Pologne", flag: "🇵🇱", continent: "Europe", subRegion: "Europe de l'Est" },
  { code: "RO", name: "Roumanie", flag: "🇷🇴", continent: "Europe", subRegion: "Europe de l'Est" },
  { code: "UA", name: "Ukraine", flag: "🇺🇦", continent: "Europe", subRegion: "Europe de l'Est" },
  { code: "SE", name: "Suède", flag: "🇸🇪", continent: "Europe", subRegion: "Europe du Nord" },
  { code: "NO", name: "Norvège", flag: "🇳🇴", continent: "Europe", subRegion: "Europe du Nord" },
  { code: "DK", name: "Danemark", flag: "🇩🇰", continent: "Europe", subRegion: "Europe du Nord" },
  { code: "FI", name: "Finlande", flag: "🇫🇮", continent: "Europe", subRegion: "Europe du Nord" },

  // Americas
  { code: "US", name: "États-Unis", flag: "🇺🇸", continent: "Americas", subRegion: "Amérique du Nord" },
  { code: "CA", name: "Canada", flag: "🇨🇦", continent: "Americas", subRegion: "Amérique du Nord" },
  { code: "MX", name: "Mexique", flag: "🇲🇽", continent: "Americas", subRegion: "Amérique du Nord" },
  { code: "BR", name: "Brésil", flag: "🇧🇷", continent: "Americas", subRegion: "Amérique du Sud" },
  { code: "AR", name: "Argentine", flag: "🇦🇷", continent: "Americas", subRegion: "Amérique du Sud" },
  { code: "CL", name: "Chili", flag: "🇨🇱", continent: "Americas", subRegion: "Amérique du Sud" },
  { code: "CO", name: "Colombie", flag: "🇨🇴", continent: "Americas", subRegion: "Amérique du Sud" },
  { code: "PE", name: "Pérou", flag: "🇵🇪", continent: "Americas", subRegion: "Amérique du Sud" },
  { code: "HT", name: "Haïti", flag: "🇭🇹", continent: "Americas", subRegion: "Caraïbes" },

  // Asia
  { code: "CN", name: "Chine", flag: "🇨🇳", continent: "Asia", subRegion: "Asie de l'Est" },
  { code: "JP", name: "Japon", flag: "🇯🇵", continent: "Asia", subRegion: "Asie de l'Est" },
  { code: "KR", name: "Corée du Sud", flag: "🇰🇷", continent: "Asia", subRegion: "Asie de l'Est" },
  { code: "IN", name: "Inde", flag: "🇮🇳", continent: "Asia", subRegion: "Asie du Sud" },
  { code: "PK", name: "Pakistan", flag: "🇵🇰", continent: "Asia", subRegion: "Asie du Sud" },
  { code: "ID", name: "Indonésie", flag: "🇮🇩", continent: "Asia", subRegion: "Asie du Sud-Est" },
  { code: "PH", name: "Philippines", flag: "🇵🇭", continent: "Asia", subRegion: "Asie du Sud-Est" },
  { code: "VN", name: "Vietnam", flag: "🇻🇳", continent: "Asia", subRegion: "Asie du Sud-Est" },
  { code: "TH", name: "Thaïlande", flag: "🇹🇭", continent: "Asia", subRegion: "Asie du Sud-Est" },
  { code: "AE", name: "Émirats Arabes Unis", flag: "🇦🇪", continent: "Asia", subRegion: "Moyen-Orient" },
  { code: "SA", name: "Arabie Saoudite", flag: "🇸🇦", continent: "Asia", subRegion: "Moyen-Orient" },
  { code: "TR", name: "Turquie", flag: "🇹🇷", continent: "Asia", subRegion: "Moyen-Orient" },

  // Oceania
  { code: "AU", name: "Australie", flag: "🇦🇺", continent: "Oceania", subRegion: "Australasie" },
  { code: "NZ", name: "Nouvelle-Zélande", flag: "🇳🇿", continent: "Oceania", subRegion: "Australasie" },
];

export const CONTINENT_LABELS: Record<Continent, string> = {
  Africa: "🌍 Afrique",
  Europe: "🌍 Europe",
  Asia: "🌏 Asie",
  Americas: "🌎 Amériques",
  Oceania: "🌏 Océanie",
};

export function getCountry(code?: string | null) {
  if (!code) return null;
  return COUNTRIES.find((c) => c.code === code) ?? null;
}

export function listSubRegions(continent: Continent) {
  return Array.from(new Set(COUNTRIES.filter((c) => c.continent === continent).map((c) => c.subRegion)));
}
