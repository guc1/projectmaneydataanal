export type ColumnDataType = 'numeric' | 'text' | 'percent' | 'currency' | 'ratio';

export interface ColumnMetadata {
  metric: string;
  what_it_is: string;
  data_type: ColumnDataType;
  higher_is: 'better' | 'worse' | 'depends';
  units_or_range?: string;
  average?: number;
  median?: number;
}

export const columnMetadata: ColumnMetadata[] = [
  {
    metric: 'vol',
    what_it_is: 'Total trading volume handled by the wallet within the selected time period.',
    data_type: 'currency',
    higher_is: 'depends',
    units_or_range: 'USDC',
    average: 32500.68,
    median: 18475.32
  },
  {
    metric: 'pnl',
    what_it_is: 'Profit or loss realised across the measured interval.',
    data_type: 'currency',
    higher_is: 'better',
    units_or_range: 'USDC',
    average: 2840.17,
    median: 1024.33
  },
  {
    metric: 'smoothness_1w',
    what_it_is: 'Stability score of the wallet performance over a week.',
    data_type: 'ratio',
    higher_is: 'better',
    units_or_range: '0 — 1',
    average: 0.54,
    median: 0.49
  },
  {
    metric: 'OPEN_win_loss_ratio',
    what_it_is: 'Ratio of winning to losing open positions.',
    data_type: 'ratio',
    higher_is: 'better',
    units_or_range: '0 — 5',
    average: 1.8,
    median: 1.3
  },
  {
    metric: 'ACTIVITY_tradecount',
    what_it_is: 'Total number of trades executed in the interval.',
    data_type: 'numeric',
    higher_is: 'depends',
    units_or_range: 'count',
    average: 482,
    median: 215
  },
  {
    metric: 'ACTIVITY_quick_0_1s_pct',
    what_it_is: 'Share of trades that were completed within 0-1 seconds (speed indicator).',
    data_type: 'percent',
    higher_is: 'better',
    units_or_range: '0% — 100%',
    average: 12.5,
    median: 8.6
  }
];
