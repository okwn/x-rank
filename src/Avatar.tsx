import type { Account } from "./data.ts"

export type AvatarSize = number | "sm" | "md" | "xl"

export const initials = (name: string): string =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)

const HIGH_RES = (url: string) => url.replace("_normal", "_400x400")

export function Avatar({
  account,
  size = "sm",
  variant = "default"
}: {
  readonly account: Account
  readonly size?: AvatarSize
  readonly variant?: "default" | "feed"
}) {
  const numeric = typeof size === "number" ? size : undefined
  const sizeClass = size === "xl" ? "avatar-xl" : size === "md" ? "avatar-md" : ""
  const baseClass = variant === "feed" ? "feed-avatar" : "avatar"
  const className = sizeClass && variant === "default" ? `${baseClass} ${sizeClass}` : baseClass
  const dimStyle = numeric !== undefined ? { width: numeric, height: numeric } : undefined

  if (account.profileImageUrl) {
    const src = size === "xl" ? HIGH_RES(account.profileImageUrl) : account.profileImageUrl
    return <img alt={account.name} className={className} loading="lazy" src={src} style={dimStyle} />
  }
  const fallbackClass = variant === "feed" ? `${className} feed-avatar-fallback` : className
  return (
    <div className={fallbackClass} style={{ ...dimStyle, background: account.color }}>
      {initials(account.name)}
    </div>
  )
}
