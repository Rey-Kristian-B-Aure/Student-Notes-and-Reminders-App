let notes = [];
let reminders = [];

const API_BASE = 'http://localhost:3000';

// Load data from server on page load
async function loadData() {
    try {
        const response = await fetch(`${API_BASE}/api/notes`);
        const data = await response.json();
        notes = data.notes || [];
        reminders = data.reminders || [];
        displayNotes();
        displayReminders();
    } catch (error) {
        console.error('Error loading data from server:', error);
        // Fallback to localStorage if server is not available
        loadFromLocalStorage();
    }
}

// Fallback function to load from localStorage
function loadFromLocalStorage() {
    const savedNotes = localStorage.getItem('notes');
    const savedReminders = localStorage.getItem('reminders');

    if (savedNotes) {
        notes = JSON.parse(savedNotes);
    }
    if (savedReminders) {
        reminders = JSON.parse(savedReminders);
    }

    displayNotes();
    displayReminders();
}

// Save data to server and update local arrays
async function saveToServerAndUpdateLocal(note) {
    try {
        const response = await fetch(`${API_BASE}/api/notes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(note),
        });
        const savedNote = await response.json();

        // Update local arrays
        if (savedNote.reminder) {
            reminders.push(savedNote);
        } else {
            notes.push(savedNote);
        }

        return savedNote;
    } catch (error) {
        console.error('Error saving to server:', error);
        // Fallback to localStorage
        saveToLocalStorage();
        if (note.reminder) {
            reminders.push(note);
        } else {
            notes.push(note);
        }
        return note;
    }
}

// Update data on server and local arrays
async function updateOnServerAndLocal(id, updates) {
    try {
        const response = await fetch(`${API_BASE}/api/notes/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updates),
        });
        const updatedNote = await response.json();

        // Update local arrays
        updateLocalArrays(updatedNote);

        return updatedNote;
    } catch (error) {
        console.error('Error updating on server:', error);
        // Fallback to localStorage
        updateLocalStorage();
        return null;
    }
}

// Delete from server and local arrays
async function deleteFromServerAndLocal(id) {
    try {
        await fetch(`${API_BASE}/api/notes/${id}`, {
            method: 'DELETE',
        });

        // Update local arrays
        notes = notes.filter(note => note.id !== id);
        reminders = reminders.filter(reminder => reminder.id !== id);

    } catch (error) {
        console.error('Error deleting from server:', error);
        // Fallback to localStorage
        deleteFromLocalStorage(id);
    }
}

// Helper function to update local arrays
function updateLocalArrays(updatedNote) {
    // Remove from both arrays first
    notes = notes.filter(note => note.id !== updatedNote.id);
    reminders = reminders.filter(reminder => reminder.id !== updatedNote.id);

    // Add to appropriate array
    if (updatedNote.reminder) {
        reminders.push(updatedNote);
    } else {
        notes.push(updatedNote);
    }
}

// Fallback localStorage functions
function saveToLocalStorage() {
    localStorage.setItem('notes', JSON.stringify(notes));
    localStorage.setItem('reminders', JSON.stringify(reminders));
}

function updateLocalStorage() {
    saveToLocalStorage();
}

function deleteFromLocalStorage(id) {
    notes = notes.filter(note => note.id !== id);
    reminders = reminders.filter(reminder => reminder.id !== id);
    saveToLocalStorage();
}

// Get next ID from server
async function getNextId() {
    try {
        const response = await fetch(`${API_BASE}/api/next-id`);
        const data = await response.json();
        return data.nextId;
    } catch (error) {
        // Fallback to localStorage counter
        let idCounter = parseInt(localStorage.getItem('idCounter')) || 0;
        return ++idCounter;
    }
}

// Initialize app
loadData();

// Check reminders every minute
setInterval(checkReminders, 60000);
checkReminders(); // Check immediately on load

document.getElementById("add-note-button").addEventListener("click", async () => {
    const noteContent = document.getElementById("note-content").value;
    const noteTitle = document.getElementById("note-title").value;
    const noteDatetime = document.getElementById("note-datetime").value;

    // Generate title if empty
    let title = noteTitle;
    if (!title) {
        const untitledCount = [...notes, ...reminders].filter(note => note.title && note.title.startsWith("Untitled")).length;
        title = `Untitled${untitledCount + 1}`;
    }

    const id = await getNextId();

    const note = {
        id: id,
        title: title,
        content: noteContent,
        timestamp: new Date().toLocaleString(),
        lastEditTime: new Date().toLocaleString(),
        reminder: noteDatetime || null,
        alertedDay: false,
        alertedTime: false,
        done: false,
        missed: false
    };

    try {
        // Save to server and update local arrays
        await saveToServerAndUpdateLocal(note);

        // Update display
        displayNotes();
        displayReminders();

        // Clear fields
        document.getElementById("note-content").value = "";
        document.getElementById("note-title").value = "";
        document.getElementById("note-datetime").value = "";

        checkReminders();
    } catch (error) {
        console.error('Error saving note:', error);
    }
});

document.getElementById("reset-button").addEventListener("click", () => {
    document.getElementById("note-content").value = "";
    document.getElementById("note-title").value = "";
    document.getElementById("note-datetime").value = "";
});

