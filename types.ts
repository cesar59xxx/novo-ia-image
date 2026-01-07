export enum OutputType {
  AD_FEED = 'ad_feed',
  AD_STORIES = 'ad_stories',
  LANDING_HERO = 'landing_hero',
  LANDING_MOBILE = 'landing_mobile',
  THUMBNAIL = 'thumbnail',
}

export enum LandingPosition {
  LEFT = 'left',
  CENTER = 'center',
  RIGHT = 'right',
  TOP = 'top',
  BOTTOM = 'bottom',
}

export interface ProcessingStep {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  details?: string;
}

export interface MaskLayer {
  id: string;
  name: string;
  type: 'binary' | 'bbox' | 'depth' | 'lighting' | 'shadow';
  previewUrl: string | null; // In a real app this might be a blob URL, here we might simulate it
}

export interface GeneratedImage {
  url: string;
  timestamp: number;
}