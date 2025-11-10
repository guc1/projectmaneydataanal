import { ArrowRight, Database, Filter } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { UploadPanel } from '@/components/upload/upload-panel';
import { FilterBuilder } from '@/components/filter/filter-builder';

const featureHighlights = [
  {
    title: 'Upload once, reuse everywhere',
    description:
      'Persisted uploads power every workflow: validation, enrichment, filter suggestions, and anomaly spotting.'
  },
  {
    title: 'Filter like a quant',
    description:
      'Compose precise rules for any metric using ranges, comparisons, and pattern matching tailored to the column data type.'
  },
  {
    title: 'Export for deeper analysis',
    description:
      'Download narrowed cohorts in one click to continue the investigation in Python, a notebook, or spreadsheets.'
  }
];

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-6 pb-20 pt-16">
      <section className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <div className="space-y-6">
          <p className="text-sm uppercase tracking-[0.3em] text-accent">Polymarket intelligence cockpit</p>
          <h1 className="text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
            Analyse wallets with clarity, context, and speed.
          </h1>
          <p className="text-lg text-muted-foreground">
            Upload the leaderboard exports, enrich them with documentation, and filter down to the exact set of accounts that
            deserve your attention. Everything lives in a streamlined, dark-first experience designed for focused analysis.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="gap-2">
              <a href="#upload">
                <Database size={18} /> Upload data
              </a>
            </Button>
            <Button asChild variant="outline" size="lg" className="gap-2">
              <a href="#find-accounts">
                <Filter size={18} /> Find accounts
              </a>
            </Button>
          </div>
        </div>
        <div className="grid gap-4">
          {featureHighlights.map((highlight) => (
            <Card key={highlight.title} className="border-white/10 bg-gradient-to-br from-white/10 to-white/5">
              <CardTitle>{highlight.title}</CardTitle>
              <CardDescription className="mt-2 text-sm text-muted-foreground">
                {highlight.description}
              </CardDescription>
            </Card>
          ))}
        </div>
      </section>

      <section id="upload">
        <UploadPanel />
      </section>

      <section id="find-accounts" className="mt-20">
        <div className="max-w-3xl space-y-3">
          <h2 className="text-2xl font-semibold text-foreground">Find accounts</h2>
          <p className="text-base text-muted-foreground">
            Explore every metric from the dataset, read contextual tooltips, and configure multi-step filters that narrow the
            dataset to the wallets you want to study.
          </p>
        </div>
        <FilterBuilder />
      </section>

      <footer className="mt-24 flex flex-wrap items-center justify-between gap-4 border-t border-white/5 pt-8 text-sm text-muted-foreground">
        <p>Need something custom? Extend the workspace with new dashboards, AI co-pilots, or streaming metrics.</p>
        <Button asChild variant="outline" size="sm" className="gap-2">
          <a href="mailto:team@maney.ai">
            Get in touch <ArrowRight size={16} />
          </a>
        </Button>
      </footer>
    </main>
  );
}
