// mocks.html: real screens of the app, built with the same functions as the game, on a fixed sample case.
// Boards: open proposals first (each direction with its own pick), then the font comparison (decided).
import { generateCase } from './generator.js';
import { screen, newState, crewCard, profileModal, reportsPanel } from './ui.js';
import { DISPLAY_FONTS } from './fonts.js';

const SAMPLE = 'K9-7UQ8';
const c = generateCase(SAMPLE);
const JERSEY = 3;

const base = () => ({ ...newState(), code: SAMPLE });
const MIN = 60000;

// ---------- frames ----------

function phone(view, { cls = '', font = JERSEY, scroll = '' } = {}) {
  const v = { c, wide: false, remainingMs: 10 * MIN, dev: false, ...view };
  return `<div class="mock-frame ${cls}" data-font="${font}" ${scroll ? `data-scroll="${scroll}"` : ''}>${screen(v)}</div>`;
}
function laptop(view, { cls = '' } = {}) {
  const v = { c, wide: true, remainingMs: 10 * MIN, dev: false, ...view };
  return `<div class="mock-wide-wrap"><div class="mock-frame mock-wide ${cls}" data-font="${JERSEY}">${screen(v)}</div></div>`;
}
function column(html) {
  return `<div class="mock-frame mock-column" data-font="${JERSEY}"><main class="screen">${html}</main></div>`;
}
// Page text: button names never break, and the last two words of a paragraph stay together.
const tidy = (html) => html
  .replace(/\[ ([A-Z ]+?) \]/g, (m, name) => `[&nbsp;${name.replace(/ /g, '&nbsp;')}&nbsp;]`)
  .replace(/ ([^ <>]+)(<\/p>|$)/g, '&nbsp;$1$2');
const cap = (label, html) => `<figure class="mock-fig">${html}<figcaption>${label}</figcaption></figure>`;

function direction(board, d, chosen) {
  const lock = chosen ? `disabled ${chosen === d.key ? 'checked' : ''}` : '';
  return `<div class="dir ${chosen === d.key ? 'is-chosen' : ''}" id="${board}-${d.key}">
    <label class="pick"><input type="radio" name="${board}" value="${d.key}" ${lock}> <b>${d.title}</b>${d.rec ? ' <span class="rec">Consigliata</span>' : ''}${chosen === d.key ? ' <span class="done">Scelta</span>' : ''}</label>
    <div class="dir-note">${tidy(d.note)}</div>
    <div class="dir-frames">${d.frames.join('')}</div>
  </div>`;
}

// ---------- 1. reset ----------

const playing = { ...base(), phase: 'play', tab: 'reports' };
const RESET = {
  id: 'reset', title: 'Reset', decided: 'A + B', chosen: 'AB', answer: 'A + B · Tutte e due',
  quote: '«serve un modo per poter resettare il gioco»',
  context: 'Oggi una partita salvata riparte da sola all\'apertura (per non perderla se la pagina si ricarica per sbaglio), e l\'unico modo di cambiarla è finirla. Al festival il gruppo successivo si troverebbe la partita di chi c\'era prima.',
  dirs: [
    {
      key: 'A', title: 'A · Si riparte dalla home', rec: true,
      note: `<p>All'apertura c'è sempre la home. Se c'è una partita salvata, la home la dice nel registro (caso, ossigeno rimasto) e propone <b>[ CONTINUE ]</b> accanto a <b>[ NEW GAME ]</b>. Durante la partita non c'è nessun pulsante in più.</p>
        <p>Perché: risolve il caso del gruppo successivo senza aggiungere nell'indagine un pulsante che si può premere per sbaglio. Costo: dopo un ricaricamento involontario serve un tocco in più (CONTINUE). Il timer intanto corre, come oggi.</p>`,
      frames: [
        cap('Riapertura con una partita in corso', phone({ state: { ...base(), phase: 'home' }, saved: { code: SAMPLE, phase: 'play', remainingMs: 7 * MIN + 42000 } })),
        cap('Riapertura dopo una partita finita', phone({ state: { ...base(), phase: 'home' }, saved: { code: SAMPLE, phase: 'debrief' } })),
      ],
    },
    {
      key: 'B', title: 'B · Pulsante QUIT nella barra in alto',
      note: `<p>All'apertura la partita salvata riparte come oggi. Nella barra in alto c'è <b>[ QUIT ]</b>; chiede conferma in una finestra dentro la pagina e riporta alla home.</p>
        <p>Costo: un pulsante sempre visibile durante l'indagine, accanto al timer, e il gruppo successivo deve comunque trovarlo e premerlo.</p>`,
      frames: [
        cap('Durante la partita', phone({ state: playing, quit: true, remainingMs: 7 * MIN + 42000 })),
        cap('Dopo QUIT', phone({ state: playing, quit: true, quitOpen: true, remainingMs: 7 * MIN + 42000 })),
      ],
    },
    {
      key: 'AB', title: 'A + B · Tutte e due',
      note: '<p>La home all\'apertura e il QUIT durante la partita. Le schermate sono quelle sopra.</p>',
      frames: [],
    },
  ],
};

