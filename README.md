# Collaborative Pomodoro Focus Platform

This project extends the original timer app into a group study platform with:

- local user identity (id + username)
- create/join study groups by code or invite link
- synced group sessions (MVP realtime model with shared running sessions)
- daily/weekly/all-time leaderboard
- XP rewards (+25 base + streak bonus)

## Run Locally

1. Install dependencies:

```bash
npm install
```

2. Add Firebase environment values in a local `.env` file:

```bash
VITE_FIREBASE_API_KEY=AIzaSyAwBIoXT9mMrSGfa9zRLZH9nWqofxIgs0M
VITE_FIREBASE_AUTH_DOMAIN=pomodorommw.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=pomodorommw
VITE_FIREBASE_STORAGE_BUCKET=pomodorommw.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=229859222466
VITE_FIREBASE_APP_ID=1:229859222466:web:b9ddc2f03076ad26386c5b
VITE_FIREBASE_MEASUREMENT_ID=G-VVMQEDJZ90
```

3. Start development server:

```bash
npm run dev
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
