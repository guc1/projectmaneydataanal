import type { ColumnMetadata } from '@/data/column-metadata';

type MetricCategoryGroup = {
  id: string;
  label: string;
  metrics: string[];
};

export const METRIC_CATEGORY_GROUPS: MetricCategoryGroup[] = [
  {
    id: 'other',
    label: 'Other',
    metrics: [
      'rank',
      'proxyWallet',
      'userName',
      'xUsername',
      'verifiedBadge',
      'vol',
      'pnl',
      'profileImage',
      'total_volume',
      'position_to_volume_ratio',
      'gaintovolume_pct',
      'losstovolume_pct',
      'nettotaltovolume_pct',
      'gaintoloss'
    ]
  },
  {
    id: 'delta',
    label: 'Delta',
    metrics: [
      'mean_delta_1d',
      'mean_delta_1w',
      'mean_delta_1m',
      'mean_delta_all',
      'smoothness_1d',
      'smoothness_1w',
      'smoothness_1m',
      'smoothness_all',
      'plus_delta_pct_1d',
      'plus_delta_pct_1w',
      'plus_delta_pct_1m',
      'plus_delta_pct_all',
      'min_delta_pct_1d',
      'min_delta_pct_1w',
      'min_delta_pct_1m',
      'min_delta_pct_all',
      'gain_1d',
      'gain_1w',
      'gain_1m',
      'gain_all',
      'loss_1d',
      'loss_1w',
      'loss_1m',
      'loss_all',
      'net_total_1d',
      'net_total_1w',
      'net_total_1m',
      'net_total_all'
    ]
  },
  {
    id: 'open',
    label: 'Open',
    metrics: [
      'OPEN_trades',
      'OPEN_largestWin',
      'OPEN_views',
      'OPEN_joinDate',
      'OPEN_pos_count',
      'OPEN_win_loss_ratio',
      'OPEN_avg_percentPnl_win',
      'OPEN_avg_percentPnl_loss',
      'OPEN_portfolio_nrr_all',
      'OPEN_pnl_std_all',
      'OPEN_risk_adjusted_score_all',
      'OPEN_avg_shares_win',
      'OPEN_avg_shares_loss',
      'OPEN_avg_avgPrice_win',
      'OPEN_median_avgPrice_win',
      'OPEN_avg_curPrice_win',
      'OPEN_median_curPrice_win',
      'OPEN_avg_avgPrice_loss',
      'OPEN_median_avgPrice_loss',
      'OPEN_avg_curPrice_loss',
      'OPEN_median_curPrice_loss',
      'OPEN_yes_no_ratio',
      'OPEN_eventId_spread_pct'
    ]
  },
  {
    id: 'closed',
    label: 'Closed',
    metrics: [
      'CLOSED_win_loss_ratio',
      'CLOSED_avg_percentPnl_win',
      'CLOSED_avg_percentPnl_loss',
      'CLOSED_portfolio_nrr_all',
      'CLOSED_pnl_std_all',
      'CLOSED_risk_adjusted_score_all',
      'CLOSED_avg_shares_win',
      'CLOSED_avg_shares_loss',
      'CLOSED_avg_realizedPnl_win',
      'CLOSED_median_realizedPnl_win',
      'CLOSED_avg_realizedPnl_loss',
      'CLOSED_median_realizedPnl_loss',
      'CLOSED_avg_avgPrice_win',
      'CLOSED_median_avgPrice_win',
      'CLOSED_avg_avgPrice_loss',
      'CLOSED_median_avgPrice_loss',
      'CLOSED_yes_no_ratio',
      'CLOSED_eventSlug_spread_pct',
      'CLOSED_arbitrage_pct',
      'CLOSED_zero_ratio',
      'CLOSED_<2%_wins_ratio',
      'CLOSED_2%to6%_wins_ratio',
      'CLOSED_6%to10%_wins_ratio',
      'CLOSED_10%to20%_wins_ratio',
      'CLOSED_20%to40%_wins_ratio',
      'CLOSED_40%to80%_wins_ratio',
      'CLOSED_80%to90%_wins_ratio',
      'CLOSED_90%to100%_wins_ratio'
    ]
  },
  {
    id: 'activity',
    label: 'Activity',
    metrics: [
      'ACTIVITY_tradecount',
      'ACTIVITY_avgintbettrades_min',
      'ACTIVITY_day_coverage_avg_pct',
      'ACTIVITY_day_coverage_max_pct',
      'ACTIVITY_concentration_score_avg',
      'ACTIVITY_avg_size_buy',
      'ACTIVITY_median_size_buy',
      'ACTIVITY_avg_size_sell',
      'ACTIVITY_median_size_sell',
      'ACTIVITY_avg_usdc_buy',
      'ACTIVITY_median_usdc_buy',
      'ACTIVITY_avg_usdc_sell',
      'ACTIVITY_median_usdc_sell',
      'ACTIVITY_avg_price_trade',
      'ACTIVITY_priceextremes_pct',
      'ACTIVITY_arbitrage_count',
      'ACTIVITY_arbitrage_trade_share_pct',
      'ACTIVITY_arbitrage_usd_earned_total',
      'ACTIVITY_quick_0_1s_pct',
      'ACTIVITY_quick_1_5s_pct',
      'ACTIVITY_quick_5_20s_pct',
      'ACTIVITY_quick_20_60s_pct',
      'ACTIVITY_quick_60_600s_pct',
      'ACTIVITY_quick_600_3600s_pct',
      'ACTIVITY_quick_3600_86400s_pct',
      'ACTIVITY_quick_ge_86400s_pct',
      'ACTIVITY_quick_profit_0_5s_usd',
      'ACTIVITY_quick_profit_5_20s_usd',
      'ACTIVITY_fillup_pct_of_trades',
      'ACTIVITY_fillup_usd_earned_total',
      'ACTIVITY_buy_gt_95_pct_of_trades',
      'ACTIVITY_merge_pct_all_types',
      'ACTIVITY_split_pct_all_types',
      'ACTIVITY_buy_sell_ratio',
      'ACTIVITY_rewards_usd_total',
      'ACTIVITY_rewards_share_of_approx_netprofit_pct',
      'ACTIVITY_mm_opposite_round_trip_5s_pct',
      'ACTIVITY_mm_simultaneous_dual_side_5s_pct'
    ]
  }
];

export const mapCategoryColumns = (
  available: ColumnMetadata[],
  metrics: string[]
): ColumnMetadata[] =>
  metrics
    .map((metric) => available.find((column) => column.metric === metric))
    .filter((column): column is ColumnMetadata => Boolean(column));

