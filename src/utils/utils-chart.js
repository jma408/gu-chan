export function calculateMACD(
  prices,
  shortPeriod = 12,
  longPeriod = 26,
  signalPeriod = 9
) {
  const ema = (data, period) => {
    const k = 2 / (period + 1);
    return data.reduce((acc, val, idx) => {
      if (idx === 0) {
        acc.push(val);
      } else {
        acc.push(val * k + acc[idx - 1] * (1 - k));
      }
      return acc;
    }, []);
  };
  const shortEMA = ema(prices, shortPeriod);
  const longEMA = ema(prices, longPeriod);
  const dif = shortEMA.map((val, i) => val - longEMA[i]);
  const dea = ema(dif, signalPeriod);
  const macd = dif.map((val, i) => (val - dea[i]) * 2);
  return { dif, dea, macd };
}
