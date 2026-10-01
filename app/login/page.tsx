import { redirect } from "next/navigation";

import { LoginForm } from "@/app/login/login-form";
import { getCurrentUser } from "@/lib/current-user";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/listings");
  }

  return <LoginForm />;
}
