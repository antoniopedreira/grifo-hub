export interface DealTag {
  id: string;
  name: string;
  color: string;
  description: string | null;
  created_at: string;
}

export interface DealTagAssignment {
  id: string;
  deal_id: string;
  tag_id: string;
  created_at: string;
  tag?: DealTag;
}
