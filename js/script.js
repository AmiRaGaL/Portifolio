// Back-to-Top Button Functionality
window.onscroll = function () {
    const backToTopButton = document.getElementById("back-to-top");
    if (document.body.scrollTop > 100 || document.documentElement.scrollTop > 100) {
        backToTopButton.style.display = "block";
    } else {
        backToTopButton.style.display = "none";
    }

    // Update Scroll Progress Indicator
    const progressBar = document.getElementById("progress-bar");
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrollPercentage = (scrollTop / scrollHeight) * 100;
    progressBar.style.width = scrollPercentage + "%";
};

// Smooth Scroll to Top
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
}

// Dark/Light Mode Toggle
const toggleButton = document.getElementById("theme-toggle");

toggleButton.addEventListener("click", () => {
    document.body.classList.toggle("dark-theme");
    toggleButton.textContent = document.body.classList.contains("dark-theme") ? "☀️" : "🌙";
});

function initializeEmailForm() {
    const form = document.getElementById("form");
    if (!form) return;

    const btn = document.getElementById("button");
    const defaultTimeInput = document.getElementById("default-time");

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        btn.value = "Sending...";

        // Set current time
        defaultTimeInput.value = new Date().toLocaleString();

        emailjs.sendForm("default_service", "template_nt4twcq", this)
            .then(() => {
                btn.value = "Send Email";
                alert("Email sent successfully!");
                form.reset();
            }, (err) => {
                btn.value = "Send Email";
                alert("Failed to send email:\n" + JSON.stringify(err));
                console.error(err);
            });
    });
}

// Run after dynamic sections are loaded
document.addEventListener("DOMContentLoaded", () => {
    // Wait until the contact section is inserted
    const checkInterval = setInterval(() => {
        if (document.getElementById("form")) {
            initializeEmailForm();
            clearInterval(checkInterval);
        }
    }, 300);
});
