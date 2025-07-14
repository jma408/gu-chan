// Full version with zoom in/out/reset buttons and 三卖增强

import { useEffect, useRef, useState } from "react";
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
import zoomPlugin from "chartjs-plugin-zoom";
import { calculateMACD } from "../utils/utils-chart";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  annotationPlugin,
  zoomPlugin
);

export default function TqqqChart() {
  const [chartData, setChartData] = useState(null);
  const [chartOptions, setChartOptions] = useState({});
  const chartRef = useRef();

  function handleCSVText(text) {
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

    const rows = cleaned.filter((row) => row.timestamp && row.close);
    rows.reverse();

    const labels = rows.map((r) => r.timestamp);
    const closePrices = rows.map((r) => parseFloat(r.close));
    const volumes = rows.map((r) => parseFloat(r.volume));
    const { dif, dea, macd } = calculateMACD(closePrices);

    const buySignals = [];
    const sellSignals = [];
    const thirdBuySignals = [];
    const thirdSellSignals = [];
    const divergenceSignals = [];
    const volumeBars = volumes.map((v, i) => ({ x: labels[i], y: v }));
    const annotations = {};

    const centralZones = [];
    for (let i = 2; i < closePrices.length; i++) {
      const highs = [rows[i - 2], rows[i - 1], rows[i]].map((r) =>
        parseFloat(r.high)
      );
      const lows = [rows[i - 2], rows[i - 1], rows[i]].map((r) =>
        parseFloat(r.low)
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
        xScaleID: "x",
        yScaleID: "y",
        xMin: labels[zone.start],
        xMax: labels[zone.end],
        yMin: zone.low,
        yMax: zone.high,
        backgroundColor: "rgba(0, 0, 255, 0.05)",
        borderColor: "rgba(0, 0, 255, 0.3)",
        borderWidth: 1,
      };
    });

    for (let i = 10; i < dif.length; i++) {
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

      const isHigherLow =
        closePrices[i] > closePrices[i - 2] &&
        closePrices[i - 2] > closePrices[i - 4];
      const isMACDReversal = macd[i - 2] < macd[i - 1] && macd[i - 1] < macd[i];
      const thirdBuyCondition = goldCross && isHigherLow && isMACDReversal;
      if (thirdBuyCondition) {
        thirdBuySignals.push({
          x: labels[i],
          y: closePrices[i],
          desc: "三买确认（放宽条件）",
        });
      }

      // ✅ 三卖增强识别（更新逻辑）
      const isMACDPeakTurning =
        macd[i - 2] > macd[i - 1] && macd[i - 1] > macd[i] && macd[i - 2] > 0;

      const thirdSellCondition =
        deadCross &&
        macd[i - 1] > 0 &&
        dif[i - 1] > dea[i - 1] &&
        isMACDPeakTurning;

      if (thirdSellCondition) {
        console.log("✅ 三卖信号触发: ", labels[i]);
        thirdSellSignals.push({
          x: labels[i],
          y: closePrices[i],
          desc: "三卖确认（增强）",
        });
      }

      const isBearishDivergence =
        closePrices[i] > closePrices[i - 5] &&
        dif[i] < dif[i - 5] &&
        macd[i] < macd[i - 5];
      const isBullishDivergence =
        closePrices[i] < closePrices[i - 5] &&
        dif[i] > dif[i - 5] &&
        macd[i] > macd[i - 5];

      if (isBearishDivergence) {
        divergenceSignals.push({
          x: labels[i],
          y: closePrices[i],
          type: "bearish",
          desc: "顶背离增强",
        });
      } else if (isBullishDivergence) {
        divergenceSignals.push({
          x: labels[i],
          y: closePrices[i],
          type: "bullish",
          desc: "底背离增强",
        });
      }
    }

    divergenceSignals.forEach((signal, idx) => {
      annotations[`div-${idx}`] = {
        type: "label",
        xScaleID: "x",
        yScaleID: "y",
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
        {
          label: "Third Sell Confirmed",
          data: thirdSellSignals,
          pointRadius: 6,
          pointBackgroundColor: "orange",
          showLine: false,
          yAxisID: "y",
        },
      ],
    });

    setChartOptions({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "nearest", intersect: false },
      stacked: false,
      plugins: {
        legend: { position: "top" },
        title: {
          display: true,
          text: "TQQQ Historical Close Prices with MACD + Trade Points",
        },
        tooltip: {
          enabled: true,
          mode: "nearest",
          intersect: false,
          callbacks: {
            label: function (context) {
              const label = context.dataset.label || "";
              const y = context.parsed?.y ?? context.raw;
              const dataPoint = context.dataset.data?.[context.dataIndex];
              if (dataPoint?.desc) {
                return `${label}: ${y} - ${dataPoint.desc}`;
              }
              return `${label}: ${y}`;
            },
          },
        },
        annotation: {
          annotations,
        },
        zoom: {
          pan: { enabled: true, mode: "x" },
          zoom: {
            wheel: { enabled: true },
            pinch: { enabled: true },
            mode: "x",
          },
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

  const handleZoomIn = () => {
    const chart = chartRef.current;
    if (chart) chart.zoom(1.2);
  };

  const handleZoomOut = () => {
    const chart = chartRef.current;
    if (chart) chart.zoom(0.8);
  };

  const handleResetZoom = () => {
    const chart = chartRef.current;
    if (chart) chart.resetZoom();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => handleCSVText(event.target.result);
      reader.readAsText(file);
    }
  };

  useEffect(() => {
    fetch("/TQQQ.csv")
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
        className="mb-2"
      />
      <div className="mb-2 space-x-2">
        <button onClick={handleZoomIn} style={{ margin: "10px" }}>
          Zoom In
        </button>
        <button
          onClick={handleZoomOut}
          className="px-3 py-1 bg-blue-500 text-white rounded"
          style={{ margin: "10px" }}
        >
          Zoom Out
        </button>
        <button
          onClick={handleResetZoom}
          className="px-3 py-1 bg-gray-500 text-white rounded"
          style={{ margin: "10px" }}
        >
          Reset Zoom
        </button>
      </div>
      <Line
        ref={chartRef}
        data={chartData}
        options={chartOptions}
        onClick={(evt, elements) => {
          if (!Array.isArray(elements) || elements.length === 0) return;

          const el = elements[0];
          const chart = el.element?.$context?.chart;
          const datasetIndex = el.datasetIndex;
          const index = el.index;
          const dataset = chart?.data?.datasets?.[datasetIndex];
          const dataPoint = dataset?.data?.[index];

          if (dataPoint?.desc) {
            alert(
              `🛈 说明：${dataPoint.desc}\n价格：${dataPoint.y}\n日期：${chart.data.labels[index]}`
            );
          }
        }}
      />
    </div>
  );
}
