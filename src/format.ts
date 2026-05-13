const compactFormatter = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1
})
const standardFormatter = new Intl.NumberFormat("en", { maximumFractionDigits: 1 })

export const formatNumber = (value: number): string =>
  Math.abs(value) >= 10000 ? compactFormatter.format(value) : standardFormatter.format(value)

export const formatPercent = (value: number): string => `${(value * 100).toFixed(2)}%`

const signed = (value: number): string => (value >= 0 ? "+" : "")

export const formatVsPrior = (current: number, previous: number): string => {
  const delta = current - previous
  return `${signed(delta)}${formatNumber(delta)} vs prior`
}

export const formatSignedPoints = (value: number): string => `${signed(value)}${(value * 100).toFixed(2)} pts`

export type Unit = "count" | "percent" | "days"

export const formatByUnit = (value: number, unit: Unit): string => {
  if (unit === "percent") return formatPercent(value)
  if (unit === "days") return `${value}d`
  return formatNumber(value)
}
