import { ShopChrome } from "@/components/shop-chrome";
import { StartupProblem } from "@/components/startup-problem";
import { requirePageUser } from "@/lib/http";
import { isNextRedirect, safeStartupMessage } from "@/lib/startup";

export const dynamic = "force-dynamic";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  try {
    const user = await requirePageUser();
    return <ShopChrome user={user}>{children}</ShopChrome>;
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    console.error(error);
    return <StartupProblem message={safeStartupMessage(error)} />;
  }
}
