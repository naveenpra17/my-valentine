export interface Memory {
  id: number;
  title: string;
  message: string;
  memoryDate: string | null;
  location: string | null;
  imageUrl: string;
  displayOrder: number;
}

export interface Photo {
  id: number;
  title: string | null;
  caption: string | null;
  imageUrl: string;
  memoryId: number | null;
  displayOrder: number;
}

export interface Quote {
  id: number;
  text: string;
  author: string | null;
  displayOrder: number;
}

export interface LoveBomb {
  id: number;
  message: string;
}

export interface Reason {
  id: number;
  shortLabel: string;
  longMessage: string;
  displayOrder: number;
}

export interface OpenWhenMessage {
  id: number;
  envelopeLabel: string;
  message: string;
  displayOrder: number;
}

export interface SiteConfig {
  settings: Record<string, string>;
  entryLockEnabled: boolean;
  entryLockQuestion: string;
}

export interface SiteIdentity {
  slug: string;
  name: string;
}

export interface SiteSummary {
  slug: string;
  name: string;
}

export interface SiteBundle {
  site: SiteIdentity;
  config: Record<string, string>;
  entryLockEnabled: boolean;
  entryLockQuestion: string;
  memories: Memory[];
  photos: Photo[];
  quotes: Quote[];
  reasons: Reason[];
  loveBombs: LoveBomb[];
  openWhenMessages: OpenWhenMessage[];
}
