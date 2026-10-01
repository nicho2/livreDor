export type PublicationStatus = "draft" | "published" | "hidden";
export type ProjectStatus = "draft" | "open" | "closed" | "archived";
export type ProjectRole = "organizer" | "contributor";
export type MediaKind = "image" | "video" | "audio" | "document";

export interface Project {
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
