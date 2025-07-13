// React.js TQQQ Technical Analysis Chart using Chart.js with CSV Upload Support

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
import annotationPlugin from "chartjs-plugin-annotation";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  annotationPlugin
);

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
  const [chartOptions, setChartOptions] = useState({});

  function handleCSVText(text) {
    const parsed = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      trimHeaders: true,
    });
    console.log("---parsed:", parsed);
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
    const annotations = {};

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
        centralZones.push({ start: i - 2, end: i, high: highMin, low: lowMax });
      }
    }

    centralZones.forEach((zone, idx) => {
      annotations[`zone-${idx}`] = {
        type: "box",
        xMin: labels[zone.start],
        xMax: labels[zone.end],
        yMin: zone.low,
        yMax: zone.high,
        backgroundColor: "rgba(0, 0, 255, 0.05)",
        borderColor: "rgba(0, 0, 255, 0.3)",
        borderWidth: 1,
      };
    });

    for (let i = 2; i < dif.length; i++) {
      const goldCross = dif[i - 1] < dea[i - 1] && dif[i] > dea[i];
      const deadCross = dif[i - 1] > dea[i - 1] && dif[i] < dea[i];
      if (goldCross)
        buySignals.push({ x: labels[i], y: closePrices[i], desc: "MACD 金叉" });
      if (deadCross)
        sellSignals.push({
          x: labels[i],
          y: closePrices[i],
          desc: "MACD 死叉",
        });

      const macdIncreasing = macd[i - 2] < macd[i - 1] && macd[i - 1] < macd[i];
      const higherLow = closePrices[i] > closePrices[i - 2];
      if (macdIncreasing && higherLow && dif[i] > dea[i]) {
        thirdBuySignals.push({
          x: labels[i],
          y: closePrices[i],
          desc: "三买确认",
        });
      }

      if (
        i > 10 &&
        closePrices[i] === Math.max(...closePrices.slice(i - 6, i + 1)) &&
        dif[i] < dif[i - 5]
      ) {
        divergenceSignals.push({
          x: labels[i],
          y: closePrices[i],
          type: "bearish",
          desc: "顶部背离",
        });
      } else if (
        i > 10 &&
        closePrices[i] === Math.min(...closePrices.slice(i - 6, i + 1)) &&
        dif[i] > dif[i - 5]
      ) {
        divergenceSignals.push({
          x: labels[i],
          y: closePrices[i],
          type: "bullish",
          desc: "底部背离",
        });
      }
    }

    divergenceSignals.forEach((signal, idx) => {
      annotations[`div-${idx}`] = {
        type: "label",
        xValue: signal.x,
        yValue: signal.y,
        content: signal.type === "bullish" ? "⬆ 底背" : "⬇ 顶背",
        backgroundColor: "rgba(0,0,0,0.0)",
        font: { size: 10, weight: "bold" },
        color: signal.type === "bullish" ? "green" : "red",
      };
    });

    const bullishDiv = divergenceSignals.filter((d) => d.type === "bullish");
    const bearishDiv = divergenceSignals.filter((d) => d.type === "bearish");

    setChartData({
      labels,
      datasets: [
        {
          label: "TQQQ Close Price",
          data: closePrices,
          borderColor: "green",
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

    setChartOptions({
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
              const y = context.parsed?.y ?? context.raw;
              let dataPoint = context.raw;
              if (typeof dataPoint !== "object") {
                dataPoint = context.dataset.data?.[context.dataIndex];
              }
              if (typeof dataPoint === "object" && dataPoint?.desc) {
                // console.log(`[Tooltip] ${label}: ${y} - ${dataPoint.desc}`);
                return `${label}: ${y} (${dataPoint.desc})`;
              }
              return `${label}: ${y}`;
            },
          },
        },
        annotation: {
          annotations,
        },
      },
      scales: {
        y: {
          type: "linear",
          display: true,
          position: "left",
          title: { display: true, text: "Price" },
        },
        y1: {
          type: "linear",
          display: true,
          position: "right",
          title: { display: true, text: "MACD" },
          grid: { drawOnChartArea: false },
        },
        y2: {
          type: "linear",
          display: true,
          position: "right",
          title: { display: true, text: "Volume" },
          grid: { drawOnChartArea: false },
          stacked: true,
          offset: true,
        },
      },
    });
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => handleCSVText(event.target.result);
      reader.readAsText(file);
    }
  };

  useEffect(() => {
    fetch("/tqqq.csv")
      .then((res) => res.text())
      .then((text) => handleCSVText(text))
      .catch((error) => {
        console.error("Error loading CSV:", error);
      });
  }, []);

  if (!chartData) return <div className="text-center p-4">Loading...</div>;

  return (
    <div className="p-4 w-full" style={{ height: "600px", width: "1600px" }}>
      <h2 className="text-xl font-bold mb-2">
        TQQQ Price Chart + MACD + Buy/Sell Markers
      </h2>
      <input
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        className="mb-4"
      />
      <Line
        data={chartData}
        options={chartOptions}
        onClick={(evt, elements) => {
          if (!elements.length) return;
          const chart = elements[0].element.$context.chart;
          const datasetIndex = elements[0].datasetIndex;
          const index = elements[0].index;
          const point = chart.data.datasets[datasetIndex].data[index];
          if (point?.desc) {
            alert(
              `🛈 说明：${point.desc}\n价格：${point.y}\n日期：${chart.data.labels[index]}`
            );
          }
        }}
      />
    </div>
  );
}