// ---------- 2. reports ----------

const reportsDir = (key, title, note, style, rec = false) => ({
  key, title, rec, note,
  frames: [
    cap('Telefono', phone({ state: playing, reportStyle: style, remainingMs: 7 * MIN + 42000 })),
    cap('Laptop: la colonna dei rapporti', column(reportsPanel(c, style))),
  ],
});
const REPORTS = {
  id: 'reports', title: 'Rapporti', decided: 'B, il rapporto come documento', chosen: 'sheet', answer: 'B · Il rapporto come documento',
  quote: '«sembra concentrarsi di più sui dati, che sul report in sé»',
  context: 'Il numero del rapporto e l\'ID restano visibili in tutte le direzioni: servono per il codice. La carta d\'identità completa (NAME_, ROLE_, ID_, barra nera del nome), chiesta dal brief, resta nel profilo che si apre toccando la persona.',
  dirs: [
    reportsDir('now', 'Oggi', '<p>La carta d\'identità completa sopra ogni rapporto, il testo sotto a 16px.</p>', 'card'),
    reportsDir('lead', 'A · Il testo davanti', `<p>Una riga sola per i dati (numero grande, ritratto piccolo, nome, ruolo e ID), poi il testo a 18px. I rapporti si leggono uno dopo l'altro come una lista, divisi da una linea.</p>
      <p>Perché: è la direzione più leggibile e la più compatta; i quattro rapporti stanno quasi in uno schermo di laptop.</p>`, 'lead', true),
    reportsDir('sheet', 'B · Il rapporto come documento', `<p>Ogni rapporto è un foglio chiaro, come una dichiarazione: in alto solo «REPORT 01», poi il testo, e chi l'ha scritto in fondo come firma.</p>
      <p>Una lettura mia, da pesare: si legge cosa dice prima di sapere chi lo dice, che è il tema del gioco; ma il brief vuole che la trappola nasca da come si leggono i personaggi, e qui il personaggio arriva dopo.</p>`, 'sheet'),
    reportsDir('tag', 'C · Carta piccola accanto', `<p>Resta un pezzo della carta d'identità (ritratto e barra nera del nome) in una colonna stretta a sinistra; a destra numero, ruolo e ID su una riga e il testo a 18px.</p>
      <p>Perché: tiene il linguaggio delle carte d'identità, ma con un quarto dello spazio.</p>`, 'tag'),
  ],
};

// ---------- 3. last minute ----------

