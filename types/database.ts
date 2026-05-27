// ─────────────────────────────────────────────────────────────
// MaizeMarket — Database Types
// Manually maintained to match supabase/migrations/00001_initial_schema.sql
// Replace with `supabase gen types typescript --project-id <ref>` once a
// live project exists. Includes Relationships / Views / Functions fields
// required by @supabase/supabase-js v2.
// ─────────────────────────────────────────────────────────────

export type ListingCategory =
  | 'couch'
  | 'desk'
  | 'dresser'
  | 'table'
  | 'chair'
  | 'bookshelf'
  | 'bed_frame'
  | 'other';

export type LogisticsTier =
  | 'self_carry'
  | 'two_person'
  | 'truck_required';

export type ListingStatus = 'active' | 'sold' | 'deleted';

// ── Row types ─────────────────────────────────────────────────

export interface Profile {
  id: string;
  email: string;
  display_name: string;
  move_in_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Listing {
  id: string;
  seller_id: string;
  title: string;
  description: string;
  price_cents: number;
  category: ListingCategory;
  logistics_tier: LogisticsTier;
  neighborhood: string;
  status: ListingStatus;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface ListingImage {
  id: string;
  listing_id: string;
  storage_path: string;
  display_order: number;
  created_at: string;
}

export interface Conversation {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  last_message_at: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

// ── Enriched / joined types for UI ───────────────────────────

export interface ListingWithImages extends Listing {
  listing_images: ListingImage[];
}

export interface ListingWithSeller extends ListingWithImages {
  profiles: Profile;
}

export interface ConversationWithDetails extends Conversation {
  listings: Pick<Listing, 'id' | 'title' | 'price_cents' | 'status'> & {
    listing_images: Pick<ListingImage, 'storage_path' | 'display_order'>[];
  };
  buyer: Pick<Profile, 'id' | 'display_name'>;
  seller: Pick<Profile, 'id' | 'display_name'>;
}

// ── Supabase Database generic type ───────────────────────────
// Must satisfy supabase-js GenericSchema: Tables + Views + Functions.
// Relationships arrays are empty (no FK navigation needed in type layer).

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Profile, 'id' | 'email' | 'created_at'>>;
        Relationships: [];
      };
      listings: {
        Row: Listing;
        Insert: Omit<Listing, 'created_at' | 'updated_at' | 'expires_at' | 'status'> & {
          id?: string;
          status?: ListingStatus;
          expires_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Listing, 'id' | 'seller_id' | 'created_at'>>;
        Relationships: [];
      };
      listing_images: {
        Row: ListingImage;
        Insert: Omit<ListingImage, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Pick<ListingImage, 'display_order'>>;
        Relationships: [];
      };
      conversations: {
        Row: Conversation;
        Insert: Omit<Conversation, 'id' | 'created_at' | 'last_message_at'> & {
          id?: string;
          created_at?: string;
          last_message_at?: string;
        };
        Update: Partial<Pick<Conversation, 'last_message_at'>>;
        Relationships: [];
      };
      messages: {
        Row: Message;
        Insert: Omit<Message, 'id' | 'created_at' | 'read_at'> & {
          id?: string;
          created_at?: string;
          read_at?: string | null;
        };
        Update: Partial<Pick<Message, 'read_at'>>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      listing_category: ListingCategory;
      logistics_tier: LogisticsTier;
      listing_status: ListingStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
