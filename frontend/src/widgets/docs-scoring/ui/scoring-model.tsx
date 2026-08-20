import type { ScoringModelDto } from '@dsh-fish/backend/application/use-case/describe-scoring.js'
import type { MaintenanceStatus } from '@/entities/artifact/model/types'
import { useT, type Translator } from '@/shared/config/i18n'

/**
 * The published scoring model, rendered as tables.
 *
 * Every number and formula string comes from `DescribeScoring` — the same
 * constant `GET /api/v1/scoring` serializes — so editing the model in the
 * domain updates this island without touching it. Only the labels are copy.
 */
export function ScoringModel({ scoring }: { scoring: ScoringModelDto }) {
  const t = useT()
  return <ScoringTables scoring={scoring} t={t} />
}

function ScoringTables({ scoring, t }: { scoring: ScoringModelDto; t: Translator }) {
  const { weights, popularity, maintenance, quality, grades } = scoring
  const windows = maintenance.windowsDays as Partial<Record<MaintenanceStatus, number>>

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold tracking-tight text-balance">{t('docs.scoring.dimensions')}</h2>
      <p className="mt-3 overflow-x-auto rounded-xl border border-border bg-card p-4 font-mono text-[13px] leading-relaxed">
        score = round({weights.popularity} · popularity + {weights.maintenance} · maintenance +{' '}
        {weights.quality} · quality)
      </p>
      <ScoringTable
        head={[t('docs.scoring.dimension'), t('docs.scoring.weight')]}
        rows={(
          [
            ['popularity', weights.popularity],
            ['maintenance', weights.maintenance],
            ['quality', weights.quality],
          ] as const
        ).map(([dimension, weight]) => [
          t(`docs.scoring.dim.${dimension}`),
          <span key={dimension} className="tabular-nums">
            {weight}
          </span>,
        ])}
      />

      <h3 className="mt-8 text-sm font-semibold tracking-tight">{t('docs.scoring.dim.popularity')}</h3>
      <dl className="mt-3 grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-1.5 text-sm">
        <dt className="text-muted-foreground">{t('docs.scoring.rawSignal')}</dt>
        <dd>
          <code className="font-mono text-[13px]">{popularity.raw}</code>
        </dd>
        <dt className="text-muted-foreground">{t('docs.scoring.scale')}</dt>
        <dd>
          <code className="font-mono text-[13px]">{popularity.scale}</code>
        </dd>
        <dt className="text-muted-foreground">{t('docs.scoring.saturation')}</dt>
        <dd className="tabular-nums">{popularity.saturation.toLocaleString('en-US')}</dd>
      </dl>

      <h3 className="mt-8 text-sm font-semibold tracking-tight">{t('docs.scoring.dim.maintenance')}</h3>
      <ScoringTable
        head={[t('docs.scoring.status'), t('docs.scoring.window'), t('docs.scoring.dimensionScore')]}
        rows={(Object.entries(maintenance.dimensionScores) as [MaintenanceStatus, number][]).map(
          ([status, dimensionScore]) => [
            t(`artifact.maintenance.${status}`),
            windows[status] === undefined
              ? t('docs.scoring.beyondWindow')
              : t('docs.scoring.withinDays', { days: windows[status] }),
            <span key={status} className="tabular-nums">
              {dimensionScore}
            </span>,
          ],
        )}
      />

      <h3 className="mt-8 text-sm font-semibold tracking-tight">{t('docs.scoring.dim.quality')}</h3>
      <ScoringTable
        head={[t('docs.scoring.signal'), t('docs.scoring.points')]}
        rows={(
          [
            ['verified', 'artifact.verified'],
            ['readme', 'artifact.readme'],
            ['license', 'artifact.license'],
            ['author', 'artifact.author'],
          ] as const
        ).map(([signal, labelKey]) => [
          t(labelKey),
          <span key={signal} className="tabular-nums">
            {quality.points[signal]}
          </span>,
        ])}
      />

      <h3 className="mt-8 text-sm font-semibold tracking-tight">{t('docs.scoring.gradesTitle')}</h3>
      <ScoringTable
        head={[t('docs.scoring.grade'), t('docs.scoring.minScore')]}
        rows={[
          ...(Object.entries(grades) as [string, number][]).map(([grade, min]) => [
            grade,
            <span key={grade} className="tabular-nums">
              {min}
            </span>,
          ]),
          ['C', t('docs.scoring.belowMin', { score: grades.B })],
        ]}
      />
    </section>
  )
}

function ScoringTable({
  head,
  rows,
}: {
  head: readonly React.ReactNode[]
  rows: readonly (readonly React.ReactNode[])[]
}) {
  return (
    <table className="mt-3 w-full text-left text-sm">
      <thead>
        <tr className="border-b border-border text-xs text-muted-foreground">
          {head.map((cell, index) => (
            <th key={index} scope="col" className="py-1.5 pr-4 font-medium">
              {cell}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={rowIndex} className="border-b border-border/60 last:border-0">
            {row.map((cell, cellIndex) => (
              <td key={cellIndex} className="py-1.5 pr-4">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
