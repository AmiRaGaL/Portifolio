// js/loadSections.js
const sections = {
  home: "sections/home.html",
  about: "sections/about.html",
  skills: "sections/skills.html",
  experience: "sections/experience.html",
  projects: "sections/projects.html",
  contact: "sections/contact.html",
  chat: "sections/chat.html" 
};

function mountFor(id) {
  let el = document.getElementById(id);
  if (!el) {
    // Create a container on the fly if missing to avoid null errors
    const parent = document.getElementById("main-content") || document.body;
    el = document.createElement("div");
    el.id = id;
    el.setAttribute("data-aos", id === "home" ? "fade-in" : "fade-up");
    parent.appendChild(el);
  }
  return el;
}

function loadSections() {
  for (const [id, url] of Object.entries(sections)) {
    fetch(url)
      .then((r) => r.text())
      .then((html) => {
        const mount = mountFor(id);
        mount.innerHTML = html;

        // Notify listeners (e.g., to lazy-init chat)
        document.dispatchEvent(new CustomEvent("section:loaded", { detail: { id } }));

        // Refresh AOS so newly injected nodes animate
        if (window.AOS?.refresh) AOS.refresh();
      })
      .catch((err) => console.error(`Error loading ${id}:`, err));
  }
}

document.addEventListener("DOMContentLoaded", loadSections);
