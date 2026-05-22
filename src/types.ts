export interface Verse {
  reference: string;
  text: string;
  explanation: string;
}

export interface ExperienceData {
  prayer: string;
  verse: Verse;
  devotional: string;
  breathExercise: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  text: string;
  emotion: string;
  reflection?: string;
  prayerFocus?: string;
}

export interface UserProfile {
  name: string;
  joinedDate: string;
  streak: number;
  lastCheckIn?: string;
  email?: string;
  subscriptionStatus?: "free" | "premium";
  subscriptionExpiresAt?: string;
}

export interface PrayerRequest {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
  amenCount: number;
  amens?: string[];
}

export interface EmotionOption {
  id: string;
  label: string;
  description: string;
  color: string;
  badgeBg: string;
  ambientSound: string; // rain, desert, mountain, garden, dawn
}

export interface EnvironmentOption {
  id: string;
  name: string;
  description: string;
  colorGradients: string;
  ambientName: string; // name in synthesizer
  iconName: string;
}
