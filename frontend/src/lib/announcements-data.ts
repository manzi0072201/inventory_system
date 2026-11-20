import type { IconName } from "@/components/ui/icon";

export type AnnouncementTone = "danger" | "warning" | "success" | "info";

export type Announcement = {
  id: string;
  title: string;
  body: string;
  category: string;
  date: string;
  tone: AnnouncementTone;
  icon: IconName;
};
