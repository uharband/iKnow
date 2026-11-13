# iKnow

A gentle web game that helps a grandmother in the early stages of dementia practise recognising her children, grandchildren and great-grandchildren from their photos.

משחק עדין שעוזר לסבתא לתרגל את זיהוי בני המשפחה לפי תמונה. מסמך התכנון המלא: [docs/DESIGN.md](docs/DESIGN.md).

## What is here

- `/` – home screen for the player
- `/play` – the "Who is this?" round: choose or say the name, with a ladder of hints and no failure states
- `/admin` – add family members, photos and voice greetings

Hebrew (default) and English. In this first version all family data stays in the browser of the device it was entered on (IndexedDB); nothing is uploaded, and no family photos ever belong in this repository.

## Run

```bash
npm install
npm run dev
```

Built with Next.js and TypeScript.
