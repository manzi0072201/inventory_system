import type { Metadata } from "next";
import { AllPayments } from "@/components/payments/all-payments";

export const metadata: Metadata = {
  title: "Payments - VirtueVibe",
};

export default function PaymentsPage() {
  return <AllPayments />;
}
