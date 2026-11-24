# Carta, Forbici, Sasso

Una webapp leggera e curata per giocare a **Carta, Forbici, Sasso** contro la CPU direttamente dal browser.

## Gioca online

- **GitHub Pages:** https://endermark.github.io/webapp_game/

## Funzionalità

- **Due modalità di gioco:** Partita libera oppure Al meglio di 5 (primo a 3 punti).
- **Animazioni e feedback immediato:** animazione pre-mossa, evidenziazione del vincitore e spiegazione della regola del round.
- **Effetti sonori sintetizzati:** audio via Web Audio API con pulsante di attivazione/disattivazione.
- **Scorciatoie da tastiera:** `1`/`S` (Sasso), `2`/`C` (Carta), `3`/`F` (Forbici), `R` (Nuova partita).
- **Storico e condivisione:** tracciamento della serie di vittorie, ultimi 8 round e pulsante Condividi.

## Struttura del progetto

- `index.html` — struttura semantica HTML5 e icone SVG
- `styles.css` — design system, layout responsive e animazioni CSS
- `game.js` — logica di gioco, salvataggio locale, audio sintetizzato e condivisione