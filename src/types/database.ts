export type PublicationStatus = "draft" | "published" | "hidden";
export type ProjectStatus = "draft" | "open" | "closed" | "archived";
export type ProjectRole = "organizer" | "contributor";
export type MediaKind = "image" | "video" | "audio" | "document";

export interface Project {
  [key: string]: unknown;
  id: string;
  slug: string;
  title: string;
  subject_name: string;
  description: string | null;
  event_date: string | null;
  opens_at: string | null;
  closes_at: string | null;
  status: ProjectStatus;
  created_by: string;
  created_at: string;
}

export interface GuestbookFormatting {
  font: "sans" | "serif" | "hand" | "mono";
  size: "sm" | "md" | "lg";
  align: "left" | "center" | "right";
  color: "ink" | "blue" | "green" | "burgundy" | "gold";
  bold: boolean;
  italic: boolean;
}

export interface GuestbookEntry {
  [key: string]: unknown;
  id: string;
  project_id: string;
  author_id: string;
  display_name: string;
  message: string;
  formatting: GuestbookFormatting;
  status: PublicationStatus;
  created_at: string;
  updated_at: string;
}

export interface Memory {
  [key: string]: unknown;
  id: string;
  project_id: string;
  author_id: string;
  display_name: string;
  title: string | null;
  body: string;
  occurred_on: string | null;
  year_from: number | null;
  year_to: number | null;
  status: PublicationStatus;
  created_at: string;
}

export interface MediaAsset {
  [key: string]: unknown;
  id: string;
  project_id: string;
  memory_id: string | null;
  owner_id: string;
  kind: MediaKind;
  object_key: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  status: PublicationStatus;
  created_at: string;
}

type Insert<T> = Omit<T, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

type Update<T> = Partial<Omit<T, "id" | "created_at">>;

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; display_name: string | null; created_at: string; updated_at: string };
        Insert: { id: string; display_name?: string | null; created_at?: string; updated_at?: string };
        Update: { display_name?: string | null; updated_at?: string };
        Relationships: [];
      };
      projects: {
        Row: Project;
        Insert: Insert<Project>;
        Update: Update<Project>;
        Relationships: [];
      };
      project_members: {
        Row: { project_id: string; user_id: string; role: ProjectRole; joined_at: string };
        Insert: { project_id: string; user_id: string; role?: ProjectRole; joined_at?: string };
        Update: { role?: ProjectRole };
        Relationships: [];
      };
      guestbook_entries: {
        Row: GuestbookEntry;
        Insert: Insert<GuestbookEntry>;
        Update: Update<GuestbookEntry>;
        Relationships: [];
      };
      memories: {
        Row: Memory;
        Insert: Insert<Memory>;
        Update: Update<Memory>;
        Relationships: [];
      };
      media_assets: {
        Row: MediaAsset;
        Insert: Insert<MediaAsset>;
        Update: Update<MediaAsset>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_project_member: {
        Args: { p_project_id: string; p_user_id?: string };
        Returns: boolean;
      };
      is_project_organizer: {
        Args: { p_project_id: string; p_user_id?: string };
        Returns: boolean;
      };
      join_project: {
        Args: { p_project_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      project_status: ProjectStatus;
      project_role: ProjectRole;
      publication_status: PublicationStatus;
      media_kind: MediaKind;
    };
    CompositeTypes: Record<string, never>;
  };
}
