import { RegistryProvider } from "@effect/atom-react"
import { StrictMode, Suspense } from "react"
import { createRoot } from "react-dom/client"
import { App } from "./App.tsx"
import xrankConfig from "../xrank.config.ts"
import "./styles.css"

const rootElement = document.getElementById("root")

if (rootElement === null) {
  throw new Error("Root element not found")
}

createRoot(rootElement).render(
  <StrictMode>
    <RegistryProvider>
      <Suspense fallback={<DashboardLoading />}>
        <App />
      </Suspense>
    </RegistryProvider>
  </StrictMode>
)

function DashboardLoading() {
  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">X leaderboard</p>
          <h1>{xrankConfig.title ?? "X Rank"}</h1>
          <p className="hero-text">Loading metrics snapshot…</p>
        </div>
      </section>
    </main>
  )
}
