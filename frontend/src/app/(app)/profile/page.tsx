import { ProfilePage } from "@/components/profile/profile-page";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string | string[] }>;
}) {
  const { edit } = await searchParams;
  return <ProfilePage edit={edit === "1"} />;
}
