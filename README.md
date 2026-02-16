# Gestione Scadenze - Progressive Web App

App di gestione finanze personali installabile come PWA su iOS, Android e Desktop.

## 🌐 Deploy come PWA (Progressive Web App)

### Setup iniziale

1. **Configura Supabase**

Copia il file `.env.example` in `.env`:

```bash
cp .env.example .env
```

Modifica `.env` e inserisci le tue credenziali Supabase:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Ottieni le credenziali da: [Supabase Dashboard](https://supabase.com/dashboard/project/_/settings/api)

2. **Installa dipendenze**

```bash
npm install
```

3. **Build per produzione**

```bash
npm run build
```

Questo crea la cartella `dist/` pronta per il deploy.

### Deploy

Puoi hostare la PWA su qualsiasi piattaforma:

#### Vercel (consigliato)
```bash
npm install -g vercel
vercel --prod
```

#### Netlify
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

#### Firebase Hosting
```bash
firebase deploy
```

#### Hosting generico
Carica il contenuto della cartella `dist/` su qualsiasi web server.

### Installazione su dispositivi

**iPhone/iPad (Safari):**
1. Apri il sito da Safari
2. Tap sull'icona "Condividi" 
3. Scorri e tap "Aggiungi a Home"
4. L'app appare come icona sulla Home!

**Android (Chrome):**
1. Apri il sito da Chrome
2. Tap sui 3 puntini
3. "Installa app" o "Aggiungi a Home"

**Desktop (Chrome/Edge):**
1. Apri il sito
2. Clicca sull'icona "Installa" nella barra degli indirizzi
3. L'app si installa come app desktop

### Sviluppo locale

```bash
npm run dev
```

Apri http://localhost:5173

### Requisiti PWA

✅ HTTPS (o localhost per sviluppo)
✅ manifest.webmanifest
✅ Service Worker (per offline)
✅ Icone corrette

Tutto è già configurato in questo progetto!

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase (Backend & Auth)

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

