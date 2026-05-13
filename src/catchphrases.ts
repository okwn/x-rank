export const CATCHPHRASES: Record<string, string> = {
  thdxr: "bald beard look is his dev rel meme face — keep up!"
}

export const catchphraseFor = (handle: string): string | undefined => CATCHPHRASES[handle.toLowerCase()]
