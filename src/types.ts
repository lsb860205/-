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
  isDeleted?: boolean;
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
  // Category texts
  placeTitle?: string;
  placeDescription?: string;
  foodTitle?: string;
  foodDescription?: string;
  natureTitle?: string;
  natureDescription?: string;
  // Footer contacts
  footerEmail?: string;
  footerInstagram?: string;
  footerKakao?: string;
  footerIntro?: string;
  footerCopyright?: string;
}
