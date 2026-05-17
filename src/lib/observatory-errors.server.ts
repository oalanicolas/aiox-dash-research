import "server-only"

export class EmptyObservatorySourceError extends Error {
  constructor(public source: string) {
    super(`Observatory source has no runs: ${source}`)
    this.name = "EmptyObservatorySourceError"
  }
}