function displayNotes() {
    const notesContainer = document.getElementById("notes-container");
    notesContainer.innerHTML = "";

    if (notes.length === 0) {
        notesContainer.innerHTML = "<p>No notes available.</p>";
        return;
    }

    notes.forEach((note, index) => {
        const noteElement = document.createElement("div");
        noteElement.className = "note compact";
        noteElement.innerHTML = `
            <div class="note-summary" data-id="${note.id}">
                <div class="title-line">${note.title}</div>
                <p>${note.content}</p>
            </div>
        `;
        notesContainer.appendChild(noteElement);

        // Add click event to summary
        const summary = noteElement.querySelector('.note-summary');
        summary.addEventListener('click', () => {
            const id = parseInt(summary.getAttribute('data-id'));
            const index = notes.findIndex(n => n.id === id);
            showNoteDetails(index, 'note');
        });
    });


}

function displayReminders() {
    const remindersContainer = document.getElementById("reminders-container");
    remindersContainer.innerHTML = "";

    if (reminders.length === 0) {
        remindersContainer.innerHTML = "<p>No reminders set.</p>";
        return;
    }

    // Sort reminders: missed -> upcoming -> done
    const sortedReminders = [...reminders].sort((a, b) => {
        if (a.missed && !b.missed) return -1;
        if (!a.missed && b.missed) return 1;
        if (!a.done && b.done) return -1;
        if (a.done && !b.done) return 1;
        return 0; // same status, maintain order
    });

    sortedReminders.forEach((note, index) => {
        const reminderElement = document.createElement("div");
        reminderElement.className = `reminder compact ${note.missed ? 'missed' : ''} ${note.done ? 'done' : ''}`;
        reminderElement.innerHTML = `
            <div class="note-summary" data-id="${note.id}">
                <div class="title-line">${note.title} ${note.missed ? '<span class="status missed">MISSED</span>' : note.done ? '<span class="status done">DONE</span>' : ''}</div>
                <p>${note.content}</p>
            </div>
        `;
        remindersContainer.appendChild(reminderElement);

        // Add click event to summary
        const summary = reminderElement.querySelector('.note-summary');
        summary.addEventListener('click', () => {
            const id = parseInt(summary.getAttribute('data-id'));
            const index = reminders.findIndex(r => r.id === id);
            showNoteDetails(index, 'reminder');
        });
    });
}

function editNote(index, type) {
    const noteList = type === 'note' ? notes : reminders;
    const note = noteList[index];
    const modal = document.getElementById('note-modal');
    const modalBody = document.getElementById('modal-body');

    const hasReminder = !!note.reminder;

    modalBody.innerHTML = `
        <h2>Edit ${type === 'note' ? 'Note' : 'Reminder'}</h2>
        <div class="edit-input-section">
            <input type="text" id="edit-title" value="${note.title}" placeholder="Edit Note Title">
            <textarea id="edit-content" placeholder="Edit your note here...">${note.content}</textarea>
            <input type="datetime-local" id="edit-datetime" value="${note.reminder ? new Date(note.reminder).toISOString().slice(0, 16) : ''}" style="display: ${hasReminder ? 'block' : 'none'}">
            <div class="edit-buttons">
                <button id="toggle-reminder">${hasReminder ? 'Remove Reminder' : 'Add Reminder'}</button>
                <button id="reset-edit">Reset</button>
                <button id="save-edit">Save</button>
                <button id="cancel-edit">Cancel</button>
            </div>
        </div>
    `;

    modal.style.display = 'block';

    // Close modal
    const closeBtn = document.querySelector('.close');
    closeBtn.onclick = () => modal.style.display = 'none';
    window.onclick = (event) => {
        if (event.target === modal) modal.style.display = 'none';
    };

    let currentHasReminder = hasReminder;

    // Toggle reminder button
    document.getElementById('toggle-reminder').addEventListener('click', () => {
        const datetimeInput = document.getElementById('edit-datetime');
        const toggleBtn = document.getElementById('toggle-reminder');
        if (currentHasReminder) {
            // Remove reminder
            datetimeInput.value = '';
            datetimeInput.style.display = 'none';
            toggleBtn.textContent = 'Add Reminder';
            currentHasReminder = false;
        } else {
            // Add reminder
            datetimeInput.style.display = 'block';
            toggleBtn.textContent = 'Remove Reminder';
            currentHasReminder = true;
        }
    });

    // Reset button
    document.getElementById('reset-edit').addEventListener('click', () => {
        if (confirm('Are you sure you want to reset all changes?')) {
            document.getElementById('edit-title').value = note.title;
            document.getElementById('edit-content').value = note.content;
            const datetimeInput = document.getElementById('edit-datetime');
            datetimeInput.value = note.reminder ? new Date(note.reminder).toISOString().slice(0, 16) : '';
            datetimeInput.style.display = hasReminder ? 'block' : 'none';
            document.getElementById('toggle-reminder').textContent = hasReminder ? 'Remove Reminder' : 'Add Reminder';
            currentHasReminder = hasReminder;
        }
    });

    // Add event listener to the save button
    document.getElementById('save-edit').addEventListener('click', async () => {
        const newTitle = document.getElementById('edit-title').value;
        const newContent = document.getElementById('edit-content').value;
        const newDatetime = currentHasReminder ? document.getElementById('edit-datetime').value : null;

        note.title = newTitle;
        note.content = newContent;
        note.reminder = newDatetime;
        if (newDatetime) {
            note.alertedDay = false;
            note.alertedTime = false;
            note.missed = false;
        }
        note.lastEditTime = new Date().toLocaleString();

        try {
            const updates = {
                title: newTitle,
                content: newContent,
                reminder: newDatetime,
                lastEditTime: note.lastEditTime
            };
            if (newDatetime) {
                updates.alertedDay = false;
                updates.alertedTime = false;
                updates.missed = false;
            }

            // Update on server and local arrays (this will move between arrays if reminder changed)
            await updateOnServerAndLocal(note.id, updates);

            // Refresh both displays since item might have moved
            displayNotes();
            displayReminders();
            checkReminders();
        } catch (error) {
            console.error('Error updating note:', error);
        }
        modal.style.display = 'none';
    });

    // Add event listener to the cancel button
    document.getElementById('cancel-edit').addEventListener('click', () => {
        modal.style.display = 'none';
    });
}

