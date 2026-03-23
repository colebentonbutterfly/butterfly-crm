// Generate a unique barcode string: DA-YYYYMMDD-XXXXX
export function generateBarcode(): string {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const rand = String(Math.floor(Math.random() * 99999)).padStart(5, "0");
  return `DA-${y}${m}${d}-${rand}`;
}
