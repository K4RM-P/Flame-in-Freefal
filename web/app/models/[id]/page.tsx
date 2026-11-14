import { ModelPage } from "./ModelPage";

export const dynamicParams = false;
export function generateStaticParams() {
  return ["spread", "droplet", "suppression", "gravity", "habitat", "smoke", "boundary"].map((id) => ({ id }));
}
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ModelPage id={id} />;
}
