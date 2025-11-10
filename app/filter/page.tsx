import { CollapsibleSection } from '@/components/layout/collapsible-section';
import { FilterBuilder } from '@/components/filter/filter-builder';

export default function FilterPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <header className="space-y-3 text-center sm:text-left">
        <p className="text-sm uppercase tracking-[0.3em] text-accent">Filter</p>
        <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">Focus on the wallets that matter</h1>
        <p className="text-base text-muted-foreground">
          Apply precise rules to the uploaded dataset and export curated cohorts for deeper dives.
        </p>
      </header>

      <div className="mt-12 grid gap-4">
        <CollapsibleSection title="Filter" defaultOpen>
          <p>hello if you see this</p>
        </CollapsibleSection>
        <CollapsibleSection title="Analysis">
          <p>hello if you see this</p>
        </CollapsibleSection>
      </div>

      <section className="mt-16">
        <FilterBuilder />
      </section>
    </main>
  );
}
