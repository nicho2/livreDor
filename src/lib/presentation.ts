import type { GuestbookFormatting, Memory, Project } from "@/types/database";
export function projectWindow(project: Project, now = Date.now()) {
  return {
    closed: project.status !== "open" || Boolean(project.closes_at && Date.parse(project.closes_at) <= now),
    future: Boolean(project.opens_at && Date.parse(project.opens_at) > now),
  };
}
export function memoryDateLabel(memory: Pick<Memory, "occurred_on" | "year_from" | "year_to">) {
  if (memory.occurred_on) return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${memory.occurred_on}T12:00:00Z`));
  if (memory.year_from && memory.year_to && memory.year_from !== memory.year_to) return `${memory.year_from} – ${memory.year_to}`;
  if (memory.year_from) return String(memory.year_from);
  if (memory.year_to) return `Jusqu'en ${memory.year_to}`;
  return "Date non précisée";
}
export function chronologicalMemories(memories: Memory[]) {
  const key = (m: Memory) => m.occurred_on ?? (m.year_from || m.year_to ? `${m.year_from ?? m.year_to}-01-01` : "9999");
  return [...memories].sort((a, b) => key(a).localeCompare(key(b)) || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
}
export function formattingClasses(value: GuestbookFormatting) {
  const font = ["sans", "serif", "hand", "mono"].includes(value?.font) ? value.font : "sans";
  const size = ["sm", "md", "lg"].includes(value?.size) ? value.size : "md";
  const align = ["left", "center", "right"].includes(value?.align) ? value.align : "left";
  const color = ["ink", "blue", "green", "burgundy", "gold"].includes(value?.color) ? value.color : "ink";
  return `message font-${font} size-${size} align-${align} color-${color}${value?.bold === true ? " weight-bold" : ""}${value?.italic === true ? " style-italic" : ""}`;
}
