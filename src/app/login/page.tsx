import { LoginForm } from "@/components/login-form";
import { StartupProblem } from "@/components/startup-problem";
import { currentUser } from "@/lib/http";
import { isNextRedirect, safeStartupMessage } from "@/lib/startup";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  try {
    const user = await currentUser();
    if (user) redirect("/");
    return <LoginForm />;
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    console.error(error);
    return <StartupProblem message={safeStartupMessage(error)} />;
  }
}
