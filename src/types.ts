export interface Reflection {
  openToReframe: boolean;
  reframeOffered?: string;
}

export interface CheckInEntry {
  id: string;
  timestamp: string;
  activationLevel: number;
  triggers: string[];
  thoughts: string[];
  urges: string[];
  reflection?: Reflection;
}

export interface JournalEntry {
  id: string;
  timestamp: string;
  updatedAt: string;
  body: string;
  checkinId?: string;
}
