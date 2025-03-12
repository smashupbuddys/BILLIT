import React from 'react';
import MetricsCard from './MetricsCard';
import { EnhancedChart } from './EnhancedChart';
import { DateRangeFilter } from './DateRangeFilter';
import { calculateTrends, processChartData } from '../../utils/metricsHelpers';
import { Transaction } from '../../lib/types';

interface MetricsSectionProps {
  transactions: Transaction[];
  creditLimit?: number;
  startDate: string;
  endDate: string;
  onDateChange: (start: string, end: string) => void;
}

export const MetricsSection: React.FC<MetricsSectionProps> = ({
  transactions,
  creditLimit,
  startDate,
  endDate,
  onDateChange
}) => {
  const {
    totalDebit,
    totalCredit,
    currentBalance,
    gstSummary,
    trends
  } = calculateTrends(transactions);

  const chartData = processChartData(transactions);

  const handlePresetSelect = (preset: string) => {
    const now = new Date();
    let start = new Date();
    let end = now;

    switch (preset) {
      case 'this-month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'last-month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'last-3-months':
        start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case 'last-6-months':
        start = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        break;
      case 'this-fy':
        const month = now.getMonth();
        const year = now.getFullYear();
        start = new Date(month < 3 ? year - 1 : year, 3, 1);
        break;
    }

    onDateChange(
      start.toISOString().split('T')[0],
      end.toISOString().split('T')[0]
    );
  };

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricsCard
          title="Total Debit"
          amount={totalDebit.current}
          percentageChange={totalDebit.percentageChange}
          trend={totalDebit.trend}
          theme="red"
          breakdown={[
            { label: 'Base Amount', value: totalDebit.baseAmount },
            { label: 'GST Amount', value: totalDebit.gstAmount }
          ]}
          sparklineData={totalDebit.history}
        />

        <MetricsCard
          title="Total Credit"
          amount={totalCredit.current}
          percentageChange={totalCredit.percentageChange}
          trend={totalCredit.trend}
          theme="green"
          breakdown={[
            { label: 'Cash', value: totalCredit.cash },
            { label: 'GST', value: totalCredit.gst },
            { label: 'Regular', value: totalCredit.regular }
          ]}
          sparklineData={totalCredit.history}
        />

        <MetricsCard
          title="Current Balance"
          amount={Math.abs(currentBalance.current)}
          percentageChange={currentBalance.percentageChange}
          trend={currentBalance.trend}
          theme={currentBalance.current >= 0 ? 'red' : 'blue'}
          subtitle={`${currentBalance.current >= 0 ? 'DR' : 'CR'}`}
          breakdown={[
            { label: 'Historical High', value: currentBalance.high },
            { label: 'Historical Low', value: currentBalance.low }
          ]}
          sparklineData={currentBalance.history}
        />

        <MetricsCard
          title="GST Summary"
          amount={gstSummary.total}
          percentageChange={gstSummary.percentageChange}
          trend={gstSummary.trend}
          theme="purple"
          breakdown={[
            { label: 'Transactions', value: gstSummary.count },
            { label: 'Average', value: gstSummary.average }
          ]}
          sparklineData={gstSummary.history}
        />
      </div>

      {/* Date Filter */}
      <DateRangeFilter
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={(date) => onDateChange(date, endDate)}
        onEndDateChange={(date) => onDateChange(startDate, date)}
        onPresetSelect={handlePresetSelect}
        onClear={() => onDateChange('', '')}
      />

      {/* Enhanced Chart */}
      <EnhancedChart
        data={chartData}
        creditLimit={creditLimit}
        onPeriodClick={(period) => {
          console.log('Clicked period:', period);
          // Implement drill-down view here
        }}
      />
    </div>
  );
};
