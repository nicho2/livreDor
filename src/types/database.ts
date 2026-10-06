export type PublicationStatus = "draft" | "published" | "hidden";
export type ProjectStatus = "draft" | "open" | "closed" | "archived";
export type ProjectRole = "organizer" | "contributor";
export type MediaKind = "image" | "video" | "audio" | "document";

export interface OrganizerMessage {
  [key: string]: unknown;
  id: string; project_id: string; author_id: string; display_name: string;
  category: "help" | "media" | "rights"; body: string; created_at: string; read_at: string | null;
  notification_sent_at?: string | null;
}

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
  theme?: import("@/lib/themes").ThemeId;
  content_revision?: number;
  archive_exported_at?: string | null;
  deletion_started_at?: string | null;
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
  deletion_started_at?: string | null;
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
      organizer_messages: { Row: OrganizerMessage; Insert: Record<string, unknown>; Update: { notification_sent_at?: string | null }; Relationships: [] };
      project_organizer_invites: {
        Row: { project_id: string; email: string; invited_by: string; accepted_by: string | null; created_at: string };
        Insert: { project_id: string; email: string; invited_by: string; accepted_by?: string | null; created_at?: string };
        Update: { email?: string; accepted_by?: string | null };
        Relationships: [];
      };
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
      begin_memory_deletion: { Args: { p_memory_id: string; p_actor: string }; Returns: Memory };
      finish_memory_deletion: { Args: { p_memory_id: string; p_actor: string }; Returns: boolean };
      send_organizer_message: { Args: { p_project_id: string; p_display_name: string; p_category: string; p_body: string; p_request_id?: string }; Returns: string };
      mark_organizer_message_read: { Args: { p_message_id: string }; Returns: undefined };
      confirm_project_export: { Args: { p_project_id: string; p_revision: number }; Returns: boolean };
      begin_project_deletion: { Args: { p_project_id: string; p_actor: string; p_slug: string }; Returns: Project };
      finish_project_deletion: { Args: { p_project_id: string; p_actor: string }; Returns: boolean };
      create_project_limited: {
        Args: { p_actor: string; p_limit: number; p_slug: string; p_title: string; p_subject_name: string; p_description: string | null; p_event_date: string | null };
        Returns: Project[];
      };
      create_project_with_organizer: { Args: { p_actor: string; p_limit: number; p_slug: string; p_title: string; p_subject_name: string; p_description?: string | null; p_event_date?: string | null; p_organizer_email: string }; Returns: Project };
      invite_project_organizer: { Args: { p_project_id: string; p_email: string }; Returns: undefined };
      accept_project_organizer_invite: { Args: { p_project_id: string }; Returns: boolean };
      cancel_project_organizer_invite: { Args: { p_project_id: string }; Returns: undefined };
      create_project: {
        Args: { p_slug: string; p_title: string; p_subject_name: string; p_description: string | null; p_event_date: string | null };
        Returns: Project[];
      };
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
