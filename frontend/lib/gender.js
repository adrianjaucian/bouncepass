export const GENDER_OPTIONS = [
  { value: "", label: "All" },
  { value: "men", label: "Men" },
  { value: "women", label: "Women" },
];

export const GENDER_TABS = [
  { value: "men", label: "Men" },
  { value: "women", label: "Women" },
];

export const REGION_OPTIONS = [
  { value: "", label: "All regions" },
  { value: "north", label: "North" },
  { value: "south", label: "South" },
  { value: "east", label: "East" },
  { value: "west", label: "West" },
  { value: "central", label: "Central" },
];

export const REGION_TABS = [
  { value: "north", label: "North" },
  { value: "south", label: "South" },
  { value: "east", label: "East" },
  { value: "west", label: "West" },
  { value: "central", label: "Central" },
];

export function formatGenderLabel(gender) {
  if (gender === "men") return "Men";
  if (gender === "women") return "Women";
  return "Unspecified";
}

export function formatRegionLabel(region) {
  if (!region) return "Unspecified";
  const match = REGION_TABS.find((option) => option.value === region);
  return match?.label || region.charAt(0).toUpperCase() + region.slice(1);
}

export function formatCompetitionLabel(gender, region) {
  const parts = [];
  if (gender === "men" || gender === "women") {
    parts.push(formatGenderLabel(gender));
  }
  if (region) {
    parts.push(formatRegionLabel(region));
  }
  return parts.join(" · ");
}

export function formatTeamGenderShort(name, gender) {
  const cleaned = String(name || "").trim();
  if (!cleaned) return "";
  if (gender === "women") return `${cleaned} (W)`;
  if (gender === "men") return `${cleaned} (M)`;
  return cleaned;
}

export function formatTeamLabel(name, gender, region) {
  const cleaned = String(name || "").trim();
  if (!cleaned) return "";
  const suffix = formatCompetitionLabel(gender, region);
  return suffix ? `${cleaned} (${suffix})` : cleaned;
}

export function genderBadgeStyle(gender) {
  if (gender === "women") {
    return { backgroundColor: "#f8e1f4", color: "#8e44ad", border: "1px solid #e8c4df" };
  }
  if (gender === "men") {
    return { backgroundColor: "#e8f4fd", color: "#2c6aa0", border: "1px solid #c7dff5" };
  }
  return { backgroundColor: "#f0f0f0", color: "#56616b", border: "1px solid #d9d9d9" };
}

export function regionBadgeStyle(region) {
  return { backgroundColor: "#eef7ee", color: "#2d6a2d", border: "1px solid #cfe3cf" };
}

export function encodeTeamOption(name, gender, region = "") {
  return `${name}::${gender || ""}::${region || ""}`;
}

export function decodeTeamOption(value) {
  const [name, gender, region] = String(value || "").split("::");
  return { name: name || "", gender: gender || "", region: region || "" };
}
