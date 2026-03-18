import { redirect } from "next/navigation";

export default function AdminSessionsRedirectPage() {
  redirect("/admin/matchs");
}

// (기존 /admin/sessions 화면은 /admin/matchs로 이동)

