const body = document.body;
const themeToggle = document.getElementById("themeToggle");
const themeText = document.getElementById("themeText");

const sidebar = document.getElementById("sidebar");
const menuBtn = document.getElementById("menuBtn");
const closeSidebar = document.getElementById("closeSidebar");
const overlay = document.getElementById("overlay");

function applyTheme(theme) {
  if (theme === "dark") {
    body.classList.add("dark");
    themeText.textContent = "라이트모드";
  } else {
    body.classList.remove("dark");
    themeText.textContent = "다크모드";
  }
}

const savedTheme = localStorage.getItem("theme") || "light";
applyTheme(savedTheme);

themeToggle.addEventListener("click", () => {
  const isDark = body.classList.contains("dark");
  const newTheme = isDark ? "light" : "dark";
  localStorage.setItem("theme", newTheme);
  applyTheme(newTheme);
});

menuBtn.addEventListener("click", () => {
  sidebar.classList.add("open");
  overlay.classList.add("show");
});

closeSidebar.addEventListener("click", () => {
  sidebar.classList.remove("open");
  overlay.classList.remove("show");
});

overlay.addEventListener("click", () => {
  sidebar.classList.remove("open");
  overlay.classList.remove("show");
});

document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", () => {
    sidebar.classList.remove("open");
    overlay.classList.remove("show");
  });
});
