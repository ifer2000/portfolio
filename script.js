const notes = document.querySelectorAll(".note");
const tabs = document.querySelectorAll(".note-tab");

let currentActiveNote = document.querySelector(".note.active");

function activateNote(selectedNote) {

    if (currentActiveNote !== selectedNote) {
        const selectedContent = selectedNote.querySelector(".note-content");

        if (selectedContent) {
            selectedContent.scrollTop = 0;
        }
    }

    notes.forEach(function(note, index) {

        if (note === selectedNote) {
            note.classList.add("active");
            note.classList.remove("inactive");
            note.style.zIndex = 50;
        } else {
            note.classList.remove("active");
            note.classList.add("inactive");
            note.style.zIndex = 10 + index;
        }

    });

    currentActiveNote = selectedNote;
}

tabs.forEach(function(tab) {

    tab.addEventListener("click", function(event) {
        event.stopPropagation();
        const selectedNote = tab.parentElement;
        activateNote(selectedNote);
    });

});

notes.forEach(function(note) {

    note.addEventListener("click", function() {
        activateNote(note);
    });

});
