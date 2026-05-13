import { redirect } from "next/navigation"
import { getAvailableObservatorySources } from "@/lib/observatory.server"

export const dynamic = "force-dynamic"

export default function DashRootPage() {
  const firstSource = getAvailableObservatorySources()[0]?.[0]
  redirect(firstSource ? `/observatory/${firstSource}` : "/observatory")
}
