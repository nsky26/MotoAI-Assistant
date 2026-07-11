/**
 * MotoAI API Client helper.
 * Dynamically resolves relative paths or absolute production Render hostnames.
 */
export function getApiUrl(path: string): string {
  const baseUrl = import.meta.env.VITE_API_URL || "";
  if (baseUrl) {
    return `${baseUrl.replace(/\/$/, "")}${path}`;
  }
  return path;
}
