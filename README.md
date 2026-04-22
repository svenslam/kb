# KabelBerekenaar NEN 1010:2020 (FACTA Elektrotechniek)

Een professionele tool voor het berekenen van aderdoorsnedes conform de NEN 1010:2020 norm, specifiek afgestemd op de behoeften van FACTA Elektrotechniek.

## Functionaliteiten

- **Berekening Aderdoorsnede**: Automatische selectie op basis van stroombelastbaarheid en spanningsverlies.
- **TN & TT Stelsels**: Ondersteuning voor verschillende aardingsstelsels.
- **TT-stelsel Automatisering**: Berekening van maximale kabellengte bij ontbreken van een aardlekschakelaar (RCD) op basis van de aardverspreidingsweerstand ($R_a$).
- **Uitschakeltijden**: Voldoet aan de strikte uitschakeltijden (0,4s voor TN, 0,2s voor TT).
- **Validatie**: Real-time checks op overbelasting ($I_B \le I_n$), spanningsverlies ($<5\%$) en kortsluitbeveiliging.
- **Rapportage**: Generatie van een professioneel PDF resultatenblad.

## Techniek

- **Framework**: React 18+ met Vite
- **Styling**: Tailwind CSS
- **Animaties**: Framer Motion
- **Icons**: Lucide React

## Lokaal Draaien

1. Installeer dependencies:
   ```bash
   npm install
   ```

2. Start de development server:
   ```bash
   npm run dev
   ```

3. Bouw voor productie:
   ```bash
   npm run build
   ```

## GitHub Pages Deployment

Deze repo is klaar om gehost te worden op GitHub Pages. De assets worden relatief geladen (`base: './'`).

---
*Gemaakt voor FACTA Elektrotechniek*
