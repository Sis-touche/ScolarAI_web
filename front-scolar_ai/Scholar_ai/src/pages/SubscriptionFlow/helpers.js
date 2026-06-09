// helpers.js
export const decodeJwt = (token) => {
  try {
    if (!token) return null;
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
};

export const getUserIdFromToken = () => {
  const token = localStorage.getItem("token");
  const payload = decodeJwt(token);
  return payload?.id ?? null;
};

export const fmt = (v) =>
  new Intl.NumberFormat("fr-MG").format(parseFloat(v ?? 0));

export const getPlanFeatures = (plan) => {
  const f = [];
  if (plan.scanLimit === null) f.push("Scans illimités");
  else if (plan.scanLimit > 0) f.push(`${plan.scanLimit} scans inclus`);
  if (plan.type === "TIME_BASED") {
    f.push(plan.durationDays >= 365 ? "Accès 12 mois" : "Accès 30 jours");
    f.push("Tableau de bord complet");
    if (plan.durationDays >= 365) {
      f.push("Support prioritaire");
      f.push("Rapports PDF mensuels");
    }
  } else {
    f.push("Validité 6 mois");
    f.push("Tableau de bord complet");
  }
  return f;
};