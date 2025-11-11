import { CollapsibleSection } from '@/components/layout/collapsible-section';
import { AnalysisBuilder } from '@/components/analysis/analysis-builder';

export default function AnalysisPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <header className="space-y-3 text-center sm:text-left">
        <p className="text-sm uppercase tracking-[0.3em] text-accent">Analysis</p>
        <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">Craft anomaly signals for wallets</h1>
        <p className="text-base text-muted-foreground">
          Build statistical workflows that blend multiple metrics and surface wallets behaving outside the norm.
        </p>
      </header>

      <div className="mt-12 grid gap-4">
        <CollapsibleSection title="How it works" defaultOpen>
          <div className="space-y-3">
            <p>
              Combine outlier detection steps into a named formula. Each workflow runs on-demand across the uploaded dataset and
              generates a brand new column.
            </p>
            <p>
              Start with a metric, choose a statistical analysis, then chain additional steps together with arithmetic operators.
              Save frequently used steps or entire chains as presets to reuse across different datasets.
            </p>
          </div>
        </CollapsibleSection>
        <CollapsibleSection title="Coming soon">
          <p>More statistical techniques (percentile bands, rolling momentum, peer comparisons) will join this library soon.</p>
        </CollapsibleSection>
      </div>

      <section className="mt-16">
        <AnalysisBuilder />
      </section>
    </main>
  );
}
