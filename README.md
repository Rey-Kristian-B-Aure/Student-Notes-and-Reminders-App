# Student Notes and Reminders App

A web application for managing notes and reminders with JSON file backend for data persistence.

## Features

- Create and manage notes with titles and content
- Set reminders with date and time
- Persistent storage using JSON file
- Automatic reminder alerts
- Mark reminders as done
- Reschedule reminders
- Edit and delete notes/reminders
- Offline fallback to localStorage

## Prerequisites

- Node.js (v14 or higher)

## Installation

1. Clone or download the project files

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```

4. Open your browser and navigate to `http://localhost:3000`

## Usage

### Adding Notes
- Enter your note content in the text area
- Optionally add a title
- Optionally set a reminder date and time
- Click "Save Note"

### Managing Reminders
- Notes with reminders appear in the "Reminders" section
- Click on any reminder to view details, edit, delete, mark as done, or reschedule
- Reminders will automatically alert you when the time comes

### Editing Notes/Reminders
- Click on any note or reminder to open the details modal
- Click "Edit" to modify the title and content
- For reminders, you can also mark as done or reschedule

## API Endpoints

- `GET /api/notes` - Get all notes and reminders
- `GET /api/next-id` - Get the next available ID
- `POST /api/notes` - Create a new note/reminder
- `PUT /api/notes/:id` - Update a note/reminder
- `DELETE /api/notes/:id` - Delete a note/reminder

## Database Schema

Each note/reminder document contains:
- `id`: Unique identifier (number)
- `title`: Note title (string)
- `content`: Note content (string)
- `timestamp`: Creation timestamp (string)
- `lastEditTime`: Last edit timestamp (string)
- `reminder`: Reminder date/time (string, null if no reminder)
- `alertedDay`: Whether day alert was shown (boolean)
- `alertedTime`: Whether time alert was shown (boolean)
- `done`: Whether reminder is completed (boolean)
- `missed`: Whether reminder was missed (boolean)

## Development

For development with auto-restart:
```bash
npm run dev
```

## Technologies Used

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express.js
- Database: MongoDB with Mongoose ODM
- Additional: CORS, Body-parser