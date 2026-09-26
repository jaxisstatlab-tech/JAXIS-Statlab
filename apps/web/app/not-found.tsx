import type { Metadata } from "next";
import { NotFoundPage } from "@repo/ui/NotFoundPage";
import { LOGIN_URL } from "@/lib/config";

export const metadata: Metadata = {
  title: "Page not found · JAXIS StatLab",
};

export default function NotFound() {
  return (
    <NotFoundPage
      primary={{ href: "/", label: "Go to homepage" }}
      secondary={{ href: LOGIN_URL, label: "Send your study" }}
    />
  );
}
