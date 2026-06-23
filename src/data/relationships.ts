export interface RelationshipType {
  value: string;
  label: string;
}

export const RELATIONSHIP_TYPES: RelationshipType[] = [
  { value: "partner", label: "Partner" },
  { value: "spouse", label: "Spouse" },
  { value: "friend", label: "Friend" },
  { value: "best_friend", label: "Best friend" },
  { value: "family", label: "Family" },
  { value: "parent", label: "Parent" },
  { value: "sibling", label: "Sibling" },
  { value: "therapist", label: "Therapist" },
  { value: "coworker", label: "Coworker" },
  { value: "acquaintance", label: "Acquaintance" },
  { value: "pet", label: "Pet" },
  { value: "other", label: "Other" },
];

export interface Relationship {
  id: string;
  name: string;
  relationship_type: string | null;
  notes: string | null;
  created_at: string;
}
