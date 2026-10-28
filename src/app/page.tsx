import { connection } from "next/server";
import { InboxApp } from "@/components/InboxApp";
import { runtimeMode } from "@/lib/processing/config";

// Rendered per request so the processing mode always reflects the server's current configuration (AI-01).
// Only the credential-free RuntimeMode crosses to the browser.
export default async function Page() {
  await connection();
  return <InboxApp mode={runtimeMode()} />;
}
