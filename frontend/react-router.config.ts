import type { Config } from '@react-router/dev/config'

export default {
  /**
   * The framework requires every route module to live inside `appDirectory`, so
   * it points at `src` — the whole FSD tree. The `app` layer still owns the real
   * entry modules; `src/root.tsx` and `src/routes.ts` are one-line re-exports
   * that satisfy the framework's file convention without moving app setup out
   * of its layer.
   */
  appDirectory: 'src',
  /** Server-rendered: a plugin directory lives or dies on being indexable. */
  ssr: true,
} satisfies Config
