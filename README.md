# Collaborative Pomodoro Focus Platform

This project extends the original timer app into a group study platform with:

- local user identity (id + username)
- create/join study groups by code or invite link
- synced group sessions (MVP realtime model with shared running sessions)
- daily/weekly/all-time leaderboard
- XP rewards (+25 base + streak bonus)
- in-session file sharing (Cloudinary unsigned upload)
- optional group quiz mode (creator-controlled)

## Run Locally

1. Install dependencies:

```bash
npm install
```

2. Create a local `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Then fill the placeholder values in `.env` with your own project configuration.

3. Start development server:

```bash
npm run dev
```

4. Open the app using:

```bash
http://127.0.0.1:5173
```

## Firebase Integration (MVP)

Implemented in `src/lib/firebase.js` and `src/services/groupService.js`.

Firestore collections:

- `users`
- `groups`
- `sessions`

### Required Composite Index

This app uses `where('groupId', '==', ...)` + `orderBy('createdAt', 'desc')` for group session streams.
That query needs a composite index on `sessions(groupId ASC, createdAt DESC)`.

Index config file:

- `firestore.indexes.json`

Deploy it with Firebase CLI:

```bash
firebase deploy --only firestore:indexes
```

Current flow:

1. App bootstraps a local user id/username and attempts user upsert.
2. Group create/join updates group membership and user groupIds.
3. Starting a group session writes a running session document.
4. Completing a session updates:
	- `sessions` status/completion timestamp
	- user totals (`totalFocusMinutes`, `sessionsCompleted`, `xp`)
	- group leaderboard aggregation

## Frontend Structure

Key pages/components:

- `src/components/GroupPage.jsx`
- `src/components/Leaderboard.jsx`
- `src/components/MemberList.jsx`
- `src/components/InviteModal.jsx`

Key store actions (Zustand):

- `bootstrapUserProfile`
- `setUsername`
- `createStudyGroup`
- `joinStudyGroup`
- `startSession({ mode: 'solo' | 'group' })`
- `completeSession` (XP + leaderboard sync)

## Data Models

Sample models are documented in:

- `src/constants/dataModels.js`

Included models:

- `SAMPLE_USER_MODEL`
- `SAMPLE_GROUP_MODEL`
- `SAMPLE_SESSION_MODEL`

## Notes

- If Firebase env values are missing, group operations will show a clear runtime error message.
- Invite links use this pattern: `/join?group=ABC123`.
- Do not commit `.env` or any file containing real keys/tokens.

## Cloudinary Upload Setup

To use file sharing without Firebase Storage billing:

1. Create a Cloudinary account and open your product environment.
2. Create an **unsigned** upload preset (for example: `pomodoro_unsigned`).
3. Add these env vars:

```bash
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_unsigned_upload_preset
```

Security note: do not put `API Secret` in frontend code or env files used by Vite.
