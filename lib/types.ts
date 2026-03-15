/** Place tag categories used for filtering and display */
export type PlaceTag = 'eat' | 'bar' | 'cafes' | 'go out' | 'shops' | 'avoid' | 'safe';

/** Google Maps travel mode for route planning */
export type TravelMode = 'WALKING' | 'DRIVING' | 'TRANSIT' | 'BICYCLING';

/** Source type for event/place data ingestion */
export type SourceType = 'event' | 'place';

/** Status of an ingestion source */
export type SourceStatus = 'active' | 'paused';

/** Planner view mode for merged/split display */
export type PlannerViewMode = 'merged' | 'mine' | 'partner';

/** Crime heatmap intensity level */
export type HeatmapStrength = 'low' | 'medium' | 'high';

/** Map filter category toggled on/off */
export type CategoryFilter = PlaceTag | 'event' | 'home' | 'crime';

/** Kind of item in the day planner */
export type PlanItemKind = 'event' | 'place';

/** A single item in the day planner */
export interface PlanItem {
  id: string;
  kind: PlanItemKind;
  sourceKey: string;
  title: string;
  locationText: string;
  link: string;
  tag: PlaceTag;
  startMinutes: number;
  endMinutes: number;
  ownerUserId?: string;
}

/** Time range in minutes from midnight */
export interface MinuteRange {
  startMinutes: number;
  endMinutes: number;
}

/** Crime heatmap layer metadata */
export interface CrimeLayerMeta {
  loading: boolean;
  count: number;
  generatedAt: string;
  error: string;
}
