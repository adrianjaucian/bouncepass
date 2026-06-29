export const GENDER_OPTIONS = [
  { value: "", label: "All" },
  { value: "men", label: "Men" },
  { value: "women", label: "Women" },
];

export function formatGenderLabel(gender) {
  if (gender === "men") return "Men";
  if (gender === "women") return "Women";
  return "Unspecified";
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

export function encodeTeamOption(name, gender) {
  return `${name}::${gender || ""}`;
}

export function decodeTeamOption(value) {
  const [name, gender] = String(value || "").split("::");
  return { name: name || "", gender: gender || "" };
}
