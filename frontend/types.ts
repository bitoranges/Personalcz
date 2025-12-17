export interface Material {
  id: string;
  title: string;
  description: string;
  type: 'pdf' | 'link' | 'archive' | 'zip' | 'png' | 'jpg' | 'jpeg' | 'gif' | 'svg' | 'webp';
  date: string;
}

export interface SiteConfig {
  name: string;
  // avatarUrl removed - using local import in Header.tsx
  motto: string;
  tagline: string;
  socials: {
    x: string;
    telegram: string;
  };
  price: {
    amount: number;
    currency: string;
    chain: string;
  };
}