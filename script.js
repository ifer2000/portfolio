const leftPanel = document.getElementById("leftPanel");
const rightPanel = document.getElementById("rightPanel");
const overlay = document.getElementById("overlay");

const openLeft = document.getElementById("openLeft");
const openRight = document.getElementById("openRight");
const closeLeft = document.getElementById("closeLeft");
const closeRight = document.getElementById("closeRight");

function closePanels() {
  leftPanel.classList.remove("open");
  rightPanel.classList.remove("open");
  overlay.classList.remove("show");
}

function openLeftPanel() {
  rightPanel.classList.remove("open");
  leftPanel.classList.add("open");
  overlay.classList.add("show");
}

function openRightPanel() {
  leftPanel.classList.remove("open");
  rightPanel.classList.add("open");
  overlay.classList.add("show");
}

openLeft.addEventListener("click", openLeftPanel);
openRight.addEventListener("click", openRightPanel);

closeLeft.addEventListener("click", closePanels);
closeRight.addEventListener("click", closePanels);
overlay.addEventListener("click", closePanels);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closePanels();
  }
});
