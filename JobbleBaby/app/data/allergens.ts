// Allergen data model for Jobble Baby

export type AllergenStatus = 'not_introduced' | 'introduced' | 'reaction_observed' | 'tolerated';

export type ReactionType = 'IgE' | 'FPIES' | 'non-IgE';

export interface Reaction {
  id: string;
  type: ReactionType;
  symptoms: string[];
  severity: number; // 1-5
  date: string; // ISO date string
  photo_uri?: string;
  notes?: string;
}

export interface AllergenEntry {
  id: string; // allergen id (peanut, egg, etc.)
  status: AllergenStatus;
  date_introduced?: string; // ISO date string
  reactions: Reaction[];
}

export interface Allergen {
  id: string;
  name: string;
  emoji: string;
}

export const ALLERGENS: Allergen[] = [
  { id: 'peanut', name: 'Peanut', emoji: '🥜' },
  { id: 'egg', name: 'Egg', emoji: '🥚' },
  { id: 'dairy', name: 'Dairy', emoji: '🥛' },
  { id: 'soy', name: 'Soy', emoji: '🫘' },
  { id: 'wheat', name: 'Wheat', emoji: '🌾' },
  { id: 'fish', name: 'Fish', emoji: '🐟' },
  { id: 'shellfish', name: 'Shellfish', emoji: '🦐' },
  { id: 'tree_nut', name: 'Tree Nut', emoji: '🌰' },
];

export const FPIES_WARNING = 'FPIES reactions occur 2-4 hours after feeding — profuse vomiting and lethargy.';

export const REACTION_SYMPTOMS = [
  'Vomiting',
  'Diarrhea',
  'Rash',
  'Hives',
  'Swelling',
  'Lethargy',
  'Other',
];

export const STATUS_LABELS: Record<AllergenStatus, string> = {
  not_introduced: 'Not Introduced',
  introduced: 'Introduced',
  reaction_observed: 'Reaction Observed',
  tolerated: 'Tolerated',
};
