import { exportGameResults } from "../lib/exportResults";

export default function ExportResultsButton({ data, dateStamp, homeLabel, awayLabel, fileSlug, disabled = false }) {
  const handleExport = () => {
    exportGameResults(data, { dateStamp, homeLabel, awayLabel, fileSlug });
  };

  return (
    <button
      onClick={handleExport}
      disabled={disabled || !data}
      style={{
        padding: "10px 18px",
        backgroundColor: disabled || !data ? "#bdc3c7" : "#2ecc71",
        color: "white",
        border: "none",
        borderRadius: "5px",
        cursor: disabled || !data ? "not-allowed" : "pointer",
        fontWeight: "bold",
        fontSize: "14px",
      }}
    >
      Bounce Results
    </button>
  );
}
