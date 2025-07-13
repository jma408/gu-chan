import fs from "node:fs";
import path from "node:path";
import fetch from "node-fetch";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const API_KEY = "7CU74K52CKKYQPA4"; // ⬅️ Replace this with your actual Alpha Vantage key
const stock = process.argv[2]?.toUpperCase() || "TQQQ";

const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${stock}&datatype=csv&outputsize=full&apikey=${API_KEY}`;

async function downloadCSV() {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP Error ${res.status}`);

    const csv = await res.text();

    if (csv.includes("Thank you for using")) {
      throw new Error("API rate limit reached. Try again later.");
    }

    const filePath = path.join(__dirname, "public", `${stock}_history.csv`);
    fs.writeFileSync(filePath, csv);

    console.log(`✅ ${stock} history downloaded to ${filePath}`);
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
  }
}

downloadCSV();