const critical = { ...base(), phase: 'play', tab: 'reports' };
const criticalWide = { ...base(), phase: 'play', tab: 'map' };
const critDir = (key, title, note, cls, rec = false) => ({
  key, title, rec, note,
  frames: [
    cap('Telefono, 00:42', phone({ state: critical, remainingMs: 42000 }, { cls: `emergency ${cls}` })),
    cap('Laptop, 00:42 (ridotto a metà)', laptop({ state: criticalWide, remainingMs: 42000 }, { cls: `emergency ${cls}` })),
  ],
});
const CRITICAL = {
  id: 'critical', title: 'Ultimo minuto', decided: 'B + C senza ricolorare le finestre', chosen: 'BC', answer: 'B+C · Non ricolorare tutte le finestre altrimenti disorienta l\'interfaccia',
  quote: '«sono sicuro che se manca così poco tempo tutto lo schermo dovrebbe dare l\'impressione di pericolo»',
  context: 'Oggi diventano rossi solo il timer, la barra dell\'ossigeno, la griglia e la striscia d\'allarme. E il timer lampeggia sparendo del tutto per mezzo secondo: nella tua foto non c\'era. In tutte e tre le direzioni il timer non sparisce più, passa dal rosso al bianco. I testi restano chiari, perché nell\'ultimo minuto si leggono i rapporti e si manda il codice. Con «riduci movimento» attivo nel sistema, niente pulsazioni.',
  dirs: [
    critDir('now', 'Oggi', '<p>Lo stato attuale, per confronto.</p>', ''),
    critDir('A', 'A · Tutto diventa rosso', '<p>Il ciano di dati e comandi diventa rosso ovunque: bordi delle finestre, schede, pulsanti, numeri, mappa. Fondo dei pannelli scurito verso il rosso.</p>', 'crit-a'),
    critDir('B', 'B · Allarme sui bordi', '<p>I colori restano, ma tutto lo schermo è chiuso da una cornice rossa che pulsa, e la striscia d\'allarme pulsa con lei.</p>', 'crit-b'),
    critDir('C', 'C · Errore critico', `<p>A e B insieme, più le strisce di pericolo nella barra in alto, la striscia d'allarme piena e le barre delle finestre rosse, come nel tuo riferimento «Error 404».</p>
      <p>Perché: è l'unica in cui il pericolo si vede anche guardando un solo punto qualsiasi dello schermo, che è quello che chiedi. Costo: è la più carica; i testi restano bianchi su fondo scuro, quindi si leggono ancora.</p>`, 'crit-a crit-b crit-c', true),
    critDir('BC', 'B + C, finestre invariate', `<p>La cornice rossa che pulsa (B), le strisce di pericolo nella barra in alto e la striscia d'allarme piena (C). Finestre, schede e pulsanti restano dei loro colori.</p>`, 'alarm'),
  ],
};

function board(b) {
  return `<section class="board" id="${b.id}">
    <header class="board-head">
      <h2>${b.title}${b.decided ? ` <span class="done">Deciso: ${b.decided}</span>` : ''}</h2>
      <p class="quote">${b.quote}</p>
      <p>${tidy(b.context)}</p>
    </header>
    ${b.decided && b.answer ? `<p class="answer">La tua scelta: <b>${b.answer}</b></p>` : ''}
    ${b.dirs.map((d) => direction(b.id, d, b.chosen)).join('')}
  </section>`;
}


// ---------- buttons ----------

const solutionEnd = { ...base(), phase: 'solution', log: [{ q: { kind: 'hatch', what: 'M-K', a: 35, b: 50 }, ans: 'no' }], sentCode: '127' };
const askState = { ...base(), phase: 'play', tab: 'ask', draft: { kind: 'hatch', what: 'M-K', a: 45, b: 60 } };
const btnDir = (key, title, note, cls, rec = false) => ({
  key, title, rec, note,
  frames: [
    cap('Soluzione, in fondo', phone({ state: solutionEnd }, { cls, scroll: 'bottom' })),
    cap('Ask NOVA', phone({ state: askState, remainingMs: 6 * MIN + 5000 }, { cls, scroll: '330' })),
    cap('Home con partita salvata', phone({ state: { ...base(), phase: 'home' }, saved: { code: SAMPLE, phase: 'play', remainingMs: 7 * MIN + 42000 } }, { cls })),
  ],
});
const BUTTONS = {
  id: 'buttons', title: 'Pulsanti',
  quote: '«non si capisce che debrief è un pulsante»',
  context: 'Vale per tutti i pulsanti tra parentesi quadre, non solo per DEBRIEF: oggi sono testo con le parentesi, e solo passandoci sopra diventano un blocco. Le schede, i pulsanti di scelta (HATCH OPENING / MOTION) e i nomi da toccare non cambiano: quando sono selezionati sono pieni di ciano, e un pulsante non deve sembrare una cosa selezionata.',
  dirs: [
    btnDir('now', 'Oggi', '<p>Testo tra parentesi, senza contorno.</p>', ''),
    btnDir('A', 'A · Principale pieno', `<p>Il pulsante principale di ogni schermata è un blocco ciano pieno; gli altri hanno un contorno.</p>
      <p>Costo: pieno di ciano è anche lo stato «selezionato» di schede e scelte, quindi un pulsante e una scheda attiva si somigliano.</p>`, 'btns-a'),
    btnDir('B', 'B · Le parentesi diventano la cornice', `<p>Le parentesi diventano due staffe alte ai lati del pulsante, con un fondo leggero, come START / CONFIGURE / QUIT nel tuo riferimento.</p>
      <p>Perché: si legge come pulsante senza confondersi con lo stato selezionato, e tiene le parentesi che fanno parte del linguaggio.</p>`, 'btns-b', true),
    btnDir('C', 'C · Riquadro con l\'angolo tagliato', '<p>Le parentesi restano nel testo, il pulsante è chiuso in un riquadro con un angolo tagliato.</p>', 'btns-c'),
  ],
};

// ---------- asking from the map ----------

const askOn = (draft, where) => phone({ state: { ...base(), phase: 'play', tab: 'ask', draft }, askWhere: where, remainingMs: 6 * MIN + 5000 });
const MAPQ = {
  id: 'mapq', title: 'Domande a NOVA dalla mappa',
  quote: '«anche l\'interfaccia di prompt a nova si può migliorare, mostrando la mappa con selezionabile la zona»',
  context: 'In tutte le direzioni la domanda resta quella di oggi, con l\'anteprima per intero; cambia solo come si sceglie il luogo. La mappa è la stessa della scheda MAP. Life Support resta selezionabile, perché la domanda rifiutata fa parte del gioco.',
  dirs: [
    { key: 'now', title: 'Oggi', note: '<p>Sensore, poi l\'elenco dei nomi.</p>', frames: [cap('Portello scelto', askOn({ kind: 'hatch', what: 'M-K', a: 45, b: 60 }, 'chips'))] },
    {
      key: 'A', title: 'A · La mappa al posto dell\'elenco',
      note: '<p>Si sceglie il sensore, poi si tocca la mappa: con HATCH OPENING si possono toccare solo i portelli, con MOTION solo i moduli; il resto è spento.</p>',
      frames: [cap('Portello', askOn({ kind: 'hatch', what: 'M-K', a: 45, b: 60 }, 'map')), cap('Movimento', askOn({ kind: 'motion', what: 'M', a: 45, b: 60 }, 'map'))],
    },
    {
      key: 'B', title: 'B · Mappa ed elenco insieme',
      note: '<p>Come A, con l\'elenco dei nomi sotto la mappa: toccare l\'uno seleziona anche l\'altro. Costo: la schermata più lunga, sul telefono la domanda finisce sotto.</p>',
      frames: [cap('Portello', askOn({ kind: 'hatch', what: 'M-K', a: 45, b: 60 }, 'both'))],
    },
    {
      key: 'C', title: 'C · Si tocca il luogo, il sensore segue', rec: true,
      note: `<p>Niente scelta del sensore: si tocca un portello per chiedere se si è aperto, un modulo per chiedere del movimento. Poi l'orario e l'invio.</p>
        <p>Perché: un passo in meno, e il luogo sulla mappa dice già quale sensore c'è. Costo: i due tipi di sensore non sono più due pulsanti, li spiega la riga sotto la mappa.</p>`,
      frames: [cap('Portello toccato', askOn({ kind: 'hatch', what: 'M-K', a: 45, b: 60 }, 'tap')), cap('Modulo toccato', askOn({ kind: 'motion', what: 'M', a: 45, b: 60 }, 'tap'))],
    },
  ],
};

// ---------- fonts (decided) ----------

const STATES = [
  { id: 'home', title: 'Home', state: { ...base(), phase: 'home' } },
  { id: 'briefing', title: 'Briefing', state: { ...base(), phase: 'briefing' } },
  { id: 'investigation', title: 'Investigation: reports', state: { ...base(), phase: 'play', tab: 'reports' }, remainingMs: 7 * MIN + 42000 },
  {
    id: 'ask', title: 'Ask NOVA', remainingMs: 5 * MIN + 13000,
    state: {
      ...base(), phase: 'play', tab: 'ask',
      draft: { kind: 'hatch', what: 'M-K', a: 45, b: 60 },
      log: [{ q: { kind: 'motion', what: 'K', a: 40, b: 55 }, ans: 'yes' }],
    },
  },
  { id: 'ending', title: 'Ending: wrong code', state: { ...base(), phase: 'ending', ending: 'wrong', sentCode: '255' }, red: true },
  { id: 'card', title: 'Crew card and profile', card: true },
];

function fontFrame(s, font) {
  let html;
  if (s.card) {
    html = `<main class="screen mock-cardscreen"><div class="mock-card">${crewCard(c, 'mira', { asButton: false })}</div>${profileModal(c, 'echo')}</main>`;
  } else {
    html = screen({ state: s.state, c, wide: false, remainingMs: s.remainingMs ?? 10 * MIN, dev: false });
  }
  return `<div class="mock-frame ${s.red ? 'emergency' : ''}" data-font="${font.n}">${html}</div>`;
}

const fontsBoard = `
  <section class="board" id="fonts">
    <header class="board-head">
      <h2>Font dei titoli <span class="done">Deciso: Jersey 10</span></h2>
      <p>Same screens, same sample case (${SAMPLE}), one column per font. Only the display font changes: texts stay in IBM Plex Sans, data in IBM Plex Mono. Each frame scrolls.</p>
    </header>
    <div class="mock-grid">
      <div class="mock-cols">${DISPLAY_FONTS.map((f) => `<div class="mock-col-head" data-font="${f.n}"><span>${f.n}</span> <b class="mock-fontname">${f.name}</b></div>`).join('')}</div>
      ${STATES.map((s) => `
        <section class="mock-row" id="${s.id}">
          <h3>${s.title}</h3>
          <div class="mock-cols">${DISPLAY_FONTS.map((f) => fontFrame(s, f)).join('')}</div>
        </section>`).join('')}
    </div>
  </section>`;

// ---------- page ----------

const OPEN = [BUTTONS, MAPQ];
const DECIDED = [RESET, REPORTS, CRITICAL];
const root = document.getElementById('mocks');
root.innerHTML = `
  <div class="mock-head">
    <h1>NOVA // Mock</h1>
    <p>${tidy(`Schermate vere dell'app, caso di prova ${SAMPLE}, font Jersey 10. Ogni riquadro scorre. Prima le tavole aperte: in ognuna scegli una direzione con il pallino, e in fondo trovi la raccolta. Sotto, le tavole già decise, con tutte le prove.`)}</p>
    <nav class="mock-nav">${OPEN.map((b) => `<a href="#${b.id}">${b.title}</a>`).join('')}<a href="#summary">Raccolta</a>${DECIDED.map((b) => `<a href="#${b.id}">${b.title} (deciso)</a>`).join('')}<a href="#fonts">Font (deciso)</a></nav>
  </div>
  ${OPEN.map(board).join('')}
  <section class="board" id="summary">
    <header class="board-head"><h2>Raccolta</h2></header>
    <pre class="summary" data-summary></pre>
  </section>
  ${DECIDED.map(board).join('')}
  ${fontsBoard}`;

root.querySelectorAll('[data-scroll]').forEach((f) => { f.scrollTop = f.dataset.scroll === 'bottom' ? f.scrollHeight : Number(f.dataset.scroll); });

function summary() {
  const lines = OPEN.map((b) => {
    const v = root.querySelector(`input[name="${b.id}"]:checked`);
    const d = v && b.dirs.find((x) => x.key === v.value);
    return `${b.title}: ${d ? d.title : '(da scegliere)'}`;
  });
  root.querySelector('[data-summary]').textContent = lines.join('\n');
}
root.addEventListener('change', summary);
summary();
