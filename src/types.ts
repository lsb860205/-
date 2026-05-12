export type Page = 'home' | 'place' | 'food' | 'nature' | 'about' | 'admin';

export interface Project {
  id: string;
  category: 'place' | 'food' | 'nature';
  clientName: string;
  description?: string;
  mainImage: string;
  photos?: string[];
  photoCount?: number;
  order: number;
}

export interface GlobalSettings {
  homeHeadline: string;
  homeHeadlineSub?: string;
  homeIntro: string;
  aboutHeadline: string;
  aboutSub: string;
  aboutBody: string;
  aboutImage?: string;
  heroImages: string[];
  featuredPlaceId?: string;
  featuredFoodId?: string;
  featuredNatureId?: string;
}
