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
  BarElement,
  PointElement,
  LineElement,
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
        const labels = rows.map((r) => r.Date);
        const closePrices = rows.map((r) => parseFloat(r.Close));

        // MACD calculation
        const { dif, dea, macd } = calculateMACD(closePrices);

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
      <h2 className="text-xl font-bold mb-4">TQQQ Price Chart + MACD</h2>
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
              text: "TQQQ Historical Close Prices with MACD",
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
          },
        }}
      />
    </div>
  );
}
