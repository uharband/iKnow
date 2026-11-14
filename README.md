# iKnow

A gentle web game that helps a grandmother in the early stages of dementia practise recognising her children, grandchildren and great-grandchildren from their photos.

משחק עדין שעוזר לסבתא לתרגל את זיהוי בני המשפחה לפי תמונה. מסמך התכנון המלא: [docs/DESIGN.md](docs/DESIGN.md).

## What is here

- `/` – home screen for the player
- `/tree` – the family tree game: place each photo in its spot, one household at a time
- `/play` – the "Who is this?" round: choose or say the name, with a ladder of hints and no failure states
- `/family` – messages: she picks a face, listens or reads, and answers by voice or by typing
- `/admin` – add family members, photos and voice greetings; create each person's personal link; read all conversations
- `/me/<token>` – a family member's personal link (no sign-in): their own conversation with her, and their own photos, nicknames and short note

Hebrew (default) and English.

## Where the family data lives

- **With a database** (`DATABASE_URL` or `POSTGRES_URL`, e.g. Neon added from the Vercel Storage tab): names, photos, voice greetings and progress are stored in Postgres and shared by every device. Tables are created on first use. Access needs the password in `ADMIN_PASSWORD`, typed once per device; photos and recordings are only served to signed-in devices.
- **Without a database**: a trial mode with a fictional sample family, kept in the browser only (IndexedDB).

Messages (text and voice) need the database. A family member's link shows only that person's conversation; the manager can read all of them. Anyone holding a link can write as that person, and the manager can replace a link at any time, which disables the old one.

No family photos ever belong in this repository.

## Run

```bash
npm install
npm run dev
```

Built with Next.js and TypeScript.
