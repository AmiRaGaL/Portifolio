// List of sections and their corresponding HTML files
const sections = {
    home: "sections/home.html",
    about: "sections/about.html",
    skills: "sections/skills.html",
    experience: "sections/experience.html",
    projects: "sections/projects.html",
    contact: "sections/contact.html"
};

// Function to load sections into the page
function loadSections() {
    for (let section in sections) {
        fetch(sections[section])
            .then(response => response.text())
            .then(data => {
                document.getElementById(section).innerHTML = data;
            })
            .catch(error => console.error(`Error loading ${section}:`, error));
    }
}

// Load sections when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", loadSections);
