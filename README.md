# iKnow

A gentle web game that helps a grandmother in the early stages of dementia practise recognising her children, grandchildren and great-grandchildren from their photos.

משחק עדין שעוזר לסבתא לתרגל את זיהוי בני המשפחה לפי תמונה. מסמך התכנון המלא: [docs/DESIGN.md](docs/DESIGN.md).

## What is here

- `/` – home screen for the player
- `/play` – the "Who is this?" round: choose or say the name, with a ladder of hints and no failure states
- `/admin` – add family members, photos and voice greetings

Hebrew (default) and English.

## Where the family data lives

- **With a database** (`DATABASE_URL` or `POSTGRES_URL`, e.g. Neon added from the Vercel Storage tab): names, photos, voice greetings and progress are stored in Postgres and shared by every device. Tables are created on first use. Access needs the password in `ADMIN_PASSWORD`, typed once per device; photos and recordings are only served to signed-in devices.
- **Without a database**: a trial mode with a fictional sample family, kept in the browser only (IndexedDB).

No family photos ever belong in this repository.

## Run

```bash
npm install
npm run dev
```

Built with Next.js and TypeScript.
