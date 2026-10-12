# Squad desk

A hackathon team finder. People put a card on the board, say why a squad should ask them in, and request a seat.

## Run

```bash
npm install
npm run dev
```

Without Appwrite env vars the desk runs as a local preview in this browser. Sample cards are included so search, suggestions, and join requests can be tried immediately.

## Connect Appwrite

1. Create a project on Appwrite Cloud, or run the open-source server.
2. In Auth, enable email and password.
3. Add a Web platform with hostname `localhost`.
4. Copy `.env.example` to `.env.local` and fill in the endpoint, project id, and a setup API key.
5. `npm run setup`

The setup script creates the `squad_desk` tables and deploys `functions/squad-agent`. Put a free Groq key in `GROQ_API_KEY` before setup if you want invite-line drafts and written match reasons. Search, cards, and join requests work without it.

Do not prefix `APPWRITE_API_KEY` or `GROQ_API_KEY` with `VITE_`. Those values must not ship in the browser bundle.
