import { PublishedView } from "@/components/ProjectViews";
export default async function MemoryPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { id } = await params;
  return <PublishedView key={id} view="memory" memoryId={id} />;
}
