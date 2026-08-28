export const PLUGIN_VERSION = '0.4.1'

export function isNewerVersion(current: string, target: string): boolean {
  const currentParts = current.split('.').map((p) => parseInt(p, 10) || 0)
  const targetParts = target.split('.').map((p) => parseInt(p, 10) || 0)
  for (let i = 0; i < Math.max(currentParts.length, targetParts.length); i++) {
    const c = currentParts[i] ?? 0
    const t = targetParts[i] ?? 0
    if (t > c) return true
    if (t < c) return false
  }
  return false
}
