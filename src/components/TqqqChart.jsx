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
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

export default function TqqqChart() {
  const [chartData, setChartData] = useState(null);
  const [labels, setLabels] = useState([]);

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

        console.log("parsed:", parsed);
        console.log("rows:", rows);

        const labels = rows.map((r) => r.Date);
        const closePrices = rows.map((r) => parseFloat(r.Close));

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
            },
          ],
        });

        setLabels(labels);
      })
      .catch((error) => {
        console.error("Error loading CSV:", error);
      });
  }, []);

  if (!chartData) return <div className="text-center p-4">Loading...</div>;

  return (
    <div className="p-4 w-full" style={{ height: "600px", width: "1200px" }}>
      <h2 className="text-xl font-bold mb-4">TQQQ Price Chart</h2>
      <Line
        data={chartData}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "top",
            },
            title: {
              display: true,
              text: "TQQQ Historical Close Prices",
            },
          },
        }}
      />
    </div>
  );
}
