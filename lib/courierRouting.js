import "server-only";
import { supabaseAdminRequest } from "./supabaseRest";

function list(value) { return Array.isArray(value) ? value.map((v) => String(v).trim().toLowerCase()).filter(Boolean) : String(value || "").split(",").map((v) => v.trim().toLowerCase()).filter(Boolean); }

export async function recommendCourier({ city = "", paymentMethod = "cod" } = {}) {
  const rows = await supabaseAdminRequest("courier_accounts?select=id,name,provider,status,is_default,settings,capabilities&status=eq.active&order=is_default.desc,name.asc");
  const targetCity = String(city).trim().toLowerCase();
  const cod = paymentMethod !== "bank_deposit";
  const candidates = rows.map((courier) => {
    const settings = courier.settings || {}; const cities = list(settings.coveredCities);
    const coverage = !cities.length || cities.includes(targetCity); const paymentOk = cod ? settings.codEnabled !== false : settings.prepaidEnabled !== false;
    const cost = Math.max(0, Number(settings.estimatedCostPkr || 0)); const priority = Math.max(0, Number(settings.priority || 0));
    return { id: courier.id, name: courier.name, provider: courier.provider, estimatedCostPkr: cost, priority, eligible: coverage && paymentOk && courier.capabilities?.booking === true, reason: !coverage ? "City not covered" : !paymentOk ? "Payment type not supported" : courier.capabilities?.booking !== true ? "Booking API not enabled" : "Eligible" };
  }).sort((a,b) => Number(b.eligible)-Number(a.eligible) || a.estimatedCostPkr-b.estimatedCostPkr || b.priority-a.priority);
  return { recommendation: candidates.find((item) => item.eligible) || null, candidates };
}
