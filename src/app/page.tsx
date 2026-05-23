import { Suspense } from "react"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { Observatory } from "@/components/observatory/observatory"
import {
  EmptyObservatorySourceError,
  getAvailableObservatorySources,
  getObservatoryData,
  isObservatorySourceAvailable,
} from "@/lib/observatory.server"
import type { ObservatoryData, ReaderMode } from "@/components/observatory/foundations/types"

export const dynamic = "force-dynamic"

const BASE_TITLE = "Research · AIOX Research"
const BASE_DESCRIPTION = "Operational reader for docs/research artifacts."

type HomePageProps = {
  searchParams?: Promise<{
    slug?: string
    file?: string
    view?: string
    sort?: string
    status?: string
    group?: string
  }>
}

export async function generateMetadata({ searchParams }: HomePageProps): Promise<Metadata> {
  const sp = await searchParams
  if (!sp?.slug) {
    return { title: BASE_TITLE, description: BASE_DESCRIPTION }
  }

  try {
    const result = await getObservatoryData({ source: "research", slug: sp.slug })
    const run = result.data.selectedRun
    if (run?.displayTitle) {
      return {
        title: `${run.displayTitle} · AIOX Research`,
        description: BASE_DESCRIPTION,
      }
    }
  } catch {
    // Slug missing or fetch failed — fall back to base title.
  }

  return { title: BASE_TITLE, description: BASE_DESCRIPTION }
}

export default async function HomePage({ searchParams }: HomePageProps) {
  if (!isObservatorySourceAvailable("research")) notFound()
  const sp = await searchParams
  const availableSources = getAvailableObservatorySources()

  let data: ObservatoryData
  try {
    const result = await getObservatoryData({
      source: "research",
      slug: sp?.slug,
      file: sp?.file,
      view: sp?.view as ReaderMode | undefined,
    })
    data = result.data
  } catch (error) {
    if (error instanceof EmptyObservatorySourceError) notFound()
    throw error
  }

  return (
    <div>
      <Suspense fallback={null}>
        <Observatory data={data} availableSources={availableSources} basePath="/observatory" />
      </Suspense>
    </div>
  )
}
