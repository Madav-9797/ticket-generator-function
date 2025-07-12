# Ticket Generator Appwrite Function

This is a Node.js (v22) function for generating random tickets and storing them in Appwrite DB.

## Setup

- Set environment variables in Appwrite:
  - `APPWRITE_ENDPOINT`
  - `APPWRITE_PROJECT_ID`
  - `APPWRITE_API_KEY`
  - `APPWRITE_DATABASE_ID`
  - `APPWRITE_COLLECTION_ID`

## Deploy

1. Push this repo to GitHub.
2. In Appwrite Console:
   - Go to **Functions → Your Function → Settings**
   - Click **Connect Repository**.
   - Select GitHub + Repo + Branch.
   - Set Entrypoint: `src/main.js`
