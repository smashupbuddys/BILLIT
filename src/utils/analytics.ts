// Analytics utility functions
    export const calculateGrowthRate = (current: number, previous: number): number => {
      try {
        if (previous === 0) return 0;
        return ((current - previous) / previous) * 100;
      } catch (error) {
        console.error('Error in calculateGrowthRate:', error);
        return 0;
      }
    };

    export const calculateMovingAverage = (data: number[], window: number): number[] => {
      try {
        const result = [];
        for (let i = 0; i < data.length - window + 1; i++) {
          const windowSlice = data.slice(i, i + window);
          const average = windowSlice.reduce((a, b) => a + b) / window;
          result.push(average);
        }
        return result;
      } catch (error) {
        console.error('Error in calculateMovingAverage:', error);
        return [];
      }
    };

    export const forecastLinearRegression = (data: Array<{ x: number; y: number }>): {
      forecast: number[];
      equation: { slope: number; intercept: number };
    } => {
      try {
        const n = data.length;
        const sumX = data.reduce((acc, point) => acc + point.x, 0);
        const sumY = data.reduce((acc, point) => acc + point.y, 0);
        const sumXY = data.reduce((acc, point) => acc + point.x * point.y, 0);
        const sumXX = data.reduce((acc, point) => acc + point.x * point.x, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        // Generate forecast points
        const forecast = data.map((point) => slope * point.x + intercept);
        
        return {
          forecast,
          equation: { slope, intercept }
        };
      } catch (error) {
        console.error('Error in forecastLinearRegression:', error);
        return {
          forecast: [],
          equation: { slope: 0, intercept: 0 }
        };
      }
    };

    export const calculateSeasonality = (data: number[], period: number): number[] => {
      try {
        const seasons = Math.floor(data.length / period);
        const seasonalIndices = new Array(period).fill(0);
        
        // Calculate average for each season
        for (let i = 0; i < period; i++) {
          let sum = 0;
          let count = 0;
          for (let j = 0; j < seasons; j++) {
            const idx = j * period + i;
            if (idx < data.length) {
              sum += data[idx];
              count++;
            }
          }
          seasonalIndices[i] = sum / count;
        }
        
        // Normalize indices
        const avgIndex = seasonalIndices.reduce((a, b) => a + b) / period;
        return seasonalIndices.map(index => index / avgIndex);
      } catch (error) {
        console.error('Error in calculateSeasonality:', error);
        return [];
      }
    };

    export const calculateMetrics = (data: any[]) => {
      try {
        // Implementation for various metrics calculations
        return {
          salesVelocity: calculateSalesVelocity(data),
          profitMargins: calculateProfitMargins(data),
          customerMetrics: calculateCustomerMetrics(data),
          inventoryMetrics: calculateInventoryMetrics(data),
          staffMetrics: calculateStaffMetrics(data),
          operationalKPIs: calculateOperationalKPIs(data),
          marketMetrics: calculateMarketMetrics(data)
        };
      } catch (error) {
        console.error('Error in calculateMetrics:', error);
        return {};
      }
    };

    // Helper functions for specific metrics
    const calculateSalesVelocity = (data: any[]) => {
      try {
        // Implementation
      } catch (error) {
        console.error('Error in calculateSalesVelocity:', error);
      }
    };

    const calculateProfitMargins = (data: any[]) => {
      try {
        // Implementation
      } catch (error) {
        console.error('Error in calculateProfitMargins:', error);
      }
    };

    const calculateCustomerMetrics = (data: any[]) => {
      try {
        // Implementation
      } catch (error) {
        console.error('Error in calculateCustomerMetrics:', error);
      }
    };

    const calculateInventoryMetrics = (data: any[]) => {
      try {
        // Implementation
      } catch (error) {
        console.error('Error in calculateInventoryMetrics:', error);
      }
    };

    const calculateStaffMetrics = (data: any[]) => {
      try {
        // Implementation
      } catch (error) {
        console.error('Error in calculateStaffMetrics:', error);
      }
    };

    const calculateOperationalKPIs = (data: any[]) => {
      try {
        // Implementation
      } catch (error) {
        console.error('Error in calculateOperationalKPIs:', error);
      }
    };

    const calculateMarketMetrics = (data: any[]) => {
      try {
        // Implementation
      } catch (error) {
        console.error('Error in calculateMarketMetrics:', error);
      }
    };
