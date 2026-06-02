import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ProjectRouteRedirectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  redirect(`/?view=projectWorkspace&projectId=${encodeURIComponent(projectId || "")}`);
}
