const body = document.body;
const themeToggle = document.getElementById("themeToggle");
const themeText = document.getElementById("themeText");

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
