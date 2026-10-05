// URL of the backend (repo api-consultorio, deployed on Render)
const API_URL = "https://api-consultorio-qifn.onrender.com";
const WHATSAPP_NUMBER = "573000000000";

/* ---------- mobile menu ---------- */
const navToggle = document.getElementById("navToggle");
const nav = document.getElementById("nav");

navToggle.addEventListener("click", () => {
  const isOpen = nav.classList.toggle("is-open");
  navToggle.setAttribute("aria-expanded", isOpen);
});

nav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    nav.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", false);
  });
});

/* ---------- booking ---------- */
const form = document.getElementById("bookingForm");
const dateInput = document.getElementById("dateInput");
const slotsBox = document.getElementById("slots");
const formError = document.getElementById("formError");
const submitBtn = document.getElementById("submitBtn");
const successBox = document.getElementById("success");

let selectedTime = null;

// fecha local en formato YYYY-MM-DD (toISOString usaria UTC y a veces da el dia siguiente)
const toISODate = (d) => d.toLocaleDateString("en-CA");

const today = new Date();
const maxDay = new Date();
maxDay.setDate(today.getDate() + 60);
dateInput.min = toISODate(today);
dateInput.max = toISODate(maxDay);

// Render free se duerme. Si la respuesta tarda, avisamos para que la persona no piense que se daño
async function apiFetch(path, options = {}) {
  const slowTimer = setTimeout(() => {
    slotsBox.innerHTML = `<p class="slots__msg">Despertando el servidor… la primera consulta puede tardar hasta un minuto ⏳</p>`;
  }, 4000);

  try {
    const res = await fetch(API_URL + path, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } finally {
    clearTimeout(slowTimer);
  }
}

// FastAPI devuelve los errores de validacion (422) como una lista
function errorMessage(data) {
  if (typeof data.detail === "string") return data.detail;
  if (Array.isArray(data.detail)) return data.detail.map((e) => e.msg.replace("Value error, ", "")).join(". ");
  return "Algo salió mal, intenta de nuevo.";
}

async function loadSlots() {
  selectedTime = null;
  formError.textContent = "";
  if (!dateInput.value) return;

  slotsBox.innerHTML = `<p class="slots__msg">Buscando horas libres…</p>`;

  try {
    const { ok, data } = await apiFetch(`/disponibilidad?fecha=${dateInput.value}`);
    if (!ok) throw new Error(errorMessage(data));

    if (data.libres.length === 0) {
      const closed = new Date(dateInput.value + "T12:00").getDay() === 0;
      slotsBox.innerHTML = `<p class="slots__msg">${closed ? "Los domingos no atendemos." : "No quedan horas ese día."} Prueba con otra fecha.</p>`;
      return;
    }

    slotsBox.innerHTML = data.libres
      .map((t) => `<button type="button" class="slot" data-time="${t}">${formatHour(t)}</button>`)
      .join("");
  } catch (err) {
    slotsBox.innerHTML = `<p class="slots__msg">No pudimos cargar las horas. Escríbenos por WhatsApp mientras tanto.</p>`;
  }
}

function formatHour(t) {
  const [h, m] = t.split(":").map(Number);
  const suffix = h < 12 ? "a. m." : "p. m.";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

dateInput.addEventListener("change", loadSlots);

slotsBox.addEventListener("click", (e) => {
  const btn = e.target.closest(".slot");
  if (!btn) return;
  slotsBox.querySelectorAll(".slot").forEach((b) => b.classList.remove("is-selected"));
  btn.classList.add("is-selected");
  selectedTime = btn.dataset.time;
  formError.textContent = "";
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const name = data.get("name").trim();
  const phone = data.get("phone").trim();

  if (!dateInput.value) return (formError.textContent = "Escoge un día.");
  if (!selectedTime) return (formError.textContent = "Escoge una hora.");
  if (name.length < 3) return (formError.textContent = "Escribe tu nombre completo.");
  if (!phone) return (formError.textContent = "Escribe tu celular para confirmarte la cita.");

  submitBtn.disabled = true;
  submitBtn.textContent = "Agendando…";

  try {
    const res = await apiFetch("/citas", {
      method: "POST",
      body: JSON.stringify({
        patient_name: name,
        phone,
        service: data.get("service"),
        date: dateInput.value,
        time: selectedTime,
      }),
    });

    if (res.ok) {
      showSuccess(res.data);
    } else {
      formError.textContent = errorMessage(res.data);
      // si alguien tomo la hora mientras tanto, recargamos las horas
      if (res.status === 409) loadSlots();
    }
  } catch (err) {
    formError.textContent = "No hay conexión con el sistema de citas. Intenta por WhatsApp.";
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Confirmar cita";
  }
});

function showSuccess(appt) {
  const serviceName = document.querySelector(`#serviceSelect option[value="${appt.service}"]`).textContent.replace(/\s*\(.*\)/, "");
  const niceDate = new Date(appt.date + "T12:00").toLocaleDateString("es-CO", {
    weekday: "long", day: "numeric", month: "long",
  });

  document.getElementById("successText").textContent =
    `${appt.patient_name}, te esperamos el ${niceDate} a las ${formatHour(appt.time.slice(0, 5))} para tu ${serviceName.toLowerCase()}.`;
  document.getElementById("successId").textContent = `#${appt.id}`;

  form.hidden = true;
  successBox.hidden = false;
}

document.getElementById("newBooking").addEventListener("click", () => {
  form.reset();
  slotsBox.innerHTML = `<p class="slots__msg">Escoge un día para ver las horas libres.</p>`;
  selectedTime = null;
  successBox.hidden = true;
  form.hidden = false;
});

// link de respaldo a WhatsApp
document.getElementById("waLink").href =
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hola, quiero agendar una cita en Sonrisa Viva.")}`;
document.getElementById("waLink").target = "_blank";

/* ---------- footer year ---------- */
document.getElementById("year").textContent = new Date().getFullYear();
