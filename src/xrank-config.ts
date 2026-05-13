export interface RosterEntry {
  readonly handle: string
  readonly team?: string
  readonly color?: `#${string}`
}

export interface ScheduleConfig {
  readonly every?: string
  readonly command?: string
  readonly label?: string
}

export interface XRankConfig {
  readonly title?: string
  readonly roster: ReadonlyArray<RosterEntry>
  readonly schedule?: ScheduleConfig
}

export const defineXRankConfig = <const Config extends XRankConfig>(config: Config): Config => config
