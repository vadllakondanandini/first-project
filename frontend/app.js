const API = "/api";
const $ = (selector) => document.querySelector(selector);
const state = { places: [], categories: [] };
const icons = { academic:"🏫",library:"📚",food:"☕",office:"🗂️",sports:"🏸",health:"🩺",transport:"🚌",services:"🧭",hostel:"🛏️",other:"📍" };

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  })[char]);
}
async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { "Content-Type":"application/json", ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}
function populatePlaceSelects() {
  const options = state.places.map((place) => `<option value="${escapeHtml(place.id)}">${escapeHtml(place.name)}</option>`).join("");
  $("#route-from").innerHTML = `<option value="">Choose a place</option>${options}`;
  $("#route-to").innerHTML = `<option value="">Choose a place</option>${options}`;
}
function renderPlaces() {
  const query = $("#search").value.trim().toLowerCase();
  const category = $("#category").value;
  const filtered = state.places.filter((place) =>
    (!category || place.category === category) &&
    (!query || `${place.name} ${place.description} ${place.building || ""} ${place.category}`.toLowerCase().includes(query))
  );
  $("#status").textContent = `${filtered.length} ${filtered.length === 1 ? "place" : "places"} found`;
  if (!filtered.length) {
    $("#places").innerHTML = `<div class="empty-state"><strong>No places found.</strong><br>Try another search or choose “All categories”.</div>`;
    return;
  }
  $("#places").innerHTML = filtered.map((place) => `
    <article class="place-card">
      <div class="place-top"><span class="place-icon" aria-hidden="true">${icons[place.category] || icons.other}</span><span class="category-tag">${escapeHtml(place.category.replaceAll("_"," "))}</span></div>
      <h3>${escapeHtml(place.name)}</h3>
      <p>${escapeHtml(place.description)}</p>
      <div class="place-bottom"><span>${escapeHtml(place.building || "Campus location")}${place.floor ? ` · ${escapeHtml(place.floor)}` : ""}</span><button class="text-button route-to-place" data-place-id="${escapeHtml(place.id)}">Get directions →</button></div>
    </article>`).join("");
  document.querySelectorAll(".route-to-place").forEach((button) => button.addEventListener("click", () => {
    $("#route-to").value = button.dataset.placeId;
    $("#directions").scrollIntoView({ behavior:"smooth" });
    $("#route-from").focus();
  }));
}
async function loadPlaces() {
  $("#status").textContent = "Loading campus places…";
  try {
    const data = await api("/places");
    state.places = data.places;
    state.categories = [...new Set(state.places.map((place) => place.category))].sort();
    $("#category").innerHTML = `<option value="">All categories</option>${state.categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category.replaceAll("_"," "))}</option>`).join("")}`;
    $("#place-count").textContent = state.places.length;
    populatePlaceSelects();
    renderPlaces();
  } catch (error) {
    $("#status").textContent = error.message;
    $("#places").innerHTML = `<div class="empty-state">The campus guide could not load. Check that the server is running and Supabase is configured, then refresh.</div>`;
  }
}
$("#search").addEventListener("input", renderPlaces);
$("#category").addEventListener("change", renderPlaces);
$("#swap-route").addEventListener("click", () => {
  const from = $("#route-from").value;
  $("#route-from").value = $("#route-to").value;
  $("#route-to").value = from;
});
$("#route-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const from = $("#route-from").value;
  const to = $("#route-to").value;
  const result = $("#route-result");
  if (!from || !to) { result.textContent = "Choose both a starting point and a destination."; return; }
  if (from === to) { result.textContent = "You are already at this place. Choose a different destination."; return; }
  result.textContent = "Finding route…";
  try {
    const data = await api(`/routes?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
    result.innerHTML = `<strong>${escapeHtml(data.route.from.name)} → ${escapeHtml(data.route.to.name)}</strong>\n${escapeHtml(data.route.instructions)}${data.route.estimated_minutes ? `\nEstimated walk: ${Number(data.route.estimated_minutes)} minutes` : ""}${data.route.accessibility_notes ? `\nAccessibility: ${escapeHtml(data.route.accessibility_notes)}` : ""}`;
  } catch (error) { result.textContent = error.message; }
});
$("#issue-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = event.currentTarget.querySelector("button[type=submit]");
  const status = $("#issue-status");
  button.disabled = true;
  status.textContent = "Sending report…";
  try {
    const data = await api("/issues", { method:"POST", body:JSON.stringify({
      reporter_name:$("#reporter-name").value.trim() || null,
      issue_type:$("#issue-type").value,
      details:$("#issue-details").value.trim()
    })});
    status.textContent = `Thank you! Report ${data.issue.id.slice(0,8)} was submitted.`;
    event.currentTarget.reset();
  } catch (error) { status.textContent = error.message; }
  finally { button.disabled = false; }
});
loadPlaces();
