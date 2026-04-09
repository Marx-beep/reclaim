import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { OpsConsole } from "@/components/ops/ops-console";
import { OPS_AUTH_COOKIE, createOpsSessionToken, getOpsPassword } from "@/lib/server/ops-auth";

export default async function OpsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(OPS_AUTH_COOKIE)?.value;
  const expected = createOpsSessionToken(getOpsPassword());

  if (token !== expected) {
    redirect("/ops/login");
  }

  return <OpsConsole />;
}
