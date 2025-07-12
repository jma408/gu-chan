// React.js TQQQ Technical Analysis Chart using Chart.js
// Assumes CSV data placed in /public/tqqq.csv

import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import Papa from "papaparse";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend
);

// MACD calculation helper
function calculateMACD(
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

export default function TqqqChart() {
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    fetch("/tqqq.csv")
      .then((res) => res.text())
      .then((text) => {
        const parsed = Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          trimHeaders: true,
        });

        const cleaned = parsed.data.map((row) => {
          const normalized = {};
          for (let key in row) {
            normalized[key.trim()] = row[key];
          }
          return normalized;
        });

        const rows = cleaned.filter((row) => row.Date && row.Close);
        rows.reverse();

        const labels = rows.map((r) => r.Date);
        const closePrices = rows.map((r) => parseFloat(r.Close));
        const volumes = rows.map((r) => parseFloat(r.Volume.replace(/,/g, "")));

        const { dif, dea, macd } = calculateMACD(closePrices);

        const buySignals = [];
        const sellSignals = [];
        const thirdBuySignals = [];
        const divergenceSignals = [];
        const volumeBars = volumes.map((v, i) => ({ x: labels[i], y: v }));
        const annotations = [];

        // Simplified central zone (中枢) detection (3 consecutive overlapping bars)
        const centralZones = [];
        for (let i = 2; i < closePrices.length; i++) {
          const highs = [rows[i - 2], rows[i - 1], rows[i]].map((r) =>
            parseFloat(r.High)
          );
          const lows = [rows[i - 2], rows[i - 1], rows[i]].map((r) =>
            parseFloat(r.Low)
          );
          const highMin = Math.min(...highs);
          const lowMax = Math.max(...lows);
          if (highMin > lowMax) {
            centralZones.push({ x: labels[i], high: highMin, low: lowMax });
          }
        }

        for (let i = 2; i < dif.length; i++) {
          const goldCross = dif[i - 1] < dea[i - 1] && dif[i] > dea[i];
          const deadCross = dif[i - 1] > dea[i - 1] && dif[i] < dea[i];
          if (goldCross) buySignals.push({ x: labels[i], y: closePrices[i] });
          if (deadCross) sellSignals.push({ x: labels[i], y: closePrices[i] });

          const macdIncreasing =
            macd[i - 2] < macd[i - 1] && macd[i - 1] < macd[i];
          const higherLow = closePrices[i] > closePrices[i - 2];
          if (macdIncreasing && higherLow && dif[i] > dea[i]) {
            thirdBuySignals.push({ x: labels[i], y: closePrices[i] });
          }

          if (
            i > 10 &&
            closePrices[i] > closePrices[i - 5] &&
            dif[i] < dif[i - 5]
          ) {
            divergenceSignals.push({
              x: labels[i],
              y: closePrices[i],
              type: "bearish",
            });
          } else if (
            i > 10 &&
            closePrices[i] < closePrices[i - 5] &&
            dif[i] > dif[i - 5]
          ) {
            divergenceSignals.push({
              x: labels[i],
              y: closePrices[i],
              type: "bullish",
            });
          }
        }

        const bullishDiv = divergenceSignals.filter(
          (d) => d.type === "bullish"
        );
        const bearishDiv = divergenceSignals.filter(
          (d) => d.type === "bearish"
        );

        setChartData({
          labels,
          datasets: [
            {
              label: "TQQQ Close Price",
              data: closePrices,
              borderColor: "blue",
              backgroundColor: "rgba(0, 0, 255, 0.2)",
              pointRadius: 1,
              tension: 0.3,
              yAxisID: "y",
            },
            {
              label: "Volume",
              type: "bar",
              data: volumeBars,
              backgroundColor: "rgba(150, 150, 150, 0.3)",
              yAxisID: "y2",
            },
            {
              label: "MACD DIF",
              data: dif,
              borderColor: "orange",
              pointRadius: 0,
              borderWidth: 1,
              tension: 0.2,
              yAxisID: "y1",
            },
            {
              label: "MACD DEA",
              data: dea,
              borderColor: "purple",
              pointRadius: 0,
              borderWidth: 1,
              tension: 0.2,
              yAxisID: "y1",
            },
            {
              label: "MACD Histogram",
              data: macd,
              type: "bar",
              backgroundColor: "rgba(100, 100, 100, 0.3)",
              yAxisID: "y1",
            },
            {
              label: "Buy Signals",
              data: buySignals,
              pointRadius: 5,
              pointBackgroundColor: "green",
              showLine: false,
              yAxisID: "y",
            },
            {
              label: "Sell Signals",
              data: sellSignals,
              pointRadius: 5,
              pointBackgroundColor: "red",
              showLine: false,
              yAxisID: "y",
            },
            {
              label: "Third Buy Confirmed",
              data: thirdBuySignals,
              pointRadius: 6,
              pointBackgroundColor: "lime",
              showLine: false,
              yAxisID: "y",
            },
            {
              label: "Bullish Divergence",
              data: bullishDiv,
              pointRadius: 6,
              pointBackgroundColor: "cyan",
              showLine: false,
              yAxisID: "y",
            },
            {
              label: "Bearish Divergence",
              data: bearishDiv,
              pointRadius: 6,
              pointBackgroundColor: "magenta",
              showLine: false,
              yAxisID: "y",
            },
          ],
        });
      })
      .catch((error) => {
        console.error("Error loading CSV:", error);
      });
  }, []);

  if (!chartData) return <div className="text-center p-4">Loading...</div>;

  return (
    <div className="p-4 w-full" style={{ height: "600px", width: "1200px" }}>
      <h2 className="text-xl font-bold mb-4">
        TQQQ Price Chart + MACD + Buy/Sell Markers
      </h2>
      <Line
        data={chartData}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: "index", intersect: false },
          stacked: false,
          plugins: {
            legend: { position: "top" },
            title: {
              display: true,
              text: "TQQQ Historical Close Prices with MACD + Trade Points",
            },
            tooltip: {
              callbacks: {
                label: function (context) {
                  const label = context.dataset.label || "";
                  return `${label}: ${context.raw?.y ?? context.raw}`;
                },
              },
            },
          },
          scales: {
            y: {
              type: "linear",
              display: true,
              position: "left",
              title: {
                display: true,
                text: "Price",
              },
            },
            y1: {
              type: "linear",
              display: true,
              position: "right",
              title: {
                display: true,
                text: "MACD",
              },
              grid: {
                drawOnChartArea: false,
              },
            },
            y2: {
              type: "linear",
              display: true,
              position: "right",
              title: {
                display: true,
                text: "Volume",
              },
              grid: {
                drawOnChartArea: false,
              },
              stacked: true,
              offset: true,
            },
          },
        }}
      />
    </div>
  );
}
