import { redirect } from "next/navigation";

import { LoginForm } from "@/app/login/login-form";
import { lookupCurrentUser } from "@/lib/current-user";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // lookupCurrentUser reports problems instead of throwing, so the form is
  // still shown when the session cannot be checked.
  const { user } = await lookupCurrentUser();
  if (user) {
    redirect("/listings");
  }

  return <LoginForm />;
}
