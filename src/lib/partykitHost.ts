/** Hostname only (no protocol, no path). Example: `my-project.mygithubhandle.partykit.dev` */
export function getPartyKitHost(): string {
  const raw = process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? "127.0.0.1:1999";
  return raw.replace(/^(https?|wss?):\/\//, "").replace(/\/$/, "");
}