function showNoteDetails(index, type) {
    const noteList = type === 'note' ? notes : reminders;
    const note = noteList[index];
    const modal = document.getElementById('note-modal');
    const modalBody = document.getElementById('modal-body');

    let buttons = `
        <button id="edit-detail">Edit</button>
        <button id="delete-detail">Delete</button>
    `;

    if (type === 'reminder') {
        buttons += `
            <button id="toggle-done-detail" class="${note.done ? 'undone' : 'done'}">${note.done ? 'Undone' : 'Done'}</button>
        `;
    }

    modalBody.innerHTML = `
        <h2>${note.title}</h2>
        <p>${note.content}</p>
        <small>Created at: ${note.timestamp}</small>
        <br><small>Last edited: ${note.lastEditTime}</small>
        ${note.reminder ? `<br><small>Reminder set for: ${new Date(note.reminder).toLocaleString()}</small>` : ''}
        ${note.missed ? '<br><small class="status missed">MISSED</small>' : ''}
        ${note.done ? '<br><small class="status done">DONE</small>' : ''}
        <div class="modal-buttons">
            ${buttons}
        </div>
    `;

    modal.style.display = 'block';

    // Close modal
    const closeBtn = document.querySelector('.close');
    closeBtn.onclick = () => modal.style.display = 'none';
    window.onclick = (event) => {
        if (event.target === modal) modal.style.display = 'none';
    };

    // Add event listeners to buttons
    document.getElementById('edit-detail').addEventListener('click', () => {
        editNote(index, type);
        // Don't close modal, editNote will update the content
    });

    document.getElementById('delete-detail').addEventListener('click', async () => {
        // Delete from server and local arrays
        await deleteFromServerAndLocal(note.id);

        if (type === 'note') {
            displayNotes();
        } else {
            displayReminders();
        }
        modal.style.display = 'none';
    });

    if (type === 'reminder') {
        document.getElementById('toggle-done-detail').addEventListener('click', async () => {
            note.done = !note.done;
            if (note.done) {
                note.missed = false;
            }

            // Update on server and local arrays
            await updateOnServerAndLocal(note.id, {
                done: note.done,
                missed: note.missed
            });

            displayReminders();
            checkReminders();
            modal.style.display = 'none';
        });
    }
}

function checkReminders() {
    const now = new Date();
    const today = now.toDateString(); // e.g., "Fri Dec 20 2025"

    reminders.forEach(async (reminder) => {
        if (!reminder.reminder || reminder.done) return;

        try {
            const reminderDate = new Date(reminder.reminder);
            if (isNaN(reminderDate.getTime())) return; // Invalid date

            const reminderDay = reminderDate.toDateString();
            const reminderTime = reminderDate.getTime();

            let needsUpdate = false;
            const updates = {};

            // Check if it's the day of the reminder
            if (!reminder.alertedDay && reminderDay === today) {
                alert(`Reminder for today: ${reminder.title}`);
                reminder.alertedDay = true;
                updates.alertedDay = true;
                needsUpdate = true;
            }

            // Check if it's the specific time (within 1 minute)
            if (!reminder.alertedTime && Math.abs(now.getTime() - reminderTime) < 60000) {
                alert(`Reminder time: ${reminder.title}`);
                reminder.alertedTime = true;
                updates.alertedTime = true;
                needsUpdate = true;
            }

            // Check if missed
            if (!reminder.missed && now.getTime() > reminderTime + 60000) { // Past by more than 1 minute
                reminder.missed = true;
                alert(`Missed reminder: ${reminder.title}`);
                updates.missed = true;
                needsUpdate = true;
                displayReminders(); // Update display
            }

            // Update server if needed
            if (needsUpdate) {
                await updateOnServerAndLocal(reminder.id, updates);
            }
        } catch (error) {
            console.error('Error checking reminder:', error);
        }
    });
}
