// WhatsApp number of the clinic (country code + number, no spaces or "+")
const WHATSAPP_NUMBER = "573000000000";

// 1. Mobile menu: open/close when the hamburger button is clicked
const navToggle = document.getElementById("navToggle");
const nav = document.getElementById("nav");

navToggle.addEventListener("click", () => {
  const isOpen = nav.classList.toggle("is-open");
  navToggle.setAttribute("aria-expanded", isOpen);
});

// Close the menu after choosing a link
nav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    nav.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", false);
  });
});

// 2. Booking form: build a WhatsApp message with the form data
const form = document.getElementById("bookingForm");
const formError = document.getElementById("formError");

form.addEventListener("submit", (event) => {
  event.preventDefault(); // stop the page from reloading

  const data = new FormData(form);
  const name = data.get("name").trim();
  const service = data.get("service");
  const time = data.get("time");

  // Simple validation
  if (!name || !service) {
    formError.textContent = "Por favor escribe tu nombre y elige un servicio.";
    return;
  }
  formError.textContent = "";

  const message =
    `Hola, soy ${name}. Quiero agendar una cita de *${service}* ` +
    `en el horario de la ${time.toLowerCase()}.`;

  // encodeURIComponent turns spaces and accents into a valid URL
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
});

// 3. Current year in the footer
document.getElementById("year").textContent = new Date().getFullYear();
