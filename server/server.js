const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Path to the JSON data file
const DATA_FILE = path.join(__dirname, '..', 'data', 'notes.json');

// Ensure data directory exists
async function ensureDataDirectory() {
    const dataDir = path.dirname(DATA_FILE);
    try {
        await fs.access(dataDir);
    } catch {
        await fs.mkdir(dataDir, { recursive: true });
    }
}

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Read data from JSON file
async function readData() {
    try {
        await ensureDataDirectory();
        const data = await fs.readFile(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // If file doesn't exist or is empty, return default structure
        return { notes: [], reminders: [], nextId: 1 };
    }
}

// Write data to JSON file
async function writeData(data) {
    await ensureDataDirectory();
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

// Get next ID
async function getNextId() {
    const data = await readData();
    const nextId = data.nextId || 1;
    data.nextId = nextId + 1;
    await writeData(data);
    return nextId;
}

// Routes

// Get all notes and reminders
app.get('/api/notes', async (req, res) => {
    try {
        const data = await readData();
        res.json({
            notes: data.notes || [],
            reminders: data.reminders || []
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get next ID
app.get('/api/next-id', async (req, res) => {
    try {
        const nextId = await getNextId();
        res.json({ nextId: nextId - 1 }); // Return current nextId without incrementing
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create a new note/reminder
app.post('/api/notes', async (req, res) => {
    try {
        const data = await readData();
        let note = req.body;

        if (note.reminder) {
            data.reminders = data.reminders || [];
            data.reminders.push(note);
        } else {
            data.notes = data.notes || [];
            data.notes.push(note);
        }

        await writeData(data);
        res.status(201).json(note);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update a note/reminder
app.put('/api/notes/:id', async (req, res) => {
    try {
        const data = await readData();
        const id = parseInt(req.params.id);
        let updates = req.body;

        // Find the existing note
        let existingNote = null;
        if (data.notes) {
            existingNote = data.notes.find(note => note.id === id);
        }
        if (!existingNote && data.reminders) {
            existingNote = data.reminders.find(reminder => reminder.id === id);
        }

        if (!existingNote) {
            return res.status(404).json({ error: 'Note not found' });
        }

        // Create the updated note
        const updatedNote = { ...existingNote, ...updates };

        // Find and update in notes
        let found = false;
        if (data.notes) {
            const noteIndex = data.notes.findIndex(note => note.id === id);
            if (noteIndex !== -1) {
                data.notes[noteIndex] = updatedNote;
                found = true;
            }
        }

        // Find and update in reminders
        if (!found && data.reminders) {
            const reminderIndex = data.reminders.findIndex(reminder => reminder.id === id);
            if (reminderIndex !== -1) {
                data.reminders[reminderIndex] = updatedNote;
                found = true;
            }
        }

        if (!found) {
            return res.status(404).json({ error: 'Note not found' });
        }

        await writeData(data);
        res.json(updatedNote);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete a note/reminder
app.delete('/api/notes/:id', async (req, res) => {
    try {
        const data = await readData();
        const id = parseInt(req.params.id);

        let deleted = false;

        // Remove from notes
        if (data.notes) {
            const initialLength = data.notes.length;
            data.notes = data.notes.filter(note => note.id !== id);
            if (data.notes.length < initialLength) {
                deleted = true;
            }
        }

        // Remove from reminders
        if (!deleted && data.reminders) {
            const initialLength = data.reminders.length;
            data.reminders = data.reminders.filter(reminder => reminder.id !== id);
            if (data.reminders.length < initialLength) {
                deleted = true;
            }
        }

        if (!deleted) {
            return res.status(404).json({ error: 'Note not found' });
        }

        await writeData(data);
        res.json({ message: 'Note deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update multiple notes/reminders (for bulk operations)
app.put('/api/notes', async (req, res) => {
    try {
        const data = await readData();
        const updates = req.body;
        const results = [];

        for (const update of updates) {
            let found = false;

            // Update in notes
            if (data.notes) {
                const noteIndex = data.notes.findIndex(note => note.id === update.id);
                if (noteIndex !== -1) {
                    data.notes[noteIndex] = { ...data.notes[noteIndex], ...update };
                    results.push(data.notes[noteIndex]);
                    found = true;
                }
            }

            // Update in reminders
            if (!found && data.reminders) {
                const reminderIndex = data.reminders.findIndex(reminder => reminder.id === update.id);
                if (reminderIndex !== -1) {
                    data.reminders[reminderIndex] = { ...data.reminders[reminderIndex], ...update };
                    results.push(data.reminders[reminderIndex]);
                    found = true;
                }
            }
        }

        await writeData(data);
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Data will be stored in: ${DATA_FILE}`);
});
