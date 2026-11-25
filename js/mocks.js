// mocks.html: real screens of the app, built with the same functions as the game, on a fixed sample case.
// Boards: open proposals first (each direction with its own pick), then the font comparison (decided).
import { generateCase, answer, PEOPLE } from './generator.js';
import { ENDINGS } from './texts.js';
import { screen, newState, crewCard, profileModal, reportsPanel, askPanel } from './ui.js';
import { playWindows, typeWindow, typeNodes } from './winfx.js';
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
function laptop(view, { cls = '', big = false } = {}) {
  const v = { c, wide: true, remainingMs: 10 * MIN, dev: false, ...view };
  return `<div class="mock-wide-wrap ${big ? 'is-big' : ''}"><div class="mock-frame mock-wide ${cls}" data-font="${JERSEY}">${screen(v)}</div></div>`;
}
function column(html) {
  return `<div class="mock-frame mock-column btns-b" data-font="${JERSEY}"><main class="screen">${html}</main></div>`;
}
// Page text: button names never break, and the last two words of a paragraph stay together.
const tidy = (html) => html
  .replace(/\[ ([A-Z ]+?) \]/g, (m, name) => `[&nbsp;${name.replace(/ /g, '&nbsp;')}&nbsp;]`)
  .replace(/ ([^ <>]+)(<\/p>|$)/g, '&nbsp;$1$2');
const cap = (label, html) => `<figure class="mock-fig">${html}<figcaption>${label}</figcaption></figure>`;

function direction(board, d, chosen, closed = false) {
  const isChosen = Boolean(chosen) && [].concat(chosen).includes(d.key);
  const lock = chosen || closed ? `disabled ${isChosen ? 'checked' : ''}` : '';
  return `<div class="dir ${isChosen ? 'is-chosen' : ''}" id="${board}-${d.key}">
    <label class="pick"><input type="${d.multi ? 'checkbox' : 'radio'}" name="${board}" value="${d.key}" ${lock}> <b>${d.title}</b>${d.rec ? ' <span class="rec">Consigliata</span>' : ''}${isChosen ? ' <span class="done">Scelta</span>' : ''}</label>
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
        cap('Riapertura dopo una partita finita', phone({ state: { ...base(), phase: 'home' }, saved: { code: SAMPLE, phase: 'solution' } })),
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
  const open = !(b.decided || b.rejected || b.redo || b.over || b.done);
  return `<section class="board ${open ? 'is-open' : ''}" id="${b.id}">
    <header class="board-head">
      <h2>${b.title}${b.decided ? ` <span class="done">Deciso: ${b.decided}</span>` : ''}${b.rejected ? ' <span class="done done-no">Bocciata</span>' : ''}${b.redo ? ' <span class="done done-redo">Da rifare</span>' : ''}${b.done ? ` <span class="done">Fatto: ${b.done}</span>` : ''}${b.over ? ' <span class="done done-redo">Superata</span>' : ''}</h2>
      <p class="quote">${b.quote}</p>
      <p>${tidy(b.context)}</p>
    </header>
    ${b.decided && b.answer ? `<p class="answer">La tua scelta: <b>${b.answer}</b></p>` : ''}
    ${b.rejected ? `<p class="answer">La tua risposta: <b>${b.rejected}</b></p>` : ''}
    ${b.redo ? `<p class="answer">La tua risposta: <b>${b.redo}</b></p>` : ''}
    ${b.over ? `<p class="answer">La tua risposta: <b>${b.over}</b></p>` : ''}
    ${b.common ? `<div class="dir-frames board-common">${b.common.join('')}</div>` : ''}
    ${b.dirs.map((d) => direction(b.id, d, b.chosen, Boolean(b.rejected || b.redo || b.over))).join('')}
  </section>`;
}



// ---------- briefing ----------

const briefDir = (key, title, note, style, rec = false) => ({
  key, title, rec, note,
  frames: [
    cap('Telefono (scorre)', phone({ state: { ...base(), phase: 'briefing' }, briefStyle: style, static: true })),
    cap('Laptop (ridotto a metà)', laptop({ state: { ...base(), phase: 'briefing' }, briefStyle: style, static: true })),
  ],
});
const BRIEF = {
  id: 'briefing', title: 'Briefing', decided: 'A + C, senza avvio da Mission Control', chosen: 'AC',
  answer: 'A+C · Una trasmissione (di A si prende il formato del messaggio al posto dei ">") le altre proposte bocciate, tipo la B, perché chiede a mission control di avviare la missione e il timer, ma che senso ha? il timer dovrebbe iniziare già da quando nova scrive a mission control',
  quote: '«it\'s just a wall of text, differenzia, dai una forma a mission control e nova» · «formatta i testi del briefing»',
  context: 'Le frasi sono quelle di oggi, parola per parola: cambiano la forma, i dati evidenziati in ambra (03:00, «One report is false», 2 questions, il codice, 10 minutes) e un volto per i due. NOVA ha un occhio in pixel ciano con «NOVA · STATION AI»; Mission Control, cioè i giocatori, una parabola in ambra con «MISSION CONTROL · NIGHT SHIFT», le parole già usate nella home. Le etichette nuove vengono dalle parole dell\'app: OXYGEN, QUESTIONS ed EMERGENCY CODE dalla barra in alto e dalla scheda del codice. Lo schema del codice mostra caselle vuote e non un esempio con un ID vero, perché un esempio con il 27 indicherebbe Doyun.',
  dirs: [
    briefDir('now', 'Oggi', '<p>Otto righe di registro, tutte uguali.</p>', 'now'),
    briefDir('A', 'A · Una trasmissione', `<p>NOVA parla a messaggi, uno per argomento, con i dati chiave in ambra. In fondo risponde Mission Control, a destra e in ambra, con <b>[ START MISSION ]</b>: il via lo dà chi gioca.</p>
      <p>Costo: restano sette blocchi di testo da leggere, solo meglio divisi.</p>`, 'tx'),
    briefDir('B', 'B · Un fascicolo', `<p>Un documento da NOVA a Mission Control: in testa mittente e destinatario, poi una riga per argomento con la sua etichetta (SITUATION_, SABOTEUR_, …) e, dove serve, un disegno: le due domande e il codice, lo schema del codice, l'ossigeno.</p>
      <p>Costo: è il più ordinato ma il più freddo; NOVA quasi non parla.</p>`, 'file'),
    {
      key: 'AC', title: 'A + C · Messaggi di NOVA e schede delle regole',
      note: `<p>Il racconto di NOVA nei messaggi di A, al posto delle righe con «>»; le regole nelle schede di C. Nessun avvio da Mission Control: NEW GAME apre l'indagine sulla scheda BRIEFING con l'ossigeno che già scende.</p>`,
      frames: [
        cap('Telefono, appena dopo NEW GAME', phone({ state: { ...base(), phase: 'play', tab: 'briefing' }, briefStyle: 'txmix', remainingMs: 9 * MIN + 51000 })),
        cap('Laptop (ridotto a metà)', laptop({ state: { ...base(), phase: 'play', tab: 'briefing' }, briefStyle: 'txmix', remainingMs: 9 * MIN + 51000 })),
      ],
    },
    briefDir('C', 'C · NOVA racconta, le regole diventano schede', `<p>NOVA racconta solo cosa è successo (quattro righe, scritte a macchina). Le regole diventano quattro schede con un disegno ciascuna: sensori, domande, codice, ossigeno. In fondo la striscia di Mission Control con <b>[ START MISSION ]</b>.</p>
      <p>Perché: separa la storia dalle regole, che sono le cose da ritrovare durante la partita (anche dalla scheda BRIEFING); e dà a ognuno dei due un posto preciso nella schermata.</p>`, 'mix', true),
  ],
};



// ---------- map detail ----------

// the app as it is now (decided pieces), with one map detail
const NOW = { reportStyle: 'sheet', askWhere: 'tap', briefStyle: 'txmix' };
const mapDir = (key, title, note, detail, rec = false) => ({
  key, title, rec, note,
  frames: [
    cap('Scheda MAP', phone({ ...NOW, mapDetail: detail, state: { ...base(), phase: 'play', tab: 'map', mapSel: 'M-K' }, remainingMs: 7 * MIN }, { cls: 'btns-b' })),
    cap('Ask NOVA', phone({ ...NOW, mapDetail: detail, state: { ...base(), phase: 'play', tab: 'ask', draft: { kind: 'hatch', what: 'M-K', a: 45, b: 60 } }, remainingMs: 7 * MIN }, { cls: 'btns-b', scroll: '120' })),
    cap('Laptop (ridotto a metà)', laptop({ ...NOW, mapDetail: detail, state: { ...base(), phase: 'play', tab: 'map' }, remainingMs: 7 * MIN }, { cls: 'btns-b' })),
  ],
});
const MAPD = {
  id: 'mapdetail', title: 'Mappa più dettagliata',
  rejected: '«per migliorare la mappa non intendevo questo, intendevo renderla meno schematica, sparo, magari un ologramma? è fattibile?»',
  quote: '«fai la mappa più dettagliata»',
  context: 'La disposizione dei moduli, i portelli e le zone da toccare restano dove sono, in tutte le direzioni: cambia ciò che si vede dentro e attorno. Gli oggetti dentro i moduli sono disegno e non si toccano. Le schermate sono quelle dell\'app di adesso (pulsanti con la cornice, rapporti come documento, domande dalla mappa).',
  dirs: [
    mapDir('now', 'Oggi', '<p>Moduli vuoti con il nome, portelli, sensori di movimento.</p>', {}),
    mapDir('A', 'A · Gli interni', `<p>Lo scafo della stazione attorno ai moduli e, in ogni modulo, pochi oggetti in pixel: la console e il vetro del Bridge, le pompe dell'Engine Room, il letto e la croce della Medbay, le casse della Cargo Bay, le bombole e il riciclatore rotto (in rosso) in Life Support, le luci a terra del Corridor.</p>
      <p>Perché: dà luoghi veri alla storia (i rapporti parlano di pompe, scanner, inventario) senza aggiungere scritte.</p>`, { interior: true }, true),
    mapDir('B', 'B · Portelli numerati', '<p>Ogni portello ha un numero e sotto la mappa c\'è la legenda con i nomi, gli stessi delle domande.</p><p>Costo: aggiunge informazioni più che dettaglio, e il nome del portello compare già toccandolo.</p>', { numbers: true }),
    mapDir('C', 'C · Interni e portelli numerati', '<p>A e B insieme.</p>', { interior: true, numbers: true }),
  ],
};

// ---------- hologram map ----------

const holoDir = (key, title, note, detail, rec = false) => ({
  key, title, rec, note,
  frames: [
    cap('Scheda MAP', phone({ ...NOW, mapDetail: detail, state: { ...base(), phase: 'play', tab: 'map', mapSel: 'M-K' }, remainingMs: 7 * MIN }, { cls: 'btns-b' })),
    cap('Ask NOVA', phone({ ...NOW, mapDetail: detail, state: { ...base(), phase: 'play', tab: 'ask', draft: { kind: 'hatch', what: 'M-K', a: 45, b: 60 } }, remainingMs: 7 * MIN }, { cls: 'btns-b', scroll: '120' })),
    cap('Laptop (ridotto a metà)', laptop({ ...NOW, mapDetail: detail, state: { ...base(), phase: 'play', tab: 'map' }, remainingMs: 7 * MIN }, { cls: 'btns-b' })),
  ],
});
const HOLO = {
  id: 'holo', title: 'Mappa a ologramma', decided: 'C, ologramma proiettato', chosen: 'C', answer: 'C · Ologramma proiettato',
  quote: '«per migliorare la mappa non intendevo questo, intendevo renderla meno schematica, sparo, magari un ologramma? è fattibile?»',
  context: 'Sì, è fattibile, e senza librerie: è la stessa mappa inclinata in 3D con il CSS, quindi portelli e moduli si toccano ancora, anche nelle domande a NOVA, e funziona offline. Le pareti sono copie dei contorni sollevate a strati. Un ologramma 3D vero (con una libreria come three.js, da girare con il dito) è fattibile anche lui, ma costa un giorno o più, pesa sul telefono e rende più difficile toccare i portelli: con la scadenza di due giorni non lo consiglio. Con «riduci movimento» attivo, niente tremolio né oscillazione.',
  dirs: [
    holoDir('now', 'Oggi', '<p>La mappa piatta.</p>', {}),
    holoDir('A', 'A · Ologramma inclinato', '<p>La mappa inclinata all\'indietro, ciano luminoso con un leggero alone, righe di scansione che scorrono e un tremolio raro.</p><p>Costo: inclinata, la mappa è più bassa e le scritte più schiacciate.</p>', { holo: 1 }),
    holoDir('B', 'B · Ologramma con le pareti', '<p>Come A, con le pareti dei moduli in rilievo: quattro contorni sovrapposti che salgono, come una proiezione in volume.</p><p>Perché: è quella che smette davvero di sembrare uno schema, e resta ferma, quindi i portelli si toccano bene.</p>', { holo: 2 }, true),
    holoDir('C', 'C · Ologramma proiettato', '<p>Come B, con il fascio di luce che sale da un proiettore sotto la mappa e un\'oscillazione lenta (si ferma quando ci passi sopra con il mouse).</p><p>Costo: la più scenografica, ma su un telefono si tocca una mappa che si muove.</p>', { holo: 3 }),
  ],
};

// ---------- home: grey texts ----------

const homeDir = (key, title, note, style, rec = false) => ({
  key, title, rec, note,
  frames: [
    cap('Con una partita salvata', phone({ homeStyle: style, state: { ...base(), phase: 'home' }, saved: { code: SAMPLE, phase: 'play', remainingMs: 7 * MIN + 42000 } }, { cls: 'btns-b' })),
    cap('Prima apertura', phone({ homeStyle: style, state: { ...base(), phase: 'home' } }, { cls: 'btns-b' })),
    cap('Laptop (ridotto a metà)', laptop({ homeStyle: style, state: { ...base(), phase: 'home' }, saved: { code: SAMPLE, phase: 'play', remainingMs: 7 * MIN + 42000 } }, { cls: 'btns-b' })),
  ],
});
const HOME = {
  id: 'home', title: 'Home: i testi in grigio', decided: 'B, lo stato in una finestra di NOVA', chosen: 'B', answer: 'B · Lo stato in una finestra di NOVA',
  quote: '«da migliorare, i testi in grigio soprattutto»',
  context: 'Ho misurato: il contrasto dei grigi sul fondo è già buono (circa 9 a 1). Il difetto è un altro: sono piccoli, sottili e tutti dello stesso grigio, quindi non dicono cosa conta. Le direzioni lavorano su gerarchia e colore; i testi restano quelli di oggi.',
  dirs: [
    homeDir('now', 'Oggi', '<p>Barra in alto e registro in grigio, 14px.</p>', 'now'),
    homeDir('A', 'A · Più luce', '<p>Stesse righe, ma bianche e a 16px, con il «>» in ciano. In alto «NOVA» in ciano e «UNSTABLE» in ambra.</p>', 'bright'),
    homeDir('B', 'B · Lo stato in una finestra di NOVA', '<p>Le righe del registro dentro una finestra «NOVA // STATUS», con l\'occhio di NOVA del briefing: si capisce chi parla.</p><p>Perché: è lo stesso volto che poi apre il briefing, quindi NOVA si presenta già dalla home.</p>', 'window', true),
    homeDir('C', 'C · Dati, come la barra in alto', '<p>Ogni riga diventa etichetta e valore (RECYCLER TEST_, CREW ABOARD_, CASE_, OXYGEN_), come la barra dell\'ossigeno durante la partita.</p>', 'data'),
  ],
};


// ---------- Mission Control console ----------

// the app as decided now, dressed as a console: cls = 'console bg-* fx-*'
const NOW2 = { ...NOW, mapDetail: { holo: 3 }, homeStyle: 'window' };
const consoleFrames = (cls) => [
  cap('Laptop, indagine (ridotto a metà)', laptop({ ...NOW2, state: { ...base(), phase: 'play', tab: 'ask', draft: { kind: 'hatch', what: 'M-K', a: 45, b: 60 }, log: [{ q: { kind: 'motion', what: 'K', a: 40, b: 55 }, ans: 'yes' }] }, remainingMs: 6 * MIN + 12000 }, { cls: `btns-b ${cls}` })),
  cap('Telefono, rapporti', phone({ ...NOW2, state: { ...base(), phase: 'play', tab: 'reports' }, remainingMs: 6 * MIN + 12000 }, { cls: `btns-b ${cls}` })),
  cap('Telefono, mappa', phone({ ...NOW2, state: { ...base(), phase: 'play', tab: 'map' }, remainingMs: 6 * MIN + 12000 }, { cls: `btns-b ${cls}` })),
  cap('Telefono, home', phone({ ...NOW2, state: { ...base(), phase: 'home' }, saved: { code: SAMPLE, phase: 'play', remainingMs: 6 * MIN + 12000 } }, { cls: `btns-b ${cls}` })),
];
const CONSOLE_BG = {
  id: 'console-bg', title: 'Console di Mission Control: lo sfondo', rejected: '«sul background mi hai solo cambiato le cornici delle finestrelle.. io per console intendo TUTTA LA WEBAPP da trattare come console della mission control. idem effetti video da rifare...»',
  quote: '«keep the visual references but make it more like a mission control console, how do we reach nova? how do we view the spaceship data etc. is the webapp the game, or nova, or the console...» · sullo sfondo: «fai prove nel mock»',
  context: `La mia proposta, da approvare: la webapp è la console di Mission Control, la scrivania di chi gioca, sulla Terra. NOVA è dall'altra parte del collegamento, sulla stazione: la si raggiunge solo dal canale COMMS, dove arriva il briefing e partono le domande. I dati della stazione non si vedono in diretta: arrivano solo come risposte di NOVA, due al massimo, perché il collegamento è danneggiato. Il resto è di Mission Control: il modello della stazione dal suo archivio (l'ologramma), i fascicoli dell'equipaggio (i profili), i rapporti che NOVA ha inoltrato, la telemetria (ossigeno e domande rimaste) e il canale d'emergenza per il codice. Per questo ogni finestra diventa un monitor con il suo canale inciso sopra: MON 1 // RELAYED BY NOVA (rapporti), MON 2 // STATION MODEL · ARCHIVE (mappa), MON 3 // COMMS · KEPLER-9 (briefing, domande e la home), MON 4 // EMERGENCY UPLINK (codice), TELEMETRY sulla barra in alto, MISSION CONTROL // CREW FILE sui profili. Sono testi nuovi, ricavati da questa idea: li tolgo o cambio se l'idea non ti torna. Qui cambia solo lo sfondo, con l'effetto video medio; l'effetto ha la tavola dopo.`,
  dirs: [
    { key: 'A', title: 'A · Cornice del monitor', rec: true, note: '<p>Ogni finestra è un monitor con una cornice spessa e le viti agli angoli; attorno, il piano scuro della console con le giunture dei pannelli.</p><p>Perché: dice subito che è una console, senza parole.</p>', frames: consoleFrames('console bg-bezel fx-medium') },
    { key: 'B', title: 'B · Solo vetro scuro', note: '<p>Nessun oggetto: lo sfondo è il vetro stesso, con la griglia di oggi e i bordi che si scuriscono come uno schermo grande.</p><p>Costo: la più vicina a oggi, la console si capisce solo dalle etichette dei monitor.</p>', frames: consoleFrames('console bg-glass fx-medium') },
    { key: 'C', title: 'C · Pannello della console', note: '<p>I monitor sono incassati in un pannello scuro con i rivetti, e accanto al nome di ogni canale c\'è una spia accesa.</p>', frames: consoleFrames('console bg-panel fx-medium') },
  ],
};
const CONSOLE_FX = {
  id: 'console-fx', title: 'Console di Mission Control: l\'effetto video', rejected: '«sul background mi hai solo cambiato le cornici delle finestrelle.. io per console intendo TUTTA LA WEBAPP da trattare come console della mission control. idem effetti video da rifare...»',
  quote: 'sull\'effetto video: «fai prove nel mock»',
  context: 'L\'effetto sta sul vetro di ogni monitor, non sulla pagina; sopra i rapporti è a metà, perché vanno letti. Le prove sono sulla cornice del monitor (A della tavola prima). Con «riduci movimento» attivo, niente rumore né disturbi in movimento: le immagini qui sono ferme per questo.',
  dirs: [
    { key: 'L', title: 'Leggero', note: '<p>Righe di scansione appena visibili e un leggero bagliore sui titoli e sul timer.</p>', frames: consoleFrames('console bg-bezel fx-light') },
    { key: 'M', title: 'Medio', rec: true, note: '<p>Righe di scansione, bordi del vetro curvi e scuriti, bagliore su titoli, timer e voce di NOVA.</p><p>Perché: si legge come un monitor vero, e il testo dei rapporti resta pulito.</p>', frames: consoleFrames('console bg-bezel fx-medium') },
    { key: 'S', title: 'Forte', note: '<p>Come il medio, più un rumore che vibra su ogni vetro e una banda di disturbo che scorre sul canale di NOVA: il collegamento danneggiato si vede.</p><p>Costo: si muove sempre qualcosa sullo schermo; il disturbo passa anche sopra il testo delle domande.</p>', frames: consoleFrames('console bg-bezel fx-strong') },
  ],
};


// ---------- the whole app as the console (second round) ----------

const NOW3 = { ...NOW2 };
const shellFrames = (shell, fx = ['crt']) => [
  cap('Laptop, indagine (ridotto)', laptop({ ...NOW3, shell, fx, state: { ...base(), phase: 'play', tab: 'ask', draft: { kind: 'hatch', what: 'M-K', a: 45, b: 60 }, log: [{ q: { kind: 'motion', what: 'K', a: 40, b: 55 }, ans: 'yes' }] }, remainingMs: 6 * MIN + 12000 }, { cls: 'btns-b', big: true })),
  cap('Laptop, home (ridotto)', laptop({ ...NOW3, shell, fx, state: { ...base(), phase: 'home' }, saved: { code: SAMPLE, phase: 'play', remainingMs: 6 * MIN + 12000 } }, { cls: 'btns-b', big: true })),
  cap('Telefono, rapporti', phone({ ...NOW3, shell, fx, state: { ...base(), phase: 'play', tab: 'reports' }, remainingMs: 6 * MIN + 12000 }, { cls: 'btns-b' })),
  cap('Telefono, domande', phone({ ...NOW3, shell, fx, state: { ...base(), phase: 'play', tab: 'ask', draft: { kind: 'hatch', what: 'M-K', a: 45, b: 60 } }, remainingMs: 6 * MIN + 12000 }, { cls: 'btns-b' })),
  cap('Telefono, ultimo minuto', phone({ ...NOW3, shell, fx, state: { ...base(), phase: 'play', tab: 'map' }, remainingMs: 42000 }, { cls: 'btns-b emergency alarm' })),
];
const CONSOLE2 = {
  id: 'console', title: 'Tutta la webapp è la console di Mission Control', decided: 'B, la console fisica', chosen: 'desk',
  answer: 'B · La console fisica · «combina la B con quello che abbiamo ora, altrimenti la console non funziona: sopratutto su mobile va migliorata l\'interfaccia affinché sia ordinata (vedi barra console con i tasti, è un casino su mobile), il countdown non rende abbastanza, non si capisce che è il timer dell\'ossigeno, cosa che fa molto meglio il timer attuale» · «al posto di quit metterei icona power on» · «non è realistico che sulla parte fisica della console mostri quante domande possiamo fare.» Le correzioni sono nella tavola «La console fisica, con l\'interfaccia di oggi».',
  quote: '«io per console intendo TUTTA LA WEBAPP da trattare come console della mission control» · sul telefono: «ma scusa ti ho detto che è LA console di mission control»',
  context: `In tutte e tre le direzioni lo schermo intero è la console, sul laptop e sul telefono (la stessa console, non un altro apparecchio). Il contenuto resta quello già deciso (rapporti come documento, ologramma, domande dalla mappa, briefing); cambia ciò che lo contiene. Le parti hanno i nomi della proposta di prima: COMMS è il canale con NOVA, STATION MODEL l'ologramma dall'archivio, REPORTS i rapporti inoltrati da NOVA, EMERGENCY UPLINK il codice, e in alto MC-OS, il sistema della console (nome nuovo, da approvare). Tutte con il vetro CRT acceso; gli altri effetti hanno la loro tavola sotto.`,
  dirs: [
    { key: 'monitor', title: 'A · Lo schermo è il monitor', note: '<p>La finestra del browser è un unico grande monitor CRT della console: vetro curvo, cornice di plastica solo ai bordi, e sotto la cornice le spie PWR, LINK (ambra, il collegamento è danneggiato) e ALARM (rossa nell\'ultimo minuto). Dentro gira il software della console, con la sua riga di sistema in alto.</p><p>Perché: è la console senza cambiare il modo di giocare; sul telefono è lo stesso monitor.</p>', frames: shellFrames('monitor') },
    { key: 'desk', title: 'B · La console fisica', rec: true, note: '<p>Sullo schermo c\'è la console stessa: sul laptop tre monitor (rapporti, modello della stazione, COMMS) e sotto un pannello di tasti veri, il display dell\'ossigeno, le spie delle domande, il tasto rosso CODE sotto una protezione a strisce. Sul telefono un monitor solo, e i tasti del pannello cambiano canale.</p><p>Perché: è quella in cui si sente di più di essere seduti a Mission Control, e i tasti fisici sostituiscono le schede.</p>', frames: shellFrames('desk') },
    { key: 'dash', title: 'C · Il software della console a schermo pieno', note: '<p>Nessun oggetto fisico: sul laptop il software della console occupa tutto lo schermo, con tutti i pannelli visibili insieme (telemetria, rapporti, modello, COMMS, codice), senza schede e senza scorrere la pagina. Sul telefono resta il monitor con le schede.</p><p>Costo: sul laptop è densa, e ogni pannello è più piccolo.</p>', frames: shellFrames('dash') },
  ],
};

const fxFrames = (fx, freeze, replay) => [
  cap('Laptop, indagine (dal vivo)', `${laptop({ ...NOW3, shell: 'desk', fx: ['crt', fx], state: { ...base(), phase: 'play', tab: 'ask', log: [{ q: { kind: 'motion', what: 'K', a: 40, b: 55 }, ans: 'yes' }] }, remainingMs: 6 * MIN + 12000 }, { cls: 'btns-b', big: true })}${replay ? `<button type="button" class="replay" data-replay="${replay}">Riguarda</button>` : ''}`),
  cap('Telefono, il momento fermo', phone({ ...NOW3, shell: 'desk', fx: ['crt', fx], fxFreeze: freeze, state: { ...base(), phase: fx === 'link' ? 'play' : 'play', tab: fx === 'link' ? 'briefing' : 'ask', log: [{ q: { kind: 'motion', what: 'K', a: 40, b: 55 }, ans: 'yes' }] }, remainingMs: 6 * MIN + 12000 }, { cls: 'btns-b' })),
];
const CONSOLE2_FX = {
  id: 'console-fx2', title: 'Effetti video su tutto lo schermo', decided: 'il vetro CRT, sempre', chosen: ['crt'],
  answer: 'Il vetro CRT, sempre · «l\'effetto video su tutto il viewport»',
  quote: 'sugli effetti video: «mock»',
  context: 'Gli effetti stanno su tutto lo schermo della console, non sulle finestre. Si possono scegliere più di uno (le caselle). Le prove sono sulla console fisica (B della tavola sopra) ma valgono per tutte e tre. Il laptop si muove dal vivo («Riguarda» rifà l\'accensione o il cambio di canale); il telefono mostra il momento fermo. Con «riduci movimento» attivo nel sistema, accensione, scariche e disturbi non si muovono.',
  dirs: [
    { key: 'crt', multi: true, rec: true, title: 'Il vetro CRT, sempre', note: '<p>Righe di scansione, angoli scuriti e un leggero bagliore su tutto lo schermo, sempre accesi.</p>', frames: [cap('Laptop', laptop({ ...NOW3, shell: 'desk', fx: ['crt'], state: { ...base(), phase: 'play', tab: 'ask' }, remainingMs: 6 * MIN }, { cls: 'btns-b', big: true })), cap('Telefono', phone({ ...NOW3, shell: 'desk', fx: ['crt'], state: { ...base(), phase: 'play', tab: 'reports' }, remainingMs: 6 * MIN }, { cls: 'btns-b' }))] },
    { key: 'boot', multi: true, rec: true, title: 'L\'accensione', note: '<p>Quando si apre la pagina la console si accende: una riga di luce al centro che si apre su tutto lo schermo.</p>', frames: fxFrames('boot', 'boot', 'boot') },
    { key: 'static', multi: true, title: 'La scarica al cambio di canale', note: '<p>Ogni volta che si cambia canale (un tasto della console) passa una scarica di statico per un terzo di secondo.</p><p>Costo: si cambia canale spesso, sul telefono a ogni tasto.</p>', frames: fxFrames('static', 'static', 'static') },
    { key: 'link', multi: true, rec: true, title: 'Il collegamento danneggiato di NOVA', note: '<p>I messaggi e le risposte di NOVA ogni tanto si disturbano: uno scatto di lato, i colori separati per un attimo. Solo NOVA, il resto della console è stabile.</p><p>Perché: racconta il guasto del collegamento senza parole, e non tocca i rapporti da leggere.</p>', frames: fxFrames('link', 'link', null) },
  ],
};

// ---------- the physical console with today's interface (third round) ----------

const desk2 = (deskPower, extra = {}) => ({ ...NOW3, shell: 'desk2', fx: ['crt'], deskPower, remainingMs: 6 * MIN + 12000, ...extra });
const d2state = (s) => ({ ...base(), phase: 'play', ...s });
const askDraft = { kind: 'hatch', what: 'M-K', a: 45, b: 60 };
const askLog = [{ q: { kind: 'motion', what: 'K', a: 40, b: 55 }, ans: 'yes' }];
const desk2Frames = (p, all) => [
  cap('Telefono, rapporti', phone(desk2(p, { state: d2state({ tab: 'reports' }) }), { cls: 'btns-b' })),
  cap('Telefono, domande', phone(desk2(p, { state: d2state({ tab: 'ask', draft: askDraft }) }), { cls: 'btns-b' })),
  ...(all ? [cap('Telefono, briefing', phone(desk2(p, { state: d2state({ tab: 'briefing' }) }), { cls: 'btns-b' }))] : []),
  ...(all ? [cap('Telefono, codice', phone(desk2(p, { state: d2state({ tab: 'code', codeInput: '12' }) }), { cls: 'btns-b' }))] : []),
  cap('Telefono, ultimo minuto', phone(desk2(p, { state: d2state({ tab: 'map' }), remainingMs: 42000 }), { cls: 'btns-b emergency alarm' })),
  ...(all ? [cap('Telefono, conferma dopo il tasto di accensione', phone(desk2(p, { state: d2state({ tab: 'reports' }), quitOpen: true }), { cls: 'btns-b' }))] : []),
  cap('Telefono, home', phone(desk2(p, { state: { ...base(), phase: 'home' }, saved: { code: SAMPLE, phase: 'play', remainingMs: 6 * MIN + 12000 } }), { cls: 'btns-b' })),
  cap('Laptop, indagine (ridotto)', laptop(desk2(p, { state: d2state({ tab: 'ask', draft: askDraft, log: askLog }) }), { cls: 'btns-b', big: true })),
  ...(all ? [cap('Laptop, home (ridotto)', laptop(desk2(p, { state: { ...base(), phase: 'home' }, saved: { code: SAMPLE, phase: 'play', remainingMs: 6 * MIN + 12000 } }), { cls: 'btns-b', big: true }))] : []),
];
const CONSOLE3 = {
  id: 'console3', title: 'La console fisica, con l\'interfaccia di oggi',
  redo: '«l\'effetto video non va sulla parte fisica della console» · «Console A un po\' triste. Ha pochi elementi es. sulla barra fisica della console. non dico che debba avere molte funzioni ma boh» · «non ha senso che i riquadri stiano in monitor, sembra più schede, che finestre, l\'effetto che voglio è un po\' retro futuristico, sci-fi, magari non retro non lo so hahaha» · «"Send code (one attempt)" > non scrivere il "one attempt" nel pulsante, lo si specifica fuori» (questo è già nel gioco: il pulsante è SEND CODE, e accanto «One attempt.»)',
  quote: '«combina la B con quello che abbiamo ora, altrimenti la console non funziona: sopratutto su mobile va migliorata l\'interfaccia affinché sia ordinata (vedi barra console con i tasti, è un casino su mobile), il countdown non rende abbastanza, non si capisce che è il timer dell\'ossigeno, cosa che fa molto meglio il timer attuale» · «al posto di quit metterei icona power on» · «non è realistico che sulla parte fisica della console mostri quante domande possiamo fare.» · «l\'effetto video su tutto il viewport»',
  context: `In tutte e due le direzioni. La barra di oggi torna com'è (OXYGEN con il timer e la barra a tacche, QUESTIONS, CASE) ed è il display della telemetria in cima alla console: le domande rimaste stanno su uno schermo, non più sulle spie. I tasti hanno i nomi delle schede di oggi (REPORTS, MAP, ASK NOVA, BRIEFING, CODE) al posto di MODEL e COMMS, ognuno con una spia che si accende quando il canale è aperto; CODE resta rosso, a parte, sotto la protezione a strisce. Al posto di QUIT c'è il tasto di accensione, che apre la stessa conferma di oggi. Il vetro CRT copre tutto lo schermo, tasti compresi. Sul telefono il monitor ha la cornice sottile e nessuna etichetta sopra: il canale lo dice il tasto acceso. Sul laptop restano i tre monitor della B con le loro etichette e le spie PWR, LINK, ALARM. Senza una partita aperta (home, finale) la console è la stessa: il display aspetta i dati, i tasti sono spenti. Le due direzioni cambiano solo dove sta il tasto di accensione, e quindi quante righe di tasti ha il telefono.`,
  dirs: [
    {
      key: 'top', title: 'A · Accensione in alto, i tasti in una riga', rec: true,
      note: `<p>Il tasto di accensione sta accanto al display, in alto a destra, dove oggi c'è QUIT. In basso, sul telefono, una riga sola di cinque tasti uguali.</p>
        <p>Perché: è la più ordinata e lascia più spazio al monitor, e il tasto che chiude la partita sta lontano da quelli che si premono di continuo. Costo: sul telefono la barra a tacche dell'ossigeno è più corta di oggi, per fare posto al tasto.</p>`,
      frames: desk2Frames('top', true),
    },
    {
      key: 'panel', title: 'B · Tutto sul pannello dei tasti',
      note: `<p>Il tasto di accensione sta sul pannello in basso con gli altri. Sul telefono i tasti diventano due righe da tre, più grandi, e il display in alto è largo quanto lo schermo, come la barra di oggi.</p>
        <p>Costo: il pannello è alto il doppio e toglie spazio al monitor; l'accensione sta accanto a CODE.</p>`,
      frames: desk2Frames('panel', false),
    },
  ],
};

// ---------- one screen with windows, and the physical bar (fourth round) ----------

const deck = (style, extra = {}) => ({ ...NOW3, shell: 'deck', fx: ['crt'], deck: style, remainingMs: 6 * MIN + 12000, ...extra });
const deckFrames = (s, all) => [
  cap('Telefono, rapporti', phone(deck(s, { state: d2state({ tab: 'reports' }) }), { cls: 'btns-b' })),
  cap('Telefono, domande', phone(deck(s, { state: d2state({ tab: 'ask', draft: askDraft }) }), { cls: 'btns-b' })),
  ...(all ? [cap('Telefono, codice', phone(deck(s, { state: d2state({ tab: 'code', codeInput: '127' }) }), { cls: 'btns-b' }))] : []),
  cap('Telefono, ultimo minuto', phone(deck(s, { state: d2state({ tab: 'map' }), remainingMs: 42000 }), { cls: 'btns-b emergency alarm' })),
  ...(all ? [cap('Telefono, profilo aperto', phone(deck(s, { state: d2state({ tab: 'reports', profile: 'mira' }) }), { cls: 'btns-b' }))] : []),
  cap('Telefono, home', phone(deck(s, { state: { ...base(), phase: 'home' }, saved: { code: SAMPLE, phase: 'play', remainingMs: 6 * MIN + 12000 } }), { cls: 'btns-b' })),
  cap('Laptop, indagine (ridotto)', laptop(deck(s, { state: d2state({ tab: 'ask', draft: askDraft, log: askLog }) }), { cls: 'btns-b', big: true })),
  ...(all ? [cap('Laptop, home (ridotto)', laptop(deck(s, { state: { ...base(), phase: 'home' }, saved: { code: SAMPLE, phase: 'play', remainingMs: 6 * MIN + 12000 } }), { cls: 'btns-b', big: true }))] : []),
];
const CONSOLE4 = {
  id: 'console4', title: 'Uno schermo con le finestre, e la barra fisica', decided: 'A, retro-futuristica, tasti scuri', chosen: 'retro', answer: 'A · Retro-futuristica, tasti scuri',
  quote: '«non ha senso che i riquadri stiano in monitor, sembra più schede, che finestre, l\'effetto che voglio è un po\' retro futuristico, sci-fi, magari non retro non lo so hahaha» · «l\'effetto video non va sulla parte fisica della console» · «Console A un po\' triste. Ha pochi elementi es. sulla barra fisica della console. non dico che debba avere molte funzioni ma boh»',
  context: `In tutte e tre le direzioni. Niente più monitor attorno ai riquadri: lo schermo è uno solo e mostra le schermate di oggi così come sono, con le finestre sulla griglia e la barra dell'ossigeno in cima (sul laptop le due colonne di oggi, i rapporti a sinistra). Il vetro CRT sta solo sullo schermo; la cornice rossa dell'ultimo minuto pure, e sulla barra fisica si accende la spia ALARM. La barra fisica ha più cose, e nessuna finge di essere un comando: i tasti con i nomi delle schede di oggi e la loro spia, CODE rosso sotto la protezione, il tasto di accensione al posto di QUIT, le spie PWR e ALARM, lo strumento LINK (basso e instabile: il collegamento è danneggiato, per questo le domande sono 2) e l'altoparlante del canale voce. Sul laptop c'è anche la targhetta MISSION CONTROL · NIGHT SHIFT. Le tre direzioni rispondono al tuo dubbio fra retro-futuristico e sci-fi non retro: cambiano la forma dello schermo e la barra, non le finestre, che hanno la loro tavola qui sotto.`,
  dirs: [
    {
      key: 'retro', title: 'A · Retro-futuristica, tasti scuri',
      note: `<p>Lo schermo è un tubo con gli angoli tondi dentro la sua cornice. La barra è di metallo con le viti, i tasti sono quelli grossi e scuri della console fisica che avevi scelto, l'altoparlante è una griglia a fessure e LINK è uno strumento a lancetta che trema nella zona rossa.</p>`,
      frames: deckFrames('retro', false),
    },
    {
      key: 'color', title: 'B · Retro-futuristica, tasti colorati', rec: true,
      note: `<p>Come A, con i tasti chiari come sulle console degli anni Settanta: ASK NOVA è ambra, lo stesso ambra dei segni QUESTIONS in alto, CODE è rosso, gli altri bianchi. Il tasto acceso resta premuto, con la spia e un alone.</p>
        <p>Perché: è la meno triste delle tre, e i colori dicono già cosa fanno i tasti. Costo: è la più lontana dalle carte del gruppo, che sono tutte ciano su nero.</p>`,
      frames: deckFrames('color', true),
    },
    {
      key: 'scifi', title: 'C · Sci-fi, non retro',
      note: `<p>Niente cornice: lo schermo arriva ai bordi, con quattro staffe luminose agli angoli. La barra è una lastra scura con una linea di luce in cima; i tasti sono piatti e retroilluminati (quello acceso è pieno di ciano, come la scheda attiva di oggi), LINK è a barrette, l'altoparlante è una fila di fori.</p>
        <p>Perché: è la più vicina alle carte del gruppo. Costo: è la meno «console fisica»; i tasti somigliano di nuovo a schede.</p>`,
      frames: deckFrames('scifi', false),
    },
  ],
};

// ---------- the crew portraits as true pixels (done, to check) ----------

const FACES = [['hana', 'Hana'], ['doyun', 'Doyun'], ['mira', 'Mira'], ['echo', 'ECHO-7']];
const zoom = (src, pixel) => `<span class="pz"><img src="${src}" alt="" ${pixel ? 'class="is-pixel"' : ''}></span>`;
const PORTRAITS = {
  id: 'portraits', title: 'I ritratti dell\'equipaggio', done: 'pixel veri, bordi rifilati',
  quote: '«usa i ritratti dei personaggi» · «controlla i ritratti, che non abbiamo linee nere ai bordi per ritagli fatti male, verifica se sono true pixel, non so se conosci come Xmas in the Hell sistema le sprite»',
  context: `Sono nel gioco al posto dei segnaposto: nel profilo e nella firma dei rapporti. Li ho abbinati ai nomi dalle carte (Hana con lo chignon, Doyun con gli occhiali, Mira con la croce rossa, ECHO-7 il robot). Ho misurato: le righe scure ai bordi c'erano in tutti e quattro (a destra e in alto e in basso per Hana, in basso per Doyun, in alto e in basso per Mira, ai due lati per ECHO-7), larghe 1 o 2 pixel. E non erano pixel veri: i quadretti sono sfumati e di misure diverse, nessuna griglia regolare. Li ho rifatti con il metodo di Xmas in the Hell: griglia, mediana di ogni cella, una palette sola per i quattro con gli accenti (la croce rossa, gli occhi ciano, l'elastico dorato). Ora ogni ritratto è 76 × 95 celle esatte, 54 colori in tutto, senza righe ai bordi. Qui sotto, per ognuno: l'originale, quello a pixel veri, e i due visi ingranditi.`,
  common: [
    ...FACES.map(([n, label]) => cap(`${label}: originale, pixel veri, e i visi ingranditi`, `<div class="pcompare"><img src="reference/portraits/${n}.jpg" alt=""><img class="is-pixel" src="img/crew/${n}.png" alt="">${zoom(`reference/portraits/${n}.jpg`, false)}${zoom(`img/crew/${n}.png`, true)}</div>`)),
    cap('Nel gioco: il profilo', phone({ ...NOW2, state: { ...base(), phase: 'play', tab: 'reports', profile: 'hana' }, remainingMs: 6 * MIN + 12000 }, { cls: 'btns-b' })),
    cap('Nel gioco: le firme dei rapporti', phone({ ...NOW2, state: { ...base(), phase: 'play', tab: 'reports' }, remainingMs: 6 * MIN + 12000 }, { cls: 'btns-b', scroll: '170' })),
  ],
  dirs: [],
};

// ---------- the reports after the crew cards ----------

const rep2Dir = (key, title, note, style, rec = false) => ({
  key, title, rec, note,
  frames: [
    cap('Telefono', phone(deck('retro', { state: d2state({ tab: 'reports' }), reportStyle: style }), { cls: 'btns-b' })),
    cap('Telefono, più sotto', phone(deck('retro', { state: d2state({ tab: 'reports' }), reportStyle: style }), { cls: 'btns-b', scroll: '330' })),
    cap('Laptop: la colonna dei rapporti', column(reportsPanel(c, style))),
  ],
});
const REPORTS2 = {
  id: 'reports2', title: 'I rapporti come le carte dell\'equipaggio', decided: 'C, prima la carta, poi il testo', chosen: 'crewtop', answer: 'C · Prima la carta, poi il testo',
  quote: '«lo stile dei report forse va allineato a come sono le carte dei membri?»',
  context: `Sì, la tua idea regge, soprattutto ora che i ritratti sono gli stessi delle carte: chi ha in mano la carta di Mira riconosce il suo rapporto a colpo d'occhio. E c'è un motivo in più, misurato su queste prove: i fogli chiari di oggi sono il punto in cui le righe del vetro CRT si vedono di più. Ti porto tre modi di svilupparla. In tutti il nome è quello breve delle carte (MIRA, non MIRA COSTA; il nome intero resta nel profilo), con ruolo e ID nel riquadro come sulla carta, e la riga «PERSONNEL FILE» della carta è il punto da toccare per il profilo. Il testo dei rapporti non cambia.`,
  dirs: [
    rep2Dir('now', 'Oggi', '<p>Il rapporto come documento chiaro, con la firma in fondo: la tua scelta del 23 novembre.</p>', 'sheet'),
    rep2Dir('crew', 'A · La carta con il rapporto dentro', `<p>Ogni rapporto è una carta dell'equipaggio: fondo scuro, linea ciano con gli angoli tagliati, «REPORT 01» in testa come «KEPLER-9» sulle carte. Prima il testo, poi chi l'ha scritto, disegnato come sulla carta.</p>
      <p>Perché: è la tua idea tenendo l'ordine che avevi scelto, prima cosa dice e poi chi lo dice. Costo: si perde il foglio chiaro; il testo è chiaro su scuro come tutto il resto, quindi i rapporti spiccano meno.</p>`, 'crew', true),
    rep2Dir('crewsign', 'B · Il foglio di oggi, firmato con la carta', `<p>Il testo resta sul foglio chiaro; solo la firma in fondo diventa una piccola carta dell'equipaggio.</p>
      <p>Costo: è la più vicina a oggi, le righe del vetro restano sui fogli, e la carta scura dentro il foglio chiaro fa due stili nello stesso rapporto.</p>`, 'crewsign'),
    rep2Dir('crewtop', 'C · Prima la carta, poi il testo', `<p>Come A, ma la persona sta in testa, come sulla carta stampata, e il testo sotto.</p>
      <p>Da sapere: riapre la tua scelta del 23 novembre («sembra concentrarsi di più sui dati, che sul report in sé»): qui i dati tornano prima del testo. Lo propongo una volta sola, per il dato nuovo delle carte stampate sul tavolo.</p>`, 'crewtop'),
  ],
};

// ---------- the time window of a question ----------

const timeDir = (key, title, note, ui, rec = false) => ({
  key, title, rec, note,
  frames: [
    cap('Telefono, Ask NOVA', phone(deck('retro', { state: d2state({ tab: 'ask', draft: askDraft }), timeUi: ui }), { cls: 'btns-b', scroll: '250' })),
    cap('Laptop: la finestra Ask NOVA', column(askPanel({ ...base(), draft: { kind: 'motion', what: 'M', a: 20, b: 45 } }, c, 'tap', { holo: 3 }, null, ui))),
  ],
});
const TIMEUI = {
  id: 'timeui', title: 'Il selettore dell\'orario', decided: 'A, la linea del tempo', chosen: 'track',
  answer: 'A · La linea del tempo · «ma se io nel selettore seleziono dalle 2 alle 3, non è sempre meglio di fare un range piccolo? sennò serve un design che invita a selezionare un range, es. uno slider che ha già la durata impostata e non modificabile, e tu trascini solo.» (continua nella tavola «La finestra di tempo»)',
  quote: '«il selettore del range è molto piatto rispetto alla grafica del resto»',
  context: `Sono le due tendine del browser, l'unico pezzo dell'interfaccia non disegnato da noi. La finestra di tempo va da 02:00 a 03:00 a passi di 5 minuti: 13 orari. In tutte le direzioni la domanda sotto si aggiorna come oggi, e le etichette restano From e To.`,
  dirs: [
    timeDir('now', 'Oggi', '<p>Due tendine.</p>', 'select'),
    timeDir('track', 'A · La linea del tempo', `<p>Tutta l'ora su una linea, con una tacca ogni 5 minuti; la finestra scelta è accesa fra i due cursori e si legge sopra, in grande. Si tocca un orario e il cursore più vicino ci va.</p>
      <p>Perché: si vede quanto è larga la finestra, che è la cosa su cui si ragiona, e si sceglie toccando, come il luogo sulla mappa qui sopra. Costo: sul telefono le tacche sono larghe da 18 a 24 pixel (misurate da 320 a 390 di schermo), meno dei 44 di un pulsante; per questo si tocca «vicino» e non serve centrare la tacca.</p>`, 'track', true),
    timeDir('step', 'B · Due display con − e +', `<p>Inizio e fine sono due display con le cifre grandi del timer, ognuno con un tasto − e un tasto +, 5 minuti a tocco.</p>
      <p>Costo: per una finestra lontana servono molti tocchi (da 02:00 a 02:45 sono nove).</p>`, 'step'),
    timeDir('box', 'C · Le tendine di oggi, ridisegnate', `<p>Lo stesso comando, disegnato come due display: cornice ciano con l'angolo tagliato, cifre grandi, la freccia nostra.</p>
      <p>Costo: l'elenco che si apre resta quello del telefono o del browser, non lo possiamo disegnare.</p>`, 'box'),
  ],
};

// ---------- windows after the group's game cards ----------

const winFrames = (cls) => [
  cap('Telefono, rapporti', phone(deck('retro', { state: d2state({ tab: 'reports' }) }), { cls: `btns-b ${cls}` })),
  cap('Telefono, domande', phone(deck('retro', { state: d2state({ tab: 'ask', draft: askDraft }) }), { cls: `btns-b ${cls}` })),
  cap('Telefono, briefing', phone(deck('retro', { state: d2state({ tab: 'briefing' }) }), { cls: `btns-b ${cls}` })),
  cap('Telefono, home', phone(deck('retro', { state: { ...base(), phase: 'home' }, saved: { code: SAMPLE, phase: 'play', remainingMs: 6 * MIN + 12000 } }), { cls: `btns-b ${cls}` })),
  cap('Laptop, indagine (ridotto)', laptop(deck('retro', { state: d2state({ tab: 'code', codeInput: '127' }) }), { cls: `btns-b ${cls}`, big: true })),
];
const WINDOWS = {
  id: 'windows', title: 'Le finestre come le carte del gruppo', decided: 'B, il titolo nella linguetta', chosen: 'B',
  answer: 'B · Il titolo nella linguetta · «delle finestre con linguetta, non mi piace la linea sotto il titolo, vedi se riesci a decorare le finestre più simili a come sono le carte» (continua nella tavola «Le finestre con la linguetta, decorate come le carte»)',
  quote: '«possiamo ispirarci per le finestre? deve esserci coerenza tra il materiale del gruppo»',
  context: `Sì. Dalle carte di Shravani ho preso ciò che fa da cornice: la linea ciano con gli angoli tagliati, il titolo in ciano senza barra piena (al posto dei tre quadratini da finestra di computer), il fondo quasi nero con la griglia fine, la linguetta dei riquadri «YOUR OBJECTIVE» e «MISSION PROTOCOL», le strisce in fondo. Dentro le finestre non cambia niente: rapporti, mappa, domande e codice restano quelli decisi. Le prove sono sullo schermo della tavola sopra (direzione A): senza i monitor attorno, le finestre stanno sulla griglia come oggi. Ho misurato anche il ciano: sulle carte è #3AD4F1, più azzurro; nell'app è #43D9D2, più verde. È l'ultima casella, e si può aggiungere a qualsiasi direzione.`,
  dirs: [
    { key: 'now', title: 'Oggi', note: '<p>Le finestre di oggi dentro la console, per confronto.</p>', frames: winFrames('').slice(0, 2) },
    {
      key: 'A', title: 'A · La cornice delle carte',
      note: `<p>La finestra tiene la sua forma. Cambiano la cornice (linea ciano, quattro angoli tagliati) e l'intestazione: il titolo in ciano, poi una linea e un punto, come «KEPLER-9 ● ONLINE» sulle carte dell'equipaggio.</p>
        <p>Costo: è la più vicina a oggi, la carta si riconosce soprattutto dagli angoli.</p>`,
      frames: winFrames('wins-a'),
    },
    {
      key: 'B', title: 'B · Il titolo nella linguetta', rec: true,
      note: `<p>Il titolo sta in una linguetta rialzata, sottolineato, e la cornice scende di un gradino accanto: è il riquadro «YOUR OBJECTIVE» della carta della missione.</p>
        <p>Perché: la linguetta è il segno più riconoscibile delle carte, e la finestra è più bassa di oggi, perché il titolo non ha più una barra sua.</p>`,
      frames: winFrames('wins-b'),
    },
    {
      key: 'C', title: 'C · La carta intera',
      note: `<p>Ogni finestra è una carta: doppia cornice, intestazione come in A, e in fondo le strisce con «KEPLER-9 OPERATIONS», il testo della carta della missione.</p>
        <p>Costo: la doppia cornice toglie 7 pixel per lato e ogni finestra ha una riga in più in fondo; sul telefono si sente.</p>`,
      frames: winFrames('wins-c'),
    },
    {
      key: 'cyan', multi: true, title: 'Il ciano delle carte',
      note: '<p>#3AD4F1 al posto di #43D9D2 in tutta l\'app: titoli, timer, tasti, mappa, pulsanti. Qui sulla direzione B.</p>',
      frames: winFrames('wins-b cyan-cards').slice(0, 2).concat(winFrames('wins-b cyan-cards').slice(4)),
    },
  ],
};

// ---------- everything chosen so far, together ----------

// console A (retro, dark keys), reports C (the card first), the time line; windows: the tab, in the versions below
const chosen = (extra = {}) => deck('retro', { reportStyle: 'crewwin', reportsBare: true, timeUi: 'cells10', mapDetail: { holo: 4, info: 'fields' }, deckBar: 'leds', ledStyle: 'b', askUi: 'thread', ...extra });
const askDraft10 = { kind: 'hatch', what: 'M-K', a: 50, b: 60 };
const BASE = 'btns-b btns-d wins-b1';
const win2Frames = (cls, all, extra = {}) => [
  cap('Telefono, rapporti', phone(chosen({ state: d2state({ tab: 'reports' }), ...extra }), { cls: `btns-b ${cls}` })),
  cap('Telefono, rapporti più sotto', phone(chosen({ state: d2state({ tab: 'reports' }), ...extra }), { cls: `btns-b ${cls}`, scroll: '400' })),
  ...(all ? [
    cap('Telefono, domande', phone(chosen({ state: d2state({ tab: 'ask', draft: askDraft10 }) }), { cls: `btns-b ${cls}`, scroll: '200' })),
    cap('Telefono, briefing', phone(chosen({ state: d2state({ tab: 'briefing' }) }), { cls: `btns-b ${cls}` })),
    cap('Telefono, codice', phone(chosen({ state: d2state({ tab: 'code', codeInput: '127' }) }), { cls: `btns-b ${cls}` })),
    cap('Telefono, home', phone(chosen({ state: { ...base(), phase: 'home' }, saved: { code: SAMPLE, phase: 'play', remainingMs: 6 * MIN + 12000 } }), { cls: `btns-b ${cls}` })),
  ] : []),
  cap('Laptop, indagine (ridotto)', laptop(chosen({ state: d2state({ tab: 'ask', draft: askDraft10, log: askLog }), ...extra }), { cls: `btns-b ${cls}`, big: true })),
];
const WINDOWS2 = {
  id: 'windows2', title: 'Le finestre con la linguetta, decorate come le carte', over: '«superato»',
  quote: '«delle finestre con linguetta, non mi piace la linea sotto il titolo, vedi se riesci a decorare le finestre più simili a come sono le carte» · «le schede report, come appaiono? perché le finestre che hai messo non ci sono più no?»',
  context: `Qui c'è tutto il già scelto insieme: la console A, i rapporti con la carta in testa (C), l'ologramma con le pareti di luce, la finestra di tempo da 10 minuti (con il comando che consiglio nella sua tavola, finché non scegli), e le finestre con la linguetta. Quindi si vede anche come stanno le schede dei rapporti dentro le finestre nuove: le finestre di prima non ci sono più. In tutte le direzioni la linea sotto il titolo è tolta. Per le decorazioni ho guardato le due carte che mi hai mandato: quella di Hana e quella della missione. Per i rapporti dentro la finestra, che fanno due cornici una nell'altra, c'è la tavola subito sotto.`,
  dirs: [
    {
      key: 'b1', title: 'A · La linguetta, senza la linea',
      note: '<p>La finestra che avevi scelto, con il titolo nella linguetta e nient\'altro.</p>',
      frames: win2Frames('wins-b1', false),
    },
    {
      key: 'b2', title: 'B · Come la carta dell\'equipaggio', rec: true,
      note: `<p>Dalla carta di Hana: la doppia cornice (una linea sottile fuori, quella piena dentro), il gradino in alto a sinistra ripetuto al contrario in basso a destra, le due linee corte dentro la cornice, il punto di «ONLINE» a destra, le crocette.</p>
        <p>Perché: i rapporti sono già carte dell'equipaggio, e così finestra e carta parlano la stessa lingua. Costo: la doppia cornice toglie 6 pixel per lato.</p>`,
      frames: win2Frames('wins-b2', true),
    },
    {
      key: 'b3', title: 'C · Come la carta della missione',
      note: `<p>La stessa doppia cornice con i gradini, e i segni della carta della missione: la scacchiera di «MISSION PROTOCOL» a destra del titolo, le strisce sotto l'angolo in basso a sinistra, la stella in basso a destra.</p>
        <p>Costo: è la più carica; le strisce stanno sotto ogni finestra.</p>`,
      frames: win2Frames('wins-b3', false),
    },
  ],
};

// ---------- the reports: no frame inside a frame ----------

const rep3Frames = (extra) => [
  cap('Telefono, rapporti', phone(chosen({ state: d2state({ tab: 'reports' }), ...extra }), { cls: 'btns-b wins-b2' })),
  cap('Telefono, rapporti più sotto', phone(chosen({ state: d2state({ tab: 'reports' }), ...extra }), { cls: 'btns-b wins-b2', scroll: '400' })),
  cap('Laptop, indagine (ridotto)', laptop(chosen({ state: d2state({ tab: 'ask', draft: askDraft10, log: askLog }), ...extra }), { cls: 'btns-b wins-b2', big: true })),
];
const REPORTS3 = {
  id: 'reports3', title: 'I rapporti: niente cornici annidate', decided: 'B, le carte senza finestra attorno', chosen: 'bare', answer: 'B · Le carte senza finestra attorno',
  quote: '«un po\' strana questa cosa annidata»',
  context: `Leggo così: la carta del rapporto dentro la finestra CREW REPORTS fa due cornici una nell'altra, ed è quello che stona. Due modi di toglierne una. Le prove sono con le finestre «come la carta dell'equipaggio» della tavola sopra, ma valgono con qualsiasi finestra tu scelga. In tutte e due il rapporto resta com'è: la carta in testa, poi il testo.`,
  dirs: [
    { key: 'now', title: 'Oggi · Annidato', note: '<p>La carta del rapporto dentro la finestra, per confronto.</p>', frames: rep3Frames({}) },
    {
      key: 'each', title: 'A · Ogni rapporto è una finestra', rec: true,
      note: `<p>Sparisce la finestra CREW REPORTS: i quattro rapporti sono quattro finestre, ognuna con «REPORT 01» nella linguetta e dentro la carta e il testo. La cornice è una sola, ed è quella delle finestre, uguale a mappa, domande e codice.</p>
        <p>Perché: toglie l'annidamento senza lasciare i rapporti fuori dal sistema delle finestre, e la finestra decorata come la carta fa di ogni rapporto una carta. Costo: non c'è più il titolo CREW REPORTS; sul telefono lo dice il tasto acceso, sul laptop resta la riga «Tap a card for the profile.».</p>`,
      frames: rep3Frames({ reportStyle: 'crewwin' }),
    },
    {
      key: 'bare', title: 'B · Le carte senza finestra attorno',
      note: `<p>Resta il titolo CREW REPORTS, senza cornice; sotto, le carte dei rapporti con la loro cornice dritta.</p>
        <p>Costo: i rapporti sono l'unica parte dello schermo senza finestra, e la loro cornice è diversa da quella delle finestre accanto.</p>`,
      frames: rep3Frames({ reportsBare: true }),
    },
  ],
};

// ---------- the physical bar without the needle ----------

const barFrames = (bar) => [
  cap('Laptop, indagine (ridotto)', laptop(chosen({ state: d2state({ tab: 'map', mapSel: 'M-K' }), deckBar: bar }), { cls: BASE, big: true })),
  cap('Telefono, rapporti', phone(chosen({ state: d2state({ tab: 'reports' }), deckBar: bar }), { cls: BASE })),
  cap('Telefono, ultimo minuto', phone(chosen({ state: d2state({ tab: 'map' }), remainingMs: 42000, deckBar: bar }), { cls: `${BASE} emergency alarm` })),
  cap('Telefono, home', phone(chosen({ state: { ...base(), phase: 'home' }, saved: { code: SAMPLE, phase: 'play', remainingMs: 6 * MIN + 12000 }, deckBar: bar }), { cls: BASE })),
];
const BAR = {
  id: 'bar', title: 'La barra fisica, senza lo strumento a lancetta', decided: 'B, le spie con la griglia e la targhetta', chosen: 'tilesgrille',
  answer: 'B · Le spie, con la griglia e la targhetta > per le spie puoi fare tipo dei led? (le spie a LED sono nella tavola «La barra fisica: le spie a LED»)',
  quote: '«non mi convince molto, soprattutto il coso con la freccia su PWR e LINK»',
  context: `Lo strumento a lancetta è tolto in tutte le direzioni. Per il resto non mi hai detto cosa non convince, quindi ti dico cosa ci vedo io: in fila ci sono pezzi di peso molto diverso senza un ordine, una griglia grande che non serve a niente, tre spie minuscole, una scritta che galleggia. Le tre direzioni usano solo pezzi che hai già visto (i tasti, CODE sotto la protezione, il tasto di accensione, le spie PWR, LINK e ALARM), ordinati in modi diversi. Se quello che non ti convince è altro, dimmelo e rifaccio su quello. Le altre tavole aperte mostrano la barra A, senza lo strumento, finché non scegli.`,
  dirs: [
    { key: 'gauge', title: 'Oggi', note: '<p>La barra che hai visto, con lo strumento.</p>', frames: barFrames('gauge').slice(0, 2) },
    {
      key: 'tiles', title: 'A · Tre spie in un solo riquadro', rec: true,
      note: `<p>PWR, LINK e ALARM diventano tre tasselli illuminati in un riquadro incassato, come i pannelli di segnalazione di una sala di controllo: PWR acceso, LINK ambra che lampeggia, ALARM spento finché non manca un minuto. Niente griglia, niente scritta. Tasti a sinistra, spie al centro, CODE e accensione a destra.</p>
        <p>Perché: sono tre gruppi leggibili al posto di sei pezzi in fila, e LINK dice «collegamento instabile» senza uno strumento da interpretare.</p>`,
      frames: barFrames('tiles'),
    },
    {
      key: 'tilesgrille', title: 'B · Le spie, con la griglia e la targhetta',
      note: '<p>Come A, tenendo l\'altoparlante a fessure e la scritta MISSION CONTROL · NIGHT SHIFT. Costo: tornano i pezzi che riempiono senza dire niente.</p>',
      frames: barFrames('tilesgrille'),
    },
    {
      key: 'min', title: 'C · Solo i tasti',
      note: '<p>Tasti, CODE e accensione, nient\'altro. Sul telefono una riga sola, con l\'accensione in fondo. Costo: è la barra «un po\' triste» di due prove fa, con meno ancora.</p>',
      frames: barFrames('min'),
    },
  ],
};

// ---------- the bar with LED lamps (done, to check) ----------

const homeSaved = { code: SAMPLE, phase: 'play', remainingMs: 6 * MIN + 12000 };
const ledFrames = (ledStyle) => [
  cap('Laptop, la barra a grandezza vera', `<div class="mock-barzoom ${BASE}">${laptop(chosen({ state: d2state({ tab: 'map', mapSel: 'M-K' }), ledStyle }), { cls: BASE, big: true })}</div>`),
  cap('Telefono, rapporti', phone(chosen({ state: d2state({ tab: 'reports' }), ledStyle }), { cls: BASE })),
  cap('Telefono, ultimo minuto', phone(chosen({ state: d2state({ tab: 'map' }), remainingMs: 42000, ledStyle }), { cls: `${BASE} emergency alarm` })),
];
const BARLED = {
  id: 'barled', title: 'La barra fisica: i LED', decided: 'B, sporgente come i tasti', chosen: 'b',
  answer: 'B · Sporgente come i tasti · «forse il glow dei led disturba mentre leggo le cose» (l\'alone attorno ai LED è tolto: la lente resta accesa, ma non fa più luce sul pannello)',
  quote: '«i led li renderei di quelli che escono un po\', tipo quelli per arduino, al momento sembrano incassati e bidimensionali a differenza dei tasti che hanno tridimensionalità» · «i led così sono orrendi, immaginavo con un po\' di prospettiva, non piatti»',
  context: 'La prima prova era una capsula vista di lato, quindi piatta: tolta. Qui due modi di dare la prospettiva. In tutti e due non c\'è più l\'incasso attorno, ogni LED ha il suo colore anche da spento (PWR acceso fisso, LINK ambra che lampeggia, ALARM rosso scuro che si accende nell\'ultimo minuto) e il nome è inciso sotto. Già fatto sulla stessa barra: il nastro a strisce gira tutto attorno a CODE, e la scritta è una targhetta di metallo che dice solo MISSION CONTROL. Il primo riquadro di ogni direzione mostra la barra del laptop a grandezza vera, per vedere i LED da vicino.',
  dirs: [
    {
      key: 'a', title: 'A · La cupola sul suo collare, vista dall\'alto', rec: true,
      note: '<p>Il LED da saldare: il collare è un\'ellisse appoggiata sul pannello, il corpo sale da lì e finisce a cupola, con la luce che gira attorno al cilindro e l\'ombra sul pannello.</p><p>Perché: l\'ellisse del collare è ciò che dà la prospettiva, ed è la forma che si riconosce come LED.</p>',
      frames: ledFrames('a'),
    },
    {
      key: 'b', title: 'B · Sporgente come i tasti',
      note: '<p>Lo stesso trucco dei tasti: si vede la cima tonda della lente e, sotto, il suo fianco, con un anello dove esce dal pannello.</p><p>Costo: è coerente con i tasti, ma sembra più un pulsante luminoso che un LED.</p>',
      frames: ledFrames('b'),
    },
  ],
};

// ---------- ASK NOVA as a chat in a terminal ----------

const hatchQ = { kind: 'hatch', what: 'M-K', a: 50, b: 60 };
const askT = (ui, s, opts = {}) => phone(chosen({ state: d2state({ tab: 'ask', ...s }), askUi: ui }), { cls: BASE, ...opts });
const ASKTERM = {
  id: 'askterm', title: 'ASK NOVA come una chat, nel terminale',
  redo: '«rimuoverei l\'ologramma ha poco senso se è nella chat, togliere solo l\'ellisse e il raggio che accende la mappa, la mappa tenere così com\'è.» · «non mi convince la schermata con nova, non scriverei ask nova, ma Nova on Kepler 9, perché la mission control penso non abbia solo una navicella, e sicuro non menzionerei night shift, è mission control e basta, la console non cambia in base ai turni.» · «tornando alla schermata con nova: non è solo il nome della finestra che non mi convince, non mi convince che mostra fin da subito la mappa, e mi chiede subito se voglio interagire, come se nova fosse ridotto a quello (nel nostro caso sì ma è poco "realistico")»',
  quote: '«ask nova vorrei sia più chatbot ma in terminale»',
  context: `La finestra ASK NOVA diventa una conversazione scritta in un terminale: le righe di NOVA e le tue, una sotto l'altra, e le risposte restano lì come storico al posto del TRANSMISSION LOG. La domanda è sempre quella di oggi, con la finestra di 10 minuti. I testi sono quelli che l'app ha già, con tre aggiunte da approvare: «MC» davanti alle tue righe (Mission Control, per stare in una colonna stretta), «NOVA» davanti alle sue, e una sola frase nuova di NOVA nella direzione A, «Which 10 minutes?». La frase con cui NOVA apre è l'aiuto di oggi sotto la mappa («Tap a hatch to ask if it opened, or a module to ask about motion.»).`,
  dirs: [
    {
      key: 'chat', title: 'A · NOVA chiede una cosa alla volta', rec: true,
      note: `<p>Come un chatbot: NOVA chiede dove, e compare il modello della stazione da toccare; poi chiede quali 10 minuti, e compaiono gli undici intervalli; poi la domanda è scritta per intero sulla tua riga, con SEND QUESTION. Le tue risposte già date restano scritte e si possono toccare per cambiarle.</p>
        <p>Perché: è quello che hai chiesto, e guida chi gioca per la prima volta un passo alla volta, con gli stessi tre tocchi di oggi. Costo: la conversazione si allunga e scorre; il modello della stazione si vede solo mentre si sceglie il luogo.</p>`,
      frames: [
        cap('1 · NOVA chiede il luogo', askT('chat', { draft: { ...hatchQ, what: null }, askStep: 1 })),
        cap('2 · NOVA chiede i 10 minuti', askT('chat', { draft: hatchQ, askStep: 2 })),
        cap('3 · La domanda pronta', askT('chat', { draft: hatchQ, askStep: 3 })),
        cap('Dopo la prima risposta', askT('chat', { draft: { ...hatchQ, what: null }, askStep: 1, log: [{ q: hatchQ, ans: 'no' }] })),
        cap('Laptop, indagine (ridotto)', laptop(chosen({ state: d2state({ tab: 'ask', draft: hatchQ, askStep: 2, log: [{ q: { kind: 'motion', what: 'K', a: 40, b: 50 }, ans: 'yes' }] }), askUi: 'chat' }), { cls: BASE, big: true })),
      ],
    },
    {
      key: 'cmd', title: 'B · Una riga di comando',
      note: `<p>Il modello della stazione resta sempre in vista. Sotto, la tua riga è la domanda con due parti che cambiano: il luogo (toccando il modello) e i 10 minuti (con le due frecce, 5 minuti a tocco). Lo storico sta sopra.</p>
        <p>Costo: è la finestra di oggi vestita da terminale, più che una conversazione.</p>`,
      frames: [
        cap('Niente scelto', askT('cmd', { draft: { ...hatchQ, what: null } })),
        cap('La domanda pronta', askT('cmd', { draft: hatchQ }, { scroll: 'bottom' })),
        cap('Dopo la prima risposta', askT('cmd', { draft: { kind: 'motion', what: 'M', a: 45, b: 55 }, log: [{ q: hatchQ, ans: 'no' }] }, { scroll: 'bottom' })),
        cap('Laptop, indagine (ridotto)', laptop(chosen({ state: d2state({ tab: 'ask', draft: hatchQ, log: [{ q: { kind: 'motion', what: 'K', a: 40, b: 50 }, ans: 'yes' }] }), askUi: 'cmd' }), { cls: BASE, big: true })),
      ],
    },
    { key: 'now', title: 'Oggi', note: '<p>La finestra di oggi, con la finestra di tempo da 10 minuti, per confronto.</p>', frames: [cap('Telefono, Ask NOVA', askT(null, { draft: hatchQ }))] },
  ],
};

// ---------- NOVA on Kepler-9: a channel that doesn't open on the map ----------

const novaT = (ui, s, opts = {}) => phone(chosen({ state: d2state({ tab: 'ask', ...s }), askUi: ui }), { cls: BASE, ...opts });
const novaFrames = (ui) => [
  cap('Appena aperto il canale', novaT(ui, { draft: { ...hatchQ, what: null }, askStep: 0 }, ui === 'thread' ? { scroll: 'bottom' } : {})),
  cap('Dopo NEW QUESTION: NOVA chiede il luogo', novaT(ui, { draft: { ...hatchQ, what: null }, askStep: 1 }, { scroll: 'bottom' })),
  cap('NOVA chiede i 10 minuti', novaT(ui, { draft: hatchQ, askStep: 2 }, { scroll: 'bottom' })),
  cap('La domanda pronta', novaT(ui, { draft: hatchQ, askStep: 3 }, { scroll: 'bottom' })),
  cap('Dopo la risposta', novaT(ui, { draft: { ...hatchQ, what: null }, askStep: 0, log: [{ q: hatchQ, ans: 'no' }] }, { scroll: 'bottom' })),
  cap('Laptop, indagine (ridotto)', laptop(chosen({ state: d2state({ tab: 'ask', draft: { ...hatchQ, what: null }, askStep: 0, log: [{ q: { kind: 'motion', what: 'K', a: 40, b: 50 }, ans: 'yes' }] }), askUi: ui }), { cls: BASE, big: true })),
];
const ASKTERM2 = {
  id: 'nova', title: 'NOVA on Kepler-9: il canale non si apre sulla mappa', decided: 'B, tutta la conversazione con NOVA', chosen: 'thread',
  answer: 'B · Tutta la conversazione con NOVA · «per rendere il terminale più leggibile possiamo allineare il ">" davanti al messaggio? così finisce sempre allo stesso punto?» (fatto: i nomi finiscono sulla stessa colonna)',
  quote: '«non è solo il nome della finestra che non mi convince, non mi convince che mostra fin da subito la mappa, e mi chiede subito se voglio interagire, come se nova fosse ridotto a quello (nel nostro caso sì ma è poco "realistico")»',
  context: `Già applicato in tutte le prove: la finestra si chiama «NOVA ON KEPLER-9» (e il tasto sulla barra «NOVA», perché «ASK NOVA» non lo scriveresti: dimmi se sul tasto lo vuoi tenere); «NIGHT SHIFT» è tolto ovunque, anche nel gioco, e resta «MISSION CONTROL»; dentro la conversazione la mappa non ha più l'anello e il raggio del proiettore, ed è per il resto la stessa. Quello che resta da scegliere è come si apre il canale. In tutte e due le direzioni il canale è aperto e fermo: NOVA dice cosa regge il collegamento, e la mappa compare solo dopo che hai chiesto tu di fare una domanda. Testi nuovi da approvare: la riga di NOVA «The link will carry 2 questions and the emergency code.», ricavata dalla frase del briefing «It will carry only 2 questions and the emergency code.»; il comando «NEW QUESTION»; e la tua riga «New question», che è il comando ripetuto.`,
  dirs: [
    {
      key: 'open', title: 'A · Il canale aperto, la domanda parte da un comando', rec: true,
      note: `<p>Aprendo il canale trovi la riga di NOVA sul collegamento e la tua riga vuota con NEW QUESTION. Solo dopo NOVA chiede dove, e compare la mappa; poi i 10 minuti; poi la domanda da mandare. Dopo la risposta il canale torna fermo, con una domanda in meno.</p>
        <p>Perché: risponde alla tua critica con il minimo: NOVA non ti accoglie con la mappa, e la domanda è una cosa che chiedi tu. Costo: un tocco in più per ogni domanda (due in tutto).</p>`,
      frames: novaFrames('open'),
    },
    {
      key: 'thread', title: 'B · Tutta la conversazione con NOVA',
      note: `<p>Come A, ma in cima al canale ci sono i messaggi che NOVA ti ha già scritto, quelli del briefing: è una conversazione sola, dall'inizio.</p>
        <p>Da sapere: tocca il briefing che avevi deciso (i messaggi di NOVA più le quattro schede delle regole). I messaggi starebbero in due posti, qui e sotto BRIEFING, oppure BRIEFING terrebbe solo le regole. Lo propongo una volta sola, perché è il modo in cui NOVA sembra meno ridotta alle domande.</p>`,
      frames: novaFrames('thread'),
    },
  ],
};

// ---------- the console fills up after accepting NOVA's transmission (storyboard) ----------

const liveState = (stage, s = {}) => (stage < 0 ? { ...base(), phase: 'home' } : d2state({ tab: 'ask', draft: { ...hatchQ, what: null }, askStep: 0, openReports: stage >= 8 ? c.order.slice(0, 2) : [], ...s }));
const liveL = (label, stage, s = {}, extra = {}) => cap(label, laptop(chosen({ flow: 'live', stage, state: liveState(stage, s), remainingMs: 10 * MIN - 9000, ...extra }), { cls: BASE, big: true }));
const liveP = (label, stage, s = {}, opts = {}) => cap(label, phone(chosen({ flow: 'live', stage, state: liveState(stage, s), remainingMs: 10 * MIN - 9000 }), { cls: BASE, ...opts }));
const LIVE = {
  id: 'live', title: 'La console si popola dopo aver accettato la trasmissione', done: 'nel gioco dal 2026-11-25',
  quote: '«dovrebbe essere una richiesta di nova, che chiede a mission control di rispondere, chi apre la webapp accetta la trasmissione e nova inizia a scrivere. compare poi la schermata briefing, che si compila mentre nova scrive, come se mission control stesse prendendo in carico il caso e si appunta le cose no, e anche i report vengono aperti man mano che nova li apre (nella chat si vedono come allegati non lo so)» · «ah, e per forza di cose, anche il timer dell\'ossigeno e il numero di domande, saranno finestre, che compaiono dove che è comparso il briefing ecc. quindi vediamo veramente la console popolarsi dopo aver accettato il caso» · «change layout della console di mission control, centrato nova, a sinistra mappa, a destra report, timer e domande, sopra la mappa, sempre colonna di sinistra» · «cambia alla mappa dai, così l\'utente vede che si può cambiare, e la mappa è più scenografica» · «se riscrivi il testo riformattato, riesci ad allungare la finestra per combaciare più o meno la chat di nova?»',
  context: `Dal 2026-11-25 è nel gioco, con tutto ciò che è deciso nelle tavole qui sotto. Tre cose che lo storyboard non diceva e che ho chiuso con pezzi già decisi, da correggere se non tornano: NOVA scrive alla velocità di chi batte (il briefing dura circa 13 secondi; il ritmo è in discussione nella tavola «Il ritmo di NOVA») e un tocco sulla sua conversazione mostra subito il resto, come è sempre stato per il suo testo; un allegato toccato nella chat apre quel rapporto; riaprendo la pagina con un caso aperto, sopra la richiesta c'è il caso ridotto a striscia, con l'ossigeno e CONTINUE (ultimi due riquadri; scelta del 2026-11-26, prima era una riga dentro la finestra della richiesta). Dal 2026-11-26 la console non ha più parole di gioco: la conferma del tasto di accensione dice «POWER OFF CONSOLE», la soluzione è «INCIDENT REPORT» e si chiude con «CLOSE CASE», che riporta alla console vuota; i finali non hanno più il titolone e la loro finestra porta il numero del caso e l'esito («MISSION FAILED», «MISSION SUCCESSFUL»). È uno storyboard: i momenti in ordine, sul laptop e sul telefono. Non ci sono scelte da fare con il pallino; dimmi cosa non torna. Come l'ho letta. La console è vuota e c'è solo la richiesta di NOVA, la sua prima frase di oggi («Mission Control, this is NOVA on Kepler-9.») con ACCEPT. Accettando, NOVA scrive il resto del briefing nel suo canale, una frase alla volta, e ogni cosa compare quando la dice: gli appunti del caso (la finestra CASE con il suo codice, una riga per ogni frase), i quattro rapporti come allegati sotto la frase che li nomina (e la colonna dei rapporti si apre), la mappa quando parla dei sensori, la finestra QUESTIONS quando dice quante domande regge il collegamento, la finestra OXYGEN quando dice l'ossigeno. Sulla barra un tasto si accende solo quando c'è ciò che apre. L'ossigeno parte con l'ultima frase di NOVA («Oxygen: 10 minutes. The countdown has already started.»), quando arriva la sua finestra, e non più da ACCEPT (2026-11-25: «il timer di 10 min deve partire da quando nova scrive "the timer has already started"»). Sul laptop, dopo il tuo ultimo messaggio, le colonne sono tre e NOVA sta in quella al centro dall'inizio alla fine, senza spostarsi: a sinistra, quando si apre il caso, arriva la colonna con domande e ossigeno in alto (le domande a sinistra perché arrivano prima) e sotto gli appunti del caso finché NOVA scrive; quando ha finito, la mappa prende il loro posto e resta, e i tasti BRIEFING e CODE riportano lì gli appunti o il codice; a destra arrivano i rapporti. Prima NOVA stava a sinistra e la colonna al centro era questa. Le finestre a sinistra sono alte quanto il loro contenuto (2026-11-25: «facciamo che anche i pannelli a sinistra hug content»; prima quella sotto domande e ossigeno finiva dove finisce la chat di NOVA), e la mappa arriva con Life Support selezionata; ogni appunto si scrive quando NOVA ha finito la frase da cui viene («briefing deve scrivere dopo un po' rispetto a nova, altrimenti non sembra che stia prendendo appunti»); negli appunti il nome sta a sinistra e ogni fatto ha la sua riga, con le stesse parole di prima. Sul telefono domande e ossigeno stanno in alto e sotto c'è un canale alla volta. La conversazione con NOVA scorre dentro la sua finestra, con la barra di scorrimento nel nostro stile: il bordo resta sempre in vista. I rapporti arrivano chiusi, uno alla volta («i report vorrei che compaiano uno alla volta»): una striscia con gli angoli smussati, il solo nome («REPORT 01: MIRA») e il segno + a destra, dove da aperto sta il −; toccandola si apre, e il − in fondo al testo la richiude; se ne possono tenere aperti quanti si vuole. Testi nuovi da approvare: ACCEPT e INCOMING TRANSMISSION; le sette righe di appunti, che sono le frasi di NOVA ridotte a parole chiave (SITUATION_ «03:00 · Recycler sabotaged · Every module sealed»; SABOTEUR_ «Whoever was in Life Support»; REPORTS_ «4 reports · One is false»; SENSORS_ «Hatch openings · Motion · No names recorded»; LINK_ «Damaged · 2 questions · Emergency code» (senza la regola sulla domanda rifiutata: quella il giocatore la scopre da sé); CODE_ «False report number + saboteur's ID · One attempt»; OXYGEN_ «10 minutes»); e gli allegati, righe di testo come in un terminale («+ REPORT 01: MIRA»). Dopo i tuoi ultimi messaggi: il canale di NOVA non ha più la linguetta, e ogni rapporto è una finestra con la sua linguetta («REPORT 01: MIRA»), sotto il titolo CREW REPORTS. Una finestra che cambia posto ci scivola invece di saltare («La finestra di Nova dal centro scatta in cima, serve una transizione per le finestre se si spostano»).`,
  common: [
    liveL('1 · Laptop: la richiesta di NOVA, console vuota', -1),
    liveL('2 · Accettato: NOVA scrive, da sola al centro', 0),
    liveL('3 · A sinistra compaiono gli appunti del caso', 1),
    liveL('4 · A destra i rapporti, che NOVA allega e arrivano chiusi', 3),
    liveL('5 · Il collegamento: compare QUESTIONS, in alto a sinistra', 5),
    liveL('6 · L\'ossigeno: compare OXYGEN accanto a QUESTIONS; gli appunti sono completi', 7),
    liveL('7 · NOVA ha finito: la mappa prende il posto degli appunti; due rapporti aperti', 8),
    liveL('8 · Tasto BRIEFING: tornano gli appunti', 8, { tab: 'briefing' }),
    liveP('1 · Telefono: la richiesta di NOVA', -1),
    liveP('2 · NOVA scrive', 1),
    liveP('3 · I rapporti come allegati', 3, {}, { scroll: 'bottom' }),
    liveP('4 · Compare QUESTIONS', 5, {}, { scroll: 'bottom' }),
    liveP('5 · Compare OXYGEN, NOVA ha finito', 8, {}, { scroll: 'bottom' }),
    liveP('6 · Tasto BRIEFING: gli appunti del caso', 8, { tab: 'briefing' }),
    liveP('7 · Tasto REPORTS: il primo rapporto aperto, gli altri chiusi', 8, { tab: 'reports', openReports: c.order.slice(0, 1) }),
    liveL('Riapertura con un caso aperto: la sua striscia sopra la richiesta', -1, {}, { saved: { code: SAMPLE, phase: 'play', remainingMs: 7 * MIN + 42000 } }),
    cap('Telefono: riapertura con un caso aperto', phone(chosen({ flow: 'live', stage: -1, state: liveState(-1), saved: { code: SAMPLE, phase: 'play', remainingMs: 7 * MIN + 42000 } }), { cls: BASE })),
  ],
  dirs: [],
};

// ---------- the top edge of NOVA's conversation once it has been scrolled ----------

const scrFrame = (key, label) => cap(label, laptop(chosen({ flow: 'live', stage: 8, state: liveState(8), remainingMs: 10 * MIN - 9000 }), { cls: `${BASE} scr-${key}`, big: true }));
const SCROLLEDGE = {
  id: 'scrolledge', title: 'La chat di NOVA quando scorre: il taglio sotto il titolo', decided: 'A, il testo sfuma sotto il titolo', chosen: 'c',
  answer: 'A · Il testo sfuma sotto il titolo > Per l\'intestazione che taglia il contenuto, vai con lo sfumato',
  quote: '«se scrollo nella finestra di nova, c\'è quel taglio strano, come possiamo risolvere?»',
  context: 'Come la leggo: quando la conversazione è scesa, una riga resta tagliata a metà subito sotto «NOVA ON KEPLER-9», e lì non c\'è niente che faccia da bordo: il testo sembra tagliato dal nulla (in fondo succede lo stesso, ma lì c\'è la cornice e non stona). Tre modi di risolvere, da provare scorrendo la chat dentro il riquadro: le prove partono con la conversazione a metà, dove oggi si vede il taglio. Ne ho provato un quarto e l\'ho scartato: far scorrere la chat a messaggi interi, come un terminale a righe. L\'ho misurato: con la chat all\'ultima riga, che è dove sta quasi sempre, il bordo in alto cade dove lo mette l\'ultima riga e il taglio resta.',
  dirs: [
    { key: '0', title: 'Oggi', note: '<p>Per confronto: la riga tagliata sotto il titolo.</p>', frames: [scrFrame('0', 'Laptop: la chat a metà')] },
    {
      key: 'c', title: 'A · Il testo sfuma sotto il titolo', rec: true,
      note: `<p>Quando la conversazione è scesa, le righe che passano sotto il titolo si spengono negli ultimi 30 px invece di essere tagliate di netto. Con la chat all'inizio non sfuma niente.</p>
        <p>Perché: a chat ferma la finestra resta identica a com'è, e vale uguale per ogni finestra che scorre dentro (anche gli appunti su uno schermo basso). Costo: la riga in alto si legge male finché non la porti più giù.</p>`,
      frames: [scrFrame('c', 'Laptop: la chat a metà, le righe sfumano')],
    },
    {
      key: 'b', title: 'B · Una linea sotto il titolo',
      note: `<p>Una linea sottile separa il titolo dalla conversazione, da bordo a bordo: il testo passa sotto un bordo che si vede, come succede in fondo con la cornice.</p>
        <p>Costo: la linea c'è sempre, anche a chat ferma, e sulle finestre con la linguetta la linea sotto il titolo non ti era piaciuta.</p>`,
      frames: [scrFrame('b', 'Laptop: la chat a metà, sotto una linea')],
    },
    {
      key: 'd', title: 'C · Il titolo su una fascia piena',
      note: `<p>Dietro il titolo c'è una fascia più chiara larga quanto la finestra, come la riga di stato di un terminale: il bordo è il cambio di fondo, senza linea.</p>
        <p>Costo: cambia il disegno della finestra anche a chat ferma, e per coerenza la fascia andrebbe alle altre finestre senza linguetta (QUESTIONS, OXYGEN, il codice).</p>`,
      frames: [scrFrame('d', 'Laptop: la chat a metà, sotto la fascia del titolo')],
    },
  ],
};

// ---------- the console and its monitor in pixel art ----------

const pixelView = (extra = {}) => chosen({ deck: 'pixel', flow: 'live', stage: 8, state: liveState(8), remainingMs: 10 * MIN - 9000, ...extra });
const pixelFrames = (deckStyle) => {
  const v = (extra = {}) => ({ ...pixelView(extra), deck: deckStyle });
  return [
    cap('Laptop, console piena', laptop(v(), { cls: BASE, big: true })),
    cap('Laptop, la barra a grandezza vera', `<div class="mock-barzoom ${BASE}">${laptop(v(), { cls: BASE, big: true })}</div>`),
    cap('Telefono, NOVA', phone(v(), { cls: BASE })),
    cap('Telefono, rapporti', phone(v({ state: liveState(8, { tab: 'reports', openReports: c.order.slice(0, 1) }) }), { cls: BASE })),
    cap('Telefono, ultimo minuto', phone(v({ remainingMs: 42000, state: liveState(8, { tab: 'map' }) }), { cls: `${BASE} emergency alarm` })),
    cap('Telefono, la richiesta di NOVA (tasti spenti)', phone(v({ stage: -1, state: liveState(-1) }), { cls: BASE })),
  ];
};
const PIXELDECK = {
  id: 'pixeldeck', title: 'La console e il monitor in pixel art', decided: 'Oggi, la console in uso', chosen: 'retro',
  answer: 'Oggi · La console in uso',
  quote: '«Aggiungimi nel mock una prova con la console e monitor (non lo schermo e il contenuto) in versione pixel art»',
  context: 'Cambia solo l\'hardware: la cornice del monitor, la barra, i tasti, il tasto CODE con la sua protezione, i LED, la griglia, la targhetta, il tasto di accensione. Lo schermo e quello che c\'è dentro restano com\'erano. Come l\'ho disegnata: tutto su una sola griglia di pixel quadrati (3 px sul laptop, 2 sul telefono), tinte piatte prese da una scala corta di grigi, un contorno scuro di un pixel, un filo chiaro in alto e a sinistra e uno scuro in basso e a destra, angoli tagliati a gradini, retino a scacchi dove una superficie gira. Niente sfumature, niente ombre morbide, niente angoli tondi. È disegnata con il codice, non con un\'immagine: si adatta a ogni larghezza e i tasti si accendono e si abbassano come oggi. Il segno dell\'accensione qui è in pixel come il resto dell\'hardware; sulla console in uso resta quello vettoriale che avevi chiesto.',
  dirs: [
    { key: 'retro', title: 'Oggi · La console in uso', note: '<p>Per confronto: l\'hardware di oggi, con le sfumature e gli angoli tondi.</p>', frames: pixelFrames('retro').slice(0, 3) },
    {
      key: 'pixel', title: 'A · In pixel art',
      note: `<p>La cornice del monitor è spessa, con gli angoli a gradini e il vetro incassato; i tasti sono blocchi rialzati che scendono di un pixel quando sono accesi; CODE sta sotto una protezione a strisce disegnate a scalini; i LED sono blocchetti di luce con un pixel bianco di riflesso; la targhetta e la griglia sono piatte.</p>
        <p>Costo: accanto a uno schermo che ha linee sottili, bagliore e caratteri piccoli, un hardware a pixel grossi è un altro registro; i ritratti e i titoli invece sono già a pixel, e con quelli lega. Il bagliore dei tasti accesi non c'è più: un tasto acceso si riconosce dal bordo e dalla spia.</p>`,
      frames: pixelFrames('pixel'),
    },
  ],
};

// ---------- after the feedback of 2026-11-25: the columns against NOVA's height, the member's block ----------

const fbView = (s = {}, extra = {}) => chosen({ flow: 'live', stage: 8, state: liveState(8, s), remainingMs: 10 * MIN - 9000, ...extra });
const fbL = (label, cls, s = {}) => cap(label, laptop(fbView(s), { cls: `${BASE} ${cls}`, big: true }));
// (the record of these boards keeps what they were drawn with: mf-0, the left column as tall as NOVA's window, as it
// was when they were chosen; rh-0, the member's block as it was)
const repcolFrames = (cls) => [
  fbL('Laptop: tutti chiusi', `mf-0 ${cls}`, { openReports: [] }),
  fbL('Laptop: uno aperto', `mf-0 ${cls}`, { openReports: c.order.slice(0, 1) }),
  fbL('Laptop: due aperti', `mf-0 ${cls}`, { openReports: c.order.slice(0, 2) }),
];
const REPCOL = {
  id: 'repcol', title: 'La colonna dei rapporti: finire dove finisce NOVA', decided: 'Oggi, uno sotto l\'altro', chosen: 'now',
  answer: 'Oggi · Uno sotto l\'altro, dall\'alto > facciamo che anche i pannelli a sinistra hug content, così a destra i report non tocchiamo più e lasciamo così come sono oggi',
  quote: '«Se la prima colonna è sempre lunga quanto nova, tanto vale sistemare gli spazi dei report e avere pannello che finisce giusto.»',
  context: 'Come la leggo: la colonna di sinistra finisce già dove finisce la chat di NOVA; quella dei rapporti no, e sotto l\'ultimo rapporto resta un vuoto che cambia a ogni apertura. Due modi di farla finire sulla stessa riga, usando solo gli spazi (i rapporti restano senza finestra attorno, come avevi scelto). In tutte e due, se i rapporti aperti non ci stanno la colonna scorre come oggi. Nel codice la colonna seguirebbe l\'altezza di NOVA a ogni passo del briefing, come fa quella di sinistra; qui la vedi a console piena.',
  dirs: [
    { key: 'now', title: 'Oggi · Uno sotto l\'altro, dall\'alto', note: '<p>Per confronto.</p>', frames: repcolFrames('').slice(0, 2) },
    {
      key: 'a', title: 'A · Gli spazi tra i rapporti si allargano', rec: true,
      note: `<p>I quattro rapporti si distribuiscono lungo la colonna: il primo sotto il titolo, l'ultimo finisce dove finisce NOVA, e lo spazio che resta si divide in parti uguali tra loro. Aprendone uno gli spazi si stringono.</p>
        <p>Perché: finisce giusta in ogni stato senza cambiare il disegno di nessun rapporto. Costo: con tutti i rapporti chiusi gli spazi sono larghi (più di 100 px l'uno su questo schermo), e a ogni apertura gli altri si spostano.</p>`,
      frames: repcolFrames('rc-a'),
    },
    {
      key: 'b', title: 'B · I rapporti aperti si prendono lo spazio',
      note: `<p>I rapporti chiusi restano vicini; quelli aperti si allungano fino a riempire la colonna, con il − che resta in fondo a destra. Se sono tutti chiusi si distribuiscono come in A.</p>
        <p>Costo: un rapporto aperto da solo diventa una finestra alta con poco testo in cima e molto vuoto sotto.</p>`,
      frames: repcolFrames('rc-b'),
    },
  ],
};
const mapfitFrames = (cls, sel = null) => [
  fbL(sel ? 'Laptop: Life Support già selezionata' : 'Laptop: niente selezionato', cls, { mapSel: sel }),
  fbL('Laptop: dopo aver toccato un portello', cls, { mapSel: 'M-K' }),
];
const MAPFIT = {
  id: 'mapfit', title: 'La scheda della mappa quando è vuota', decided: 'A, si adatta al contenuto, con Life Support aperto', chosen: 'a',
  answer: 'A · Si adatta al contenuto > con life support aperto',
  quote: '«Però ha più senso che la scheda della mappa si adatti al contenuto, es. quando è vuota, oppure mostra già selezionata Life Support?»',
  context: 'Oggi la scheda della mappa è alta quanto la chat di NOVA anche quando non hai toccato niente, e sotto «Tap a module or a hatch.» resta un vuoto. Tre modi di risolverlo. La mia posizione: la C, perché finisce giusta qualunque cosa sia selezionata (le letture hanno due o tre righe, e con A e B resta sempre un po\' di scarto), e in più Life Support già selezionata all\'arrivo, come in B: NOVA ha appena detto che i suoi sensori sono stati staccati, e la lettura mostra subito a cosa serve toccare la mappa. Non indirizza nessuna domanda: su Life Support NOVA non può rispondere. Se vuoi le due cose insieme, dimmelo: nella tavola sono separate per poterle giudicare.',
  dirs: [
    { key: 'now', title: 'Oggi · Alta quanto NOVA, vuota sotto', note: '<p>Per confronto.</p>', frames: mapfitFrames('mf-0').slice(0, 1) },
    {
      key: 'a', title: 'A · Si adatta al contenuto',
      note: `<p>La scheda è alta quanto la mappa e la sua lettura; finisce più in alto della chat di NOVA quando non c'è niente di selezionato, più in basso dopo un tocco.</p>
        <p>Costo: la colonna di sinistra non finisce più sulla riga delle altre, e la scheda cambia altezza a ogni tocco.</p>`,
      frames: mapfitFrames('mf-a'),
    },
    {
      key: 'b', title: 'B · Alta quanto NOVA, con Life Support già selezionata',
      note: `<p>La mappa arriva con Life Support selezionata e la sua lettura già scritta («Motion sensor: Offline», «Cause: Manual disconnection, inside the module»).</p>
        <p>Costo: resta un po' di vuoto sotto la lettura, e torna intero se tocchi un altro punto con meno righe; e l'app, per la prima volta, mostra un posto senza che tu l'abbia toccato.</p>`,
      frames: mapfitFrames('mf-0', 'L'),
    },
    {
      key: 'c', title: 'C · Alta quanto NOVA, la lettura in fondo', rec: true,
      note: `<p>La lettura sta in fondo alla scheda e il modello sta al centro dello spazio che resta sopra: il vuoto diventa aria attorno all'ologramma, sopra e sotto in parti uguali.</p>
        <p>Perché: finisce giusta con niente selezionato, con due righe e con tre. Costo: su uno schermo molto alto il modello resta lontano dal titolo.</p>`,
      frames: mapfitFrames('mf-c'),
    },
  ],
};
const repheadFrames = (cls) => [
  fbL('Laptop: due rapporti aperti', cls, { openReports: c.order.slice(0, 2) }),
  cap('Telefono: un rapporto aperto', phone(fbView({ tab: 'reports', openReports: c.order.slice(0, 2) }), { cls: `${BASE} ${cls}` })),
];
const REPHEAD = {
  id: 'rephead', title: 'La scheda del rapporto: i dati del membro', decided: 'A, chi è a sinistra, ID e scheda a destra', chosen: 'a',
  answer: 'A · Chi è a sinistra, ID e scheda a destra',
  quote: '«La scheda dei report ha le info sul membro tutte a sinistra, lasciando destra vuoto, come possiamo riorganizzare quelle informazioni?»',
  context: 'In testa a un rapporto aperto ci sono cinque cose: il ritratto, il nome, il ruolo, l\'ID e la scritta PERSONNEL FILE che porta al profilo. Oggi stanno tutte in colonna accanto al ritratto, come sulla carta del gruppo, che però è quadrata: in una finestra larga il doppio la metà destra resta vuota. Tre modi di usarla, tutti con le stesse cinque cose e le stesse parole; tutta la testata resta toccabile per aprire il profilo.',
  dirs: [
    { key: 'now', title: 'Oggi · Tutto a sinistra', note: '<p>Per confronto.</p>', frames: repheadFrames('rh-0').slice(0, 1) },
    {
      key: 'a', title: 'A · Chi è a sinistra, ID e scheda a destra', rec: true,
      note: `<p>A sinistra il ritratto con nome e ruolo; a destra, allineati al bordo, l'ID in alto e PERSONNEL FILE sotto.</p>
        <p>Perché: è il cambio più piccolo, separa chi è (a sinistra) da quello che serve per il codice e per il profilo (a destra), e l'ID di ogni rapporto cade sempre nello stesso punto, facile da ritrovare quando componi il codice.</p>`,
      frames: repheadFrames('rh-a'),
    },
    {
      key: 'b', title: 'B · L\'ID accanto al nome, la scheda come tasto a destra',
      note: `<p>Nome e ID sulla stessa riga, il ruolo sotto; a destra PERSONNEL FILE diventa un tasto, disegnato come il + e il − dei rapporti.</p>
        <p>Costo: il tasto pesa più del nome, e nella striscia c'è già il − in fondo: due riquadri nella stessa finestra.</p>`,
      frames: repheadFrames('rh-b'),
    },
    {
      key: 'c', title: 'C · Una scheda a campi, come la tessera del profilo',
      note: `<p>Nome e ruolo con le loro etichette («NAME_», «ROLE_», le stesse della tessera che si apre con il profilo), l'ID e PERSONNEL FILE a destra.</p>
        <p>Costo: due etichette in più da leggere per due dati che si capiscono da soli.</p>`,
      frames: repheadFrames('rh-c'),
    },
  ],
};

// ---------- after the feedback of 2026-11-25, second set: NOVA's pace, a case left open, the archive, the text font ----------

// the game itself, in a frame, with one pace (?pace=) and leaving no trace (?demo=1)
const paceFrame = (key, label) => cap(label, `<div class="mock-live"><iframe src="./?demo=1&amp;pace=${key}" data-play="./?demo=1&amp;pace=${key}&amp;auto=1" loading="lazy" title="${label}"></iframe></div><button type="button" class="replay" data-replay="live">Avvia il briefing</button>`);
const PACE = {
  id: 'pace', title: 'Il ritmo di NOVA mentre scrive il briefing',
  quote: '«siccome nova scrive tanto testo tutto in un colpo, come scadenziamo e diamo tempo ai giocatori di seguire la console, anche in modo più realistico?» · «certo che mi hai fatto il mock del ritmo di battitura su una frase, quando sarebbe stato utile su testi più lunghi per vedere le tue proposte in azione....»',
  context: 'Corretta il 2026-11-26. Prima ogni riquadro restava fermo sulla richiesta di NOVA, una frase sola, finché non premevi ACCEPT dentro il riquadro: così il ritmo si vedeva su una frase. Ora «Avvia il briefing», sotto ogni riquadro, fa partire tutto il briefing a quel ritmo: otto frasi, 862 lettere, con gli appunti, i rapporti, la mappa e l\'ossigeno che arrivano mentre NOVA scrive; ripremendolo ricomincia. È il testo più lungo che NOVA scrive in un caso. Ogni riquadro è la console vera, non un disegno. I tempi li ho calcolati, non visti: nel mio browser le animazioni vanno a scatti, quindi il giudizio è tuo. In tutte le prove vale quello che hai appena chiesto: l\'ossigeno parte solo con l\'ultima frase (il tempo del briefing non costa ossigeno), ogni appunto si scrive quando NOVA ha finito la frase, i rapporti arrivano uno alla volta, e un tocco sulla conversazione mostra subito il resto. La mia posizione: A. Le frasi restano tutte sulla console (nella chat e negli appunti del caso), quindi il ritmo non deve dare il tempo di imparare le regole: deve dare allo sguardo il tempo di andare dalla chat a ciò che compare, e A lo fa senza aggiungere pezzi né parole.',
  dirs: [
    { key: 'now', title: 'Oggi · 90 lettere al secondo, un terzo di secondo tra le frasi', note: '<p>Per confronto. Il briefing dura circa 13 secondi: NOVA passa alla frase dopo anche se la finestra che ha appena portato si sta ancora scrivendo.</p>', frames: [paceFrame('now', 'Laptop: il gioco di oggi')] },
    {
      key: 'a', title: 'A · Più lenta, e aspetta la console', rec: true,
      note: `<p>NOVA scrive a metà velocità (45 lettere al secondo) e non comincia la frase dopo finché quello che ha portato non è arrivato per intero: l'appunto scritto, i rapporti entrati, la mappa costruita. Poi una pausa di 0,7 secondi. Circa 30 secondi in tutto.</p>
        <p>Perché: nessun pezzo nuovo, e succede una cosa alla volta: prima parla lei, poi la console prende nota. Costo: chi rigioca aspetta mezzo minuto, oppure tocca la chat per saltare.</p>`,
      frames: [paceFrame('a', 'Laptop: più lenta, aspetta la console')],
    },
    {
      key: 'b', title: 'B · A trasmissioni: l\'attesa prima, il tempo di leggere dopo',
      note: `<p>Prima di ogni frase il prompt «NOVA>» resta quasi un secondo da solo con il cursore che lampeggia, come una trasmissione che sta arrivando da un collegamento danneggiato. La frase si scrive a 60 lettere al secondo; poi NOVA aspetta la console e lascia un tempo di lettura proporzionato alla lunghezza della frase. Circa 40 secondi.</p>
        <p>Costo: è la più lunga, e nelle pause non succede niente: il gruppo può pensare che si sia fermata.</p>`,
      frames: [paceFrame('b', 'Laptop: a trasmissioni')],
    },
    {
      key: 'c', title: 'C · Al ritmo di chi gioca: Mission Control risponde «Copy.»',
      note: `<p>Questa è un'idea mia, non tua. NOVA scrive una frase (a 45 lettere al secondo) e aspetta: sotto compare la riga di Mission Control con il pulsante COPY. Premendolo, nella conversazione resta «Copy.» e NOVA va avanti. L'ultima frase, quella dell'ossigeno, arriva da sola dopo il COPY sul codice.</p>
        <p>Perché: un gruppo che legge insieme attorno a un tavolo si prende il tempo che gli serve, ed è lo scambio di una radio vera. Costo: sei tocchi prima di cominciare, due testi nuovi da approvare («COPY» sul pulsante, «Copy.» nella chat) e sei righe in più nella conversazione.</p>`,
      frames: [paceFrame('c', 'Laptop: al ritmo di chi gioca')],
    },
  ],
};

const HELD = { code: SAMPLE, phase: 'play', remainingMs: 7 * MIN + 42000, last: 'The link will carry 1 question and the emergency code.' };
const NEXT = 'K9-M3XD';
const heldFrames = (homeAlt) => {
  const v = () => chosen({ flow: 'live', stage: -1, state: liveState(-1), saved: HELD, homeAlt, nextCode: NEXT });
  return [cap('Laptop: riapertura con un caso aperto', laptop(v(), { cls: BASE, big: true })), cap('Telefono', phone(v(), { cls: BASE }))];
};
const RESUME = {
  id: 'resume', title: 'Riaprire la pagina con un caso aperto', decided: 'B, il caso aperto ridotto a striscia', chosen: 'strip',
  answer: 'B · Il caso aperto ridotto a striscia > perfetto, però mi chiedo se accept sia il termine più adatto',
  quote: '«quando c\'è una partita in corso, e ricarico, non è molto convincing come hai fatto, forse addirittura farei due finestre, ma come differenziamo i due kepler-9? magari ci sono più test e stanno venendo tutti sabotati allo stesso tempo?»',
  context: 'Sviluppo la tua idea delle due finestre. Per distinguere i due Kepler-9 uso quello che l\'app ha già: il numero del caso. Se i test sabotati sono più d\'uno, ogni chiamata di NOVA è un caso con il suo numero, e la console può averne uno aperto mentre ne arriva un altro. Sotto cambia una cosa sola: il numero del caso nuovo deve esistere prima di ACCEPT (oggi nasce quando accetti). La parte di storia («più test, sabotati allo stesso tempo») non la scrivo io: non tengo una copia della storia, nel repository ci sono solo le frasi del briefing e della soluzione; va alla sessione che ha la storia, come hai detto. Nessuna parola nuova: CASE, OXYGEN, CONTINUE, INCOMING TRANSMISSION e ACCEPT ci sono già. Resta da decidere, in tutte e due: accettando la chiamata nuova il caso aperto si perde, come oggi, senza conferma.',
  dirs: [
    { key: 'now', title: 'Oggi · Una riga sopra la richiesta', note: '<p>Per confronto: il caso aperto è una riga dentro la finestra della chiamata nuova.</p>', frames: heldFrames('row') },
    {
      key: 'two', title: 'A · Due finestre: il collegamento aperto e la chiamata nuova', rec: true,
      note: `<p>A sinistra (sopra, sul telefono) il collegamento rimasto aperto: l'ultima cosa che NOVA ha detto in quel caso, il suo numero, l'ossigeno che scende e CONTINUE. A destra la chiamata nuova, con il suo numero e ACCEPT.</p>
        <p>Perché: è la tua idea, e fa vedere che i casi sono più d'uno; i due NOVA si distinguono dal numero del caso e da quello che stanno dicendo, uno a metà conversazione e uno che chiama. Costo: sul telefono le due finestre occupano mezzo schermo, e la chiamata nuova mostra un numero di caso anche quando non c'è un caso aperto (per coerenza andrebbe sempre).</p>`,
      frames: heldFrames('two'),
    },
    {
      key: 'strip', title: 'B · Il caso aperto ridotto a striscia',
      note: `<p>Il caso aperto è una finestra chiusa sopra la richiesta, come un rapporto chiuso: nel titolo «CASE K9-7UQ8», dentro l'ossigeno e CONTINUE.</p>
        <p>Costo: i due casi non hanno lo stesso peso, e la chiamata nuova resta senza numero: «come differenziamo i due kepler-9» resta risolto a metà.</p>`,
      frames: heldFrames('strip'),
    },
  ],
};

const ARCH = [
  { code: SAMPLE, ending: 'right', sent: c.emergencyCode, asked: 2, left: 3 * MIN + 12000 },
  { code: 'K9-M3XD', ending: 'wrong', sent: '227', asked: 1, left: 5 * MIN + 40000 },
  { code: 'K9-R6TW', ending: 'timeout', sent: null, asked: 2, left: 0 },
  { code: 'K9-4HKE', ending: 'right', sent: '355', asked: 2, left: 48000 },
];
const archView = (style, open = null) => chosen({ flow: 'live', stage: -1, state: liveState(-1), archive: { style, cases: ARCH, open } });
const ARCHIVE = {
  id: 'archive', title: 'L\'archivio dei casi chiusi',
  redo: '«you did it again... mi hai messo il pulsante new game... è VIETATO, cosa devo fare per farti capire che è la console di mission control» · «per l\'archivio, l\'idea è che nella home ci sia solo al centro una finestra, tipo un inbox che gestisce i casi, e abbiamo i casi aperti e in arrivo, un archivio... [...] vorrei un mock dettagliato su cosa succede dopo aver cliccato su un caso, come e cosa si apre» (continua nelle tavole «La console vuota: i casi aperti e in arrivo» e «L\'archivio: cosa si apre toccando un caso»)',
  quote: '«sarebbe interessante una history dei casi svolti, sotto forma di archivio consultabile, così regge anche il ci sono più test che avvengono»',
  context: 'La mia posizione: sì, nella forma A. Perché: la console vuota oggi ha una sola finestra, e un elenco di casi chiusi la fa sembrare una console che lavora da tempo, che è quello che serve all\'idea dei più test; e costa poco, perché di un caso basta tenere il numero, l\'esito, il codice inviato e le domande fatte: tutto il resto si rigenera dal numero. Il costo vero è un altro: su un dispositivo condiviso (il festival) il gruppo dopo vede i casi di chi c\'era prima, con l\'esito e la soluzione. Non rovina niente, perché ogni caso è diverso, ma va deciso se l\'archivio si può svuotare e da dove. Come l\'ho letta: entrano in archivio i casi finiti (codice accettato, codice rifiutato, ossigeno finito); quelli chiusi dal tasto di accensione no, come dice già la sua conferma («Case K9-7UQ8 will be lost.»). Aprendo un caso si rivede la schermata della soluzione che c\'è già (terzo riquadro), con un modo per tornare alla console. Parole: «ARCHIVE» è nuova, ed è la tua; gli esiti sono i titoli delle schermate finali («CODE ACCEPTED», «CODE REJECTED», «OXYGEN DEPLETED»).',
  dirs: [
    {
      key: 'list', title: 'A · Una finestra con l\'elenco', rec: true,
      note: `<p>Sul laptop sta a sinistra della richiesta, dove durante il caso c'è la finestra CASE; sul telefono sotto la richiesta. Una riga per caso, scritta come gli allegati di NOVA: il numero e l'esito. Toccandola si apre la soluzione di quel caso.</p>
        <p>Perché: è compatta (venti casi stanno in una finestra che scorre) e usa un pezzo che c'è già, la riga di testo che si tocca. Costo: dell'esito si vede solo una parola finché non apri il caso.</p>`,
      frames: [
        cap('Laptop: la console vuota con l\'archivio', laptop(archView('list'), { cls: BASE, big: true })),
        cap('Telefono', phone(archView('list'), { cls: BASE })),
        cap('Laptop: un caso riaperto dall\'archivio', laptop(chosen({ state: { ...base(), phase: 'solution', sentCode: c.emergencyCode, log: [{ q: hatchQ, ans: 'yes' }] }, flowHome: true }), { cls: BASE, big: true })),
      ],
    },
    {
      key: 'files', title: 'B · Un fascicolo per caso, a strisce',
      note: `<p>A destra della richiesta, dove durante il caso stanno i rapporti: ogni caso è una striscia chiusa, come un rapporto chiuso. Aperta, mostra la sua scheda (esito, codice inviato, domande usate, ossigeno rimasto) e SEE WHAT HAPPENED, che porta alla soluzione.</p>
        <p>Costo: quattro o cinque casi riempiono la colonna e poi si scorre; la scheda ha un'etichetta nuova da approvare («STATUS_»; «CODE_» e «OXYGEN_» sono quelle degli appunti, «QUESTIONS_» viene dalla finestra QUESTIONS).</p>`,
      frames: [
        cap('Laptop: la console vuota, un fascicolo aperto', laptop(archView('files', SAMPLE), { cls: BASE, big: true })),
        cap('Telefono', phone(archView('files', SAMPLE), { cls: BASE })),
      ],
    },
  ],
};

const ftFrames = (cls) => [
  fbL('Laptop: appunti del caso e due rapporti aperti', cls, { tab: 'briefing', openReports: c.order.slice(0, 2) }),
  cap('Telefono: i rapporti aperti (scorre)', phone(fbView({ tab: 'reports', openReports: c.order }), { cls: `${BASE} ${cls}` })),
  cap('Telefono: il codice', phone(fbView({ tab: 'code' }), { cls: `${BASE} ${cls}` })),
  cap('Telefono: la scheda di un membro', phone(fbView({ tab: 'reports', profile: c.order[0] }), { cls: `${BASE} ${cls}` })),
];
const TEXTFONT = {
  id: 'textfont', title: 'Il font dei testi lunghi: rapporti, appunti, frasi', decided: 'A, tutto nel mono della console', chosen: 'a', answer: 'Tutto nel mono della console',
  quote: '«me ne sono accorto solo ora, ma oltre al mono, e al font dei titoli, abbiamo un font che ci azzecca poco con una console, e viene usata nei report e nel briefing»',
  context: 'Il terzo font è IBM Plex Sans, quello dei testi da leggere: i rapporti dei tre umani, gli appunti del caso, la frase sopra il campo del codice, le schede del personale («Anche il test dei profili dei membri è col font sbagliato», 2026-11-25: ultimo riquadro), le schermate finali e la soluzione. La mia posizione: A. Su una console i testi arrivano tutti dallo stesso terminale, e i font scendono da tre a due. Il costo: il mono è più largo, quindi i rapporti si allungano di una o due righe; e oggi il rapporto di ECHO-7 si riconosce dagli umani proprio perché è l\'unico in mono: con A si riconosce solo da come scrive. Se invece vuoi che i rapporti tengano una voce diversa da quella della console, ma più adatta di oggi, servono font nuovi da scaricare: dimmelo e porto dei candidati in un altro giro.',
  dirs: [
    { key: 'now', title: 'Oggi · IBM Plex Sans per i testi lunghi', note: '<p>Per confronto.</p>', frames: ftFrames('ft-0') },
    {
      key: 'a', title: 'A · Tutto nel mono della console', rec: true,
      note: `<p>Rapporti, appunti e frasi in IBM Plex Mono, lo stesso di NOVA e delle etichette, a 14 px come la chat. Il font dei titoli resta per titoli, nomi e cifre.</p>`,
      frames: ftFrames(''),
    },
  ],
};

// ---------- after the feedback of 2026-11-25, third set: the home title, the title of an ending, the code ----------

const titleView = (homeTitle) => chosen({ flow: 'live', stage: -1, state: liveState(-1), homeTitle });
const outBtn = (out) => `<button type="button" class="replay" data-replay="titleout" data-out="${out}">Guarda l'uscita</button>`;
const titleFrames = (k, out = '') => [
  cap('Laptop: la console vuota', `${laptop(titleView(k), { cls: BASE, big: true })}${out ? outBtn(out) : ''}`),
  cap('Telefono', `${phone(titleView(k), { cls: BASE })}${out ? outBtn(out) : ''}`),
];
const HOMETITLE = {
  id: 'hometitle', title: 'Il titolo MISSION CONTROL sulla console vuota',
  quote: '«come questo titolo serve all\'inizio nella home, MISSION CONTROL, magari su due righe, responsive, quando si preme accept, il titolo fades away (coerentemente con uno schermo)» · «va ridotta l\'interlinea di Mission Control»',
  context: 'Corretta il 2026-11-26: l\'interlinea è ridotta di un quarto (da 0,95 a 0,72 volte l\'altezza del carattere), in tutte e due le versioni. Resta da scegliere fra una riga e due. Il titolo è quello che avevano i finali («OXYGEN DEPLETED»): stesso carattere, stesse lettere sdoppiate, e sul laptop la stessa grandezza (lettere da 146 px). Una sola differenza, mia: qui la frangia è ciano e non rossa, perché nei finali il rosso dice che è andata male. È anche il titolo della carta missione del gruppo («KEPLER-9 / MISSION CONTROL»). Sta sopra la richiesta di NOVA, e i due insieme sono al centro dello schermo. Come se ne va quando accetti è nella tavola dopo. La mia posizione: A, perché su uno schermo largo una riga sola lascia la richiesta di NOVA più vicina al centro; sul telefono le due versioni sono uguali.',
  dirs: [
    {
      key: 'one', title: 'A · Una riga sul laptop, due sul telefono', rec: true,
      note: '<p>Su uno schermo largo sta su una riga, larga quanto il titolo dei finali. Sotto i 700 px va su due righe e le lettere crescono fino a riempire la larghezza (78 px su questo telefono).</p>',
      frames: titleFrames('one'),
    },
    {
      key: 'two', title: 'B · Sempre su due righe',
      note: `<p>«MISSION» sopra, «CONTROL» sotto, anche sul laptop, con lettere un po' più grandi (166 px).</p>
        <p>Costo: sul laptop il titolo prende quasi metà dell'altezza e la richiesta di NOVA scende sotto il centro.</p>`,
      frames: titleFrames('two'),
    },
  ],
};
const TITLEOUT = {
  id: 'titleout', title: 'Come se ne va il titolo quando accetti', rejected: '«non mi piacciono gli effetti di uscita»',
  quote: '«quando si preme accept, il titolo fades away (coerentemente con uno schermo)»',
  context: 'Due modi in cui uno schermo a tubo spegne una scritta; premi il pulsante sotto il riquadro per vederli (dopo un secondo e mezzo il titolo torna, per riprovare). Durano mezzo secondo. Nel gioco, mentre il titolo se ne va, la finestra di NOVA scivola al suo posto al centro, come fa già oggi. La mia posizione: A, perché è il contrario esatto di come si aprono le finestre, che nascono da una riga di luce. Non le ho viste a velocità vera: nel mio browser le animazioni vanno a scatti.',
  dirs: [
    { key: 'line', title: 'A · Si chiude in una riga di luce', rec: true, note: '<p>Il titolo si schiaccia in una riga chiara, che poi si stringe fino a un punto e sparisce: uno schermo che si spegne.</p>', frames: titleFrames('one', 'to-line').slice(0, 1) },
    { key: 'dark', title: 'B · Sfarfalla e si spegne', note: '<p>Il titolo resta dov\'è e perde luce a scatti, come un tubo che cede, fino al buio.</p><p>Costo: per mezzo secondo sembra un guasto, e il guasto in questo gioco è un\'altra cosa (l\'ultimo minuto, i finali).</p>', frames: titleFrames('one', 'to-dark').slice(0, 1) },
  ],
};
const endView = (ending, endOld = true) => chosen({ endOld, state: { ...base(), phase: 'ending', ending, sentCode: ending === 'timeout' ? null : ending === 'right' ? c.emergencyCode : '255' } });
const endFrames = (cls) => [
  cap('Laptop: ossigeno finito', laptop(endView('timeout'), { cls: `${BASE} emergency ${cls}`, big: true })),
  cap('Telefono: ossigeno finito', phone(endView('timeout'), { cls: `${BASE} emergency ${cls}` })),
  cap('Laptop: codice accettato', laptop(endView('right'), { cls: `${BASE} ${cls}`, big: true })),
];
const ENDTITLE = {
  id: 'endtitle', title: 'Il titolo dei finali', decided: 'B, senza titolone', chosen: 'none',
  answer: '«io direi senza titolone, altrimenti in quella schermata abbiamo troppi titoli: possiamo usare il titolone come titolo della scheda, non scriverei nova, perché nova ci comunica solo da terminale, in quel caso sarebbe meglio case closed o mission success/successful» · «alla fine del gioco direi case k9-7uq8 e poi l\'esito, quindi mission failed o altro»',
  quote: '«il titolone non sono sicuro se lo teniamo, se sì però, lo vedrei un po\' più piccolo?»',
  context: 'La mia posizione: tenerlo, più piccolo (A). Tenerlo perché, se la console si apre con il titolo MISSION CONTROL, il finale chiude con un titolo della stessa famiglia, ed è l\'unico punto in cui l\'esito si legge da lontano, attorno a un tavolo. Più piccolo perché oggi sul laptop le lettere sono alte 146 px e schiacciano la finestra che dice cosa è successo. Qui cambia solo la grandezza: le parole dei riquadri sono quelle di oggi («CRITICAL ERROR», «SYSTEM FAILURE», «SEE WHAT HAPPENED»), le proposte per cambiarle te le scrivo in chat.',
  dirs: [
    { key: 'now', title: 'Oggi · Lettere da 146 px sul laptop, 54 sul telefono', note: '<p>Per confronto.</p>', frames: endFrames('').slice(0, 2) },
    {
      key: 'small', title: 'A · Più piccolo, circa la metà', rec: true,
      note: '<p>Lettere da 78 px sul laptop (poco più della metà) e da 34 sul telefono. Resta la cosa più grande dello schermo, ma la finestra sotto sale verso il centro.</p><p>Costo: sarebbe più piccolo del titolo MISSION CONTROL della console vuota, che nella tavola sopra ha la grandezza di oggi (146 px sul laptop).</p>',
      frames: endFrames('et-small'),
    },
    {
      key: 'none', title: 'B · Senza titolone',
      note: '<p>Resta solo la finestra, con l\'esito nelle sue righe.</p><p>Costo: da lontano «ossigeno finito» e «codice rifiutato» si distinguono solo leggendo; e l\'esito andrebbe portato nel titolo della finestra, con parole da decidere.</p>',
      frames: endFrames('et-none').slice(0, 2).concat([
        cap('Nel gioco dal 2026-11-26: il caso nella linguetta, poi l\'esito', laptop(endView('timeout', false), { cls: `${BASE} emergency`, big: true })),
        cap('Nel gioco: codice accettato', laptop(endView('right', false), { cls: BASE, big: true })),
      ]),
    },
  ],
};
const codeState = (s = {}) => liveState(8, { tab: 'code', codeInput: '35', openReports: c.order.slice(0, 2), ...s });
const codeView = (codeAlt, s = {}) => chosen({ flow: 'live', stage: 8, state: codeState(s), remainingMs: 4 * MIN + 12000, codeAlt });
const codeFrames = (alt) => [
  cap('Laptop: tasto CODE premuto, due rapporti aperti', laptop(codeView(alt), { cls: `${BASE} code-${alt || 'now'}`, big: true })),
  cap('Telefono: tasto CODE premuto', phone(codeView(alt), { cls: `${BASE} code-${alt || 'now'}`, scroll: alt ? 'bottom' : '' })),
  cap('Laptop: la conferma', laptop(codeView(alt, { codeInput: '355', confirming: true }), { cls: `${BASE} code-${alt || 'now'}`, big: true })),
];
const CODEPLACE = {
  id: 'codeplace', title: 'Il codice: dove sta e come si scrive',
  over: '«per il codice, propongo che sia un\'opzione vicino a new question, code, così si invia a nova il codice che procede a bloccare [...] quello che non mi convince è che per il codice abbiamo pulsante rosso, per le domande un pulsante nel terminale con nova... è strano e incoerente» (continua nella tavola «Il codice si manda a NOVA, e il caso si chiude»)',
  quote: '«Io questa finestra forse la metterei a destra sotto i report, quindi se avrò i report aperti [...] indipendentemente dal fatto che i report siano aperti o chiusi, mi compare alla fine e scrolla quella colonna fino verso il basso, no? E quindi compare il code lì e posso consultare l\'ID ed è più facile così.» · «Il campo di testo per inserire il codice, al posto di una casella di input, secondo me ha senso un formato da terminale, come se noi lo stessimo inviando via terminale.»',
  context: 'La mia posizione: A, le tue due idee insieme. Il codice sta in fondo alla colonna dei rapporti e si scrive su una riga di terminale: «MC>», le tre cifre in ambra, il cursore. Nelle due proposte il tasto CODE non toglie più la mappa da sinistra. Le parole sono tutte quelle di oggi («EMERGENCY CODE», «SEND CODE», «One attempt.», «Send code 355? There is only one attempt.»): i nomi nuovi te li propongo in chat, qui guardi solo posto e forma. Nei riquadri il codice è a metà («35») e poi alla conferma.',
  dirs: [
    { key: 'now', title: 'Oggi · A sinistra al posto della mappa, in una casella', note: '<p>Per confronto.</p>', frames: codeFrames('').slice(0, 2) },
    {
      key: 'side', title: 'A · A destra, in fondo ai rapporti, su una riga di terminale', rec: true,
      note: `<p>Premendo CODE la finestra compare in fondo alla colonna dei rapporti, aperti o chiusi che siano, e la colonna scende fino a lei: gli ID restano lì sopra. Sul telefono CODE apre i rapporti già scesi in fondo, con il codice sotto l'ultimo.</p>
        <p>Perché: il codice è fatto di un numero di rapporto e di un ID, e tutti e due si leggono in quella colonna. Costo: con quattro rapporti aperti, per rileggere il primo mentre scrivi devi risalire.</p>`,
      frames: codeFrames('side'),
    },
    {
      key: 'chat', title: 'B · Nella conversazione con NOVA',
      note: `<p>Questa è una lettura mia di «come se noi lo stessimo inviando via terminale»: il terminale da cui Mission Control manda le cose è la conversazione con NOVA, quindi CODE apre lì la riga del codice, dove si scrivono già le domande. NOVA ripete la regola e sotto c'è la riga «MC>».</p>
        <p>Costo: non è a destra come avevi detto; sul laptop gli ID restano in vista nella colonna accanto, sul telefono no.</p>`,
      frames: codeFrames('chat'),
    },
  ],
};

// ---------- after the feedback of 2026-11-26: the cases of the console, the code to NOVA, how things come and go ----------

// a closed case as the console keeps it; the sample case is the first, and the one opened in the boards
const LOG2 = [{ q: hatchQ, ans: answer(c, hatchQ) }, { q: { kind: 'motion', what: 'K', a: 40, b: 50 }, ans: answer(c, { kind: 'motion', what: 'K', a: 40, b: 50 }) }];
const c2 = generateCase(NEXT);
const Q2 = { kind: 'hatch', what: 'N-K', a: 20, b: 30 };
const REC = {
  right: { code: SAMPLE, ending: 'right', sent: c.emergencyCode, asked: 1, left: 3 * MIN + 12000, log: LOG2.slice(0, 1) },
  wrong: { code: SAMPLE, ending: 'wrong', sent: '227', asked: 1, left: 3 * MIN + 12000, log: LOG2.slice(0, 1) },
  timeout: { code: SAMPLE, ending: 'timeout', sent: null, asked: 2, left: 0, log: LOG2 },
};
const ARCH2 = [
  REC.right,
  { code: NEXT, ending: 'wrong', sent: '227', asked: 1, left: 5 * MIN + 40000, log: [{ q: Q2, ans: answer(c2, Q2) }] },
  { code: 'K9-R6TW', ending: 'timeout', sent: null, asked: 2, left: 0 },
  { code: 'K9-4HKE', ending: 'right', sent: '355', asked: 2, left: 48000 },
];
const CALL = { code: 'K9-W2PB' };
const OPENCASE = { code: SAMPLE, remainingMs: 7 * MIN + 42000 };

// the home with the cases of the console (the title as in the board "hometitle", one line on a laptop)
const homeV = (cases, extra = {}) => chosen({ flow: 'live', stage: -1, state: liveState(-1), homeTitle: 'one', cases, ...extra });
const homeL = (label, cases, extra = {}) => cap(label, laptop(homeV(cases, extra), { cls: BASE, big: true }));
const homeP = (label, cases, extra = {}, opts = {}) => cap(label, phone(homeV(cases, extra), { cls: BASE, ...opts }));

const INBOX = {
  id: 'inbox', title: 'La console vuota: i casi aperti e in arrivo, e l\'archivio a parte',
  quote: '«per l\'archivio, l\'idea è che nella home ci sia solo al centro una finestra, tipo un inbox che gestisce i casi, e abbiamo i casi aperti e in arrivo, un archivio... non lo so come organizzare, però volevo il caso aperto e il caso in arrivo insieme, e poi archivio separato» · «B · Il caso aperto ridotto a striscia > perfetto, però mi chiedo se accept sia il termine più adatto»',
  context: 'Sviluppo la tua idea: una finestra sola al centro con i casi vivi (quello aperto e quello che sta chiamando), e l\'archivio separato. Ogni caso porta il suo numero, anche quello in arrivo: il numero nasce prima di ACCEPT. Sopra c\'è il titolo MISSION CONTROL (qui su una riga; la scelta fra una e due righe è nella sua tavola). La mia posizione: A, perché è l\'idea come l\'hai detta e i due casi diventano due righe della stessa lista. Ha un costo che devi vedere: la striscia che avevi trovato «perfetta» diventa una riga, e il nome «NOVA ON KEPLER-9» lascia la console vuota (torna quando accetti, sulla sua conversazione). B tiene invece tutti i pezzi di oggi così come sono; è una variante mia. Parole nuove da approvare: «CASES» (titolo della finestra, da «CASE») e «ARCHIVE» (tua). ACCEPT è ancora la parola di oggi: le alternative te le scrivo in chat. In tutte e tre, per ora, accettando un caso nuovo quello aperto resta dov\'è con l\'ossigeno che scende (non si perde più): è da decidere, lo trovi nelle domande in chat.',
  dirs: [
    {
      key: 'tabs', title: 'A · Una finestra, CASES; l\'archivio è la sua seconda vista', rec: true,
      note: `<p>Una finestra al centro, «CASES»: una riga per il caso aperto (numero, ossigeno, CONTINUE) e una per il caso in arrivo (numero, INCOMING TRANSMISSION, ACCEPT, e sotto la prima frase di NOVA). In alto a destra, nella stessa finestra, «ARCHIVE · 4»: toccandolo la finestra mostra l'archivio, e al suo posto compare «CASES» per tornare. Se l'archivio è vuoto la voce non c'è.</p>
        <p>Perché: una finestra sola, e l'archivio resta separato senza occupare posto. Costo: per vedere l'archivio serve un tocco; la finestra non si chiama più «NOVA ON KEPLER-9».</p>`,
      frames: [
        homeL('Laptop: un caso aperto e uno in arrivo', { style: 'tabs', open: OPENCASE, incoming: CALL, archive: ARCH2 }),
        homeP('Telefono', { style: 'tabs', open: OPENCASE, incoming: CALL, archive: ARCH2 }),
        homeL('Laptop: la prima volta, solo il caso in arrivo', { style: 'tabs', incoming: CALL, archive: [] }),
        homeL('Laptop: toccato ARCHIVE · 4', { style: 'tabs', tab: 'archive', open: OPENCASE, incoming: CALL, archive: ARCH2 }),
        homeP('Telefono: l\'archivio', { style: 'tabs', tab: 'archive', open: OPENCASE, incoming: CALL, archive: ARCH2 }),
      ],
    },
    {
      key: 'stack', title: 'B · I pezzi di oggi in colonna: la striscia, la chiamata, l\'archivio come striscia',
      note: `<p>Questa è una variante mia. Al centro restano la striscia del caso aperto, così come l'hai approvata, e sotto la chiamata di NOVA nella sua finestra di oggi. L'archivio è una terza striscia in fondo, «ARCHIVE», con il numero dei casi e il +: si apre sul posto, come un rapporto.</p>
        <p>Perché: nessun pezzo cambia, e la finestra della chiamata è la stessa che dopo ACCEPT diventa la conversazione. Costo: le finestre al centro sono tre e non una, quindi non è «solo al centro una finestra»; il caso in arrivo non mostra il suo numero; e con l'archivio aperto la colonna è più alta dello schermo e si scorre (terzo riquadro).</p>`,
      frames: [
        homeL('Laptop: un caso aperto e uno in arrivo, archivio chiuso', { style: 'stack', archive: ARCH2 }, { saved: HELD }),
        homeP('Telefono', { style: 'stack', archive: ARCH2 }, { saved: HELD }),
        homeL('Laptop: l\'archivio aperto', { style: 'stack', archive: ARCH2, fold: true }, { saved: HELD }),
      ],
    },
    {
      key: 'key', title: 'C · L\'archivio su un tasto della barra',
      note: `<p>Al centro solo i casi vivi, come in B. L'archivio è un tasto della console, «ARCHIVE», accanto a BRIEFING e MAP: acceso solo a console vuota, mette l'archivio al centro dello schermo; ripremuto, tornano i casi.</p>
        <p>Perché: è la separazione più netta, e sulla console i tasti scelgono già cosa c'è sullo schermo. Costo: un tasto in più sulla barra, che sul telefono ne ha già cinque e va su due file (ultimo riquadro); e durante un caso resta spento.</p>`,
      frames: [
        homeL('Laptop: i casi, il tasto ARCHIVE sulla barra', { style: 'key', archive: ARCH2 }, { saved: HELD, archiveKey: true }),
        homeL('Laptop: tasto ARCHIVE premuto', { style: 'key', tab: 'archive', archive: ARCH2 }, { saved: HELD, archiveKey: true }),
        homeP('Telefono: tasto ARCHIVE premuto', { style: 'key', tab: 'archive', archive: ARCH2 }, { saved: HELD, archiveKey: true }),
      ],
    },
  ],
};

// ---------- the code is sent to NOVA, and the case closes ----------

const READBACK = `Report ${String(c.order.indexOf(c.sab) + 1).padStart(2, '0')}: false. Saboteur: ${PEOPLE[c.sab].name}, ID ${PEOPLE[c.sab].id}.`;
const REPLY = {
  right: [ENDINGS.right.lines[0], READBACK, ...ENDINGS.right.lines.slice(1)],
  wrong: ENDINGS.wrong.lines,
  timeout: ENDINGS.timeout.lines,
};
const LOG1 = LOG2.slice(0, 1);
const flowV = (s = {}, extra = {}) => chosen({ flow: 'live', stage: 8, state: liveState(8, { openReports: [], log: LOG1, ...s }), remainingMs: 3 * MIN + 12000, codeAlt: 'nova', noCodeKey: true, ...extra });
const flowL = (label, s, extra, cls = '') => cap(label, laptop(flowV(s, extra), { cls: `${BASE} ${cls}`, big: true }));
const flowP = (label, s, extra, cls = '') => cap(label, phone(flowV(s, extra), { cls: `${BASE} ${cls}`, scroll: 'bottom' }));
const sentS = (kind) => ({ codeStep: 3, sentCode: REC[kind].sent, codeInput: REC[kind].sent || '' });
const closedV = (kind, cases = {}) => chosen({ flow: 'live', stage: -1, state: liveState(-1), noCodeKey: true, cases: { only: true, last: REC[kind], ...cases } });
const closedL = (label, kind, cases, cls = '') => cap(label, laptop(closedV(kind, cases), { cls: `${BASE} ${cls}`, big: true }));
// the closing, played: the windows go out one after the other, then the file of the case comes
const closing = cap('Laptop: la chiusura, da guardare', `${laptop(flowV(sentS('right'), { reply: REPLY.right }), { cls: BASE, big: true })}<template>${laptop(closedV('right'), { cls: BASE, big: true })}</template><button type="button" class="replay" data-replay="closing">Guarda la chiusura</button>`);
const CODEFLOW = {
  id: 'codeflow', title: 'Il codice si manda a NOVA, e il caso si chiude',
  quote: '«per il codice, propongo che sia un\'opzione vicino a new question, code, così si invia a nova il codice che procede a bloccare, però questa parte della storia non viene raccontata, e sarebbe utile che nova riceve il codice e dice ok procedo a bloccare l\'accesso di x e bla bla bla, infine si chiude tutto e arriva case closed, poi arriva nuovo caso sempre da nova per nuova missione... (una sorta di play again) > quello che non mi convince è che per il codice abbiamo pulsante rosso, per le domande un pulsante nel terminale con nova... è strano e incoerente» · «io direi senza titolone [...] non scriverei nova, perché nova ci comunica solo da terminale» · «alla fine del gioco direi case k9-7uq8 e poi l\'esito, quindi mission failed o altro»',
  context: 'Sviluppo la tua proposta, un momento alla volta. Il codice parte dalla conversazione con NOVA, come una domanda: accanto a NEW QUESTION c\'è CODE, rosso come era il tasto. Il codice si scrive sulla riga «MC>» (il formato da terminale che avevi chiesto), e «SEND CODE» ora dice a chi: lo mandi a NOVA, nella sua conversazione. NOVA risponde lì, con le frasi che oggi stanno nella schermata finale; poi le finestre si spengono una dopo l\'altra, nell\'ordine inverso a quello in cui sono arrivate, e al centro arriva il fascicolo del caso: nella linguetta «CASE K9-7UQ8», sotto l\'esito («MISSION SUCCESSFUL» o «MISSION FAILED»), poi codice, domande e ossigeno, il segno «CASE CLOSED» e INCIDENT REPORT. Dopo qualche secondo, sotto arriva la chiamata nuova. Non ci sono più la schermata finale a parte né il titolone. Cose che la tua frase non diceva e che ho chiuso così, da correggere se non tornano: mentre scrivi il codice c\'è CANCEL per tornare alle domande (prima bastava ripremere il tasto); quando le domande sono finite resta solo CODE; se finisce l\'ossigeno NOVA scrive da sola le sue ultime frasi e il caso si chiude allo stesso modo. Testi: sono tutti quelli di oggi tranne quattro, da approvare. «Code», la riga che resta nella conversazione quando tocchi CODE (come «New question»). «CASE CLOSED». Le parole dopo le cifre nel fascicolo, prese dai titoli dei finali e dalle frasi sulle domande: «Accepted», «Rejected», «Depleted», «Not sent», «1 of 2 sent». E la riga in cui NOVA dice chi blocca, che ho ricavato dalle due parti del codice: «Report 04: false. Saboteur: Doyun Park, ID 27.» È una bozza: le frasi di NOVA dopo il codice appartengono alla storia e le scrive la sessione che ce l\'ha, insieme al nome del codice. Con l\'esito scritto in alto nel fascicolo, l\'ultima frase di NOVA («MISSION STATUS: SUCCESS.») lo dice due volte: anche questo va a quella sessione. La chiusura si può guardare nel riquadro «la chiusura, da guardare»; gli altri riquadri sono fermi.',
  common: [
    flowL('1 · Laptop: accanto a NEW QUESTION c\'è CODE; sulla barra il tasto rosso non c\'è', {}),
    flowL('2 · Toccato CODE: NOVA ripete la regola, il codice si scrive sulla riga MC', { codeStep: 1, codeInput: '42' }),
    flowL('3 · SEND CODE: la conferma', { codeStep: 1, codeInput: c.emergencyCode, confirming: true }),
    flowL('4 · Inviato: NOVA risponde nella conversazione, l\'ossigeno è fermo', sentS('right'), { reply: REPLY.right }),
    closing,
    closedL('5 · Tutto spento: arriva il fascicolo del caso', 'right'),
    closedL('6 · Poco dopo, sotto arriva la chiamata nuova', 'right', { only: false, style: 'tabs', incoming: CALL, archive: ARCH2 }),
    flowL('Codice sbagliato: la risposta di NOVA', sentS('wrong'), { reply: REPLY.wrong, remainingMs: 3 * MIN + 12000 }),
    closedL('Codice sbagliato: il fascicolo', 'wrong', {}, 'emergency'),
    flowL('Ossigeno finito: NOVA scrive da sola', { log: LOG2 }, { reply: REPLY.timeout, remainingMs: 0 }, 'emergency'),
    closedL('Ossigeno finito: il fascicolo', 'timeout', {}, 'emergency'),
    flowP('Telefono · 1: CODE accanto a NEW QUESTION', {}),
    flowP('Telefono · 2: il codice sulla riga MC', { codeStep: 1, codeInput: '42' }),
    flowP('Telefono · 4: NOVA risponde', sentS('right'), { reply: REPLY.right }),
    cap('Telefono · 5: il fascicolo del caso', phone(closedV('right'), { cls: BASE })),
    cap('Telefono · 6: la chiamata nuova sotto il fascicolo', phone(closedV('right', { only: false, style: 'tabs', incoming: CALL, archive: ARCH2 }), { cls: BASE })),
  ],
  dirs: [
    {
      key: 'nokey', title: 'A · Il tasto rosso CODE si toglie dalla barra', rec: true,
      note: `<p>È quello che vedi in tutti i riquadri qui sopra: il codice si manda solo dalla conversazione, come le domande. Sulla barra restano i tasti dei canali e l'accensione.</p>
        <p>Perché: toglie l'incoerenza che hai notato, una cosa si fa in un modo solo. Costo: la barra perde il suo oggetto più riconoscibile, il tasto rosso sotto la protezione a strisce, che avevi scelto il 2026-11-24.</p>`,
      frames: [],
    },
    {
      key: 'key', title: 'B · Il tasto rosso resta, e fa la stessa cosa',
      note: `<p>CODE c'è nella conversazione e anche sulla barra: premendo il tasto rosso si apre la stessa riga del codice nella conversazione con NOVA.</p>
        <p>Costo: restano due modi per fare la stessa cosa, e uno dei due è proprio quello che hai trovato incoerente con le domande.</p>`,
      frames: [cap('Laptop: CODE nella conversazione e sulla barra', laptop(flowV({}, { noCodeKey: false }), { cls: BASE, big: true }))],
    },
  ],
};

// ---------- the archive: what opens when a case is tapped ----------

const archL = (label, cases, extra = {}) => cap(label, laptop(chosen({ flow: 'live', stage: -1, state: liveState(-1), cases: { style: 'tabs', tab: 'archive', archive: ARCH2, ...cases }, ...extra }), { cls: BASE, big: true }));
const archP = (label, cases, opts = {}) => cap(label, phone(chosen({ flow: 'live', stage: -1, state: liveState(-1), cases: { style: 'tabs', tab: 'archive', archive: ARCH2, ...cases } }), { cls: BASE, ...opts }));
const readV = (s = {}) => chosen({ flow: 'live', stage: 8, state: liveState(8, { openReports: c.order.slice(3), log: LOG1, ...sentS('right'), ...s }), remainingMs: REC.right.left, codeAlt: 'nova', noCodeKey: true, reply: REPLY.right, archived: true });
const CASEFILE = {
  id: 'casefile', title: 'L\'archivio: cosa si apre toccando un caso',
  quote: '«per il design dell\'archivio... vorrei un mock dettagliato su cosa succede dopo aver cliccato su un caso, come e cosa si apre» · «you did it again... mi hai messo il pulsante new game... è VIETATO, cosa devo fare per farti capire che è la console di mission control»',
  context: 'Un tocco alla volta, in tre modi. L\'archivio qui è nella forma A della tavola sopra (la seconda vista della finestra dei casi); quello che succede dopo il tocco vale uguale se scegli B o C. In archivio entrano i casi chiusi: codice accettato, codice rifiutato, ossigeno finito. Ogni riga ha il numero del caso e l\'esito, come hai detto per la fine del caso («case k9-7uq8 e poi l\'esito»). La mia posizione: B. Il fascicolo che si apre dall\'archivio è la stessa finestra che arriva quando il caso si chiude (tavola «Il codice si manda a NOVA»): una cosa sola, che il gruppo ha già visto, nello stesso posto. Il rapporto sull\'incidente ha le cinque parti che ha oggi la soluzione: cosa è successo, i rapporti, la domanda che lo risolveva, il codice, le tue trasmissioni. Sul pulsante NEW GAME: nella tavola di prima c\'era perché avevo riusato la schermata della soluzione con la parola vecchia. Adesso nel gioco quella parola non c\'è più, e un controllo automatico fa fallire le verifiche se «game», «player» o «quit» compaiono in una schermata. Di un caso si tengono il numero, l\'esito, il codice inviato, le domande con le risposte e l\'ossigeno rimasto: tutto il resto si rigenera dal numero.',
  common: [
    archL('Per tutte: l\'archivio, una riga per caso', {}),
  ],
  dirs: [
    {
      key: 'in', title: 'A · La riga si apre sul posto, il rapporto in una finestra sopra',
      note: `<p>Toccando una riga, il + diventa − e sotto compare la scheda del caso: codice, domande, ossigeno, e INCIDENT REPORT. Le altre righe scendono. INCIDENT REPORT apre il rapporto in una finestra sopra lo schermo, come la scheda di un membro, con CLOSE.</p>
        <p>Perché: l'elenco resta sempre in vista e si possono confrontare due casi. Costo: il rapporto sta in una finestra sovrapposta, lunga, che sul telefono copre tutto.</p>`,
      frames: [
        archL('1 · Toccato «+ CASE K9-M3XD»: la scheda sotto la riga', { expand: NEXT }),
        archL('2 · INCIDENT REPORT: il rapporto in una finestra sopra', { expand: NEXT, modal: ARCH2[1], fileC: c2 }),
        archP('Telefono · 1', { expand: NEXT }),
      ],
    },
    {
      key: 'file', title: 'B · Il fascicolo prende il posto dell\'elenco', rec: true,
      note: `<p>Toccando una riga, la finestra dell'archivio diventa il fascicolo di quel caso: nella linguetta «CASE K9-M3XD», in alto a destra «ARCHIVE» per tornare all'elenco, poi l'esito, la scheda e INCIDENT REPORT. Il rapporto si apre dentro il fascicolo, sotto la scheda, e la finestra scorre; il − in fondo lo richiude.</p>
        <p>Perché: è la stessa finestra della fine del caso, quindi non c'è niente di nuovo da imparare. Costo: per passare da un caso all'altro si torna all'elenco.</p>`,
      frames: [
        archL('1 · Toccato «+ CASE K9-M3XD»: il fascicolo al posto dell\'elenco', { file: ARCH2[1], fileC: c2 }, {}),
        archL('2 · INCIDENT REPORT: il rapporto si apre dentro il fascicolo', { file: ARCH2[1], fileC: c2, report: true }),
        archP('Telefono · 1', { file: ARCH2[1], fileC: c2 }),
        archP('Telefono · 2 (scorre)', { file: ARCH2[1], fileC: c2, report: true }),
        archL('Un caso riuscito', { file: REC.right, fileC: c }),
      ],
    },
    {
      key: 'console', title: 'C · Il caso si riapre sulla console, da leggere',
      note: `<p>Toccando una riga la console si riempie com'era alla fine di quel caso, tutta in una volta e ferma: al centro la conversazione con NOVA, con le domande, le risposte e il codice; a destra i quattro rapporti, che si aprono; a sinistra domande e ossigeno fermi, e sotto, dove durante il caso c'è la mappa, il rapporto sull'incidente (MAP e BRIEFING rimettono lì la mappa e gli appunti). Il tasto di accensione riporta all'archivio.</p>
        <p>Perché: il rapporto dice chi ha mentito, e qui lo leggi con i rapporti e la mappa accanto. Costo: è la più lunga da costruire; sul telefono il rapporto è un canale in più, quindi un tasto in più sulla barra; e un caso chiuso somiglia molto a uno aperto.</p>`,
      frames: [
        cap('Laptop: il caso K9-7UQ8 riaperto, il rapporto a sinistra', laptop(readV(), { cls: BASE, big: true })),
        cap('Telefono: il canale di NOVA', phone(readV(), { cls: BASE, scroll: 'bottom' })),
      ],
    },
  ],
};

// ---------- how a button comes ----------

const btnFig = (label, view, key, last = 0) => cap(label, `${phone(view, { cls: `${BASE} btnin-${key}`, scroll: last ? 'bottom' : '' })}<button type="button" class="replay" data-replay="btnin" data-last="${last}">Riguarda</button>`);
const btnFrames = (key) => [
  btnFig('La richiesta di NOVA: ACCEPT', chosen({ flow: 'live', stage: -1, state: liveState(-1) }), key),
  btnFig('Una domanda: i tasti dei 10 minuti', chosen({ flow: 'live', stage: 8, state: liveState(8, { askStep: 2, draft: { kind: 'hatch', what: 'M-K', a: null, b: null } }), remainingMs: 8 * MIN }), key, 2),
];
const BTNIN = {
  id: 'btnin', title: 'Come compaiono i pulsanti',
  quote: '«ma i pulsanti appaiono all\'improvviso? non hai pensato alle animazioni di entrata?» · prima, il 2026-11-25: «i pulsanti, e altri elementi che non sono testo, non devono avere effetto di battitura, concordi?»',
  context: 'No, non ci avevo pensato: li avevo solo tolti dalla battitura, come avevi chiesto, e così un pulsante compare di colpo quando la scrittura arriva a lui. Qui tre entrate, da guardare con «Riguarda» sotto ogni riquadro: la finestra si apre, il testo si scrive, e il pulsante arriva al suo turno. Durano un quarto di secondo; la cosa dopo aspetta che il pulsante sia arrivato, e i tasti di una stessa fila (i 10 minuti) arrivano uno dopo l\'altro, a 45 millesimi di distanza. Vale per i pulsanti, per i tasti di scelta e per il + e il − dei rapporti. La mia posizione: B, perché le finestre nascono già da una riga di luce e così tutto ciò che non è testo arriva nello stesso modo. Non le ho viste a velocità vera: nel mio browser le animazioni vanno a scatti.',
  dirs: [
    { key: 'a', title: 'A · Si accende', note: '<p>Il pulsante compare con due lampi brevi e poi resta acceso, come una spia.</p><p>Costo: il lampeggio è il segno che qui usiamo per le cose che chiedono attenzione (INCOMING TRANSMISSION, l\'ultimo minuto).</p>', frames: btnFrames('a') },
    { key: 'b', title: 'B · Si apre da una riga di luce, come le finestre', rec: true, note: '<p>Nasce da una riga chiara al centro, che si allarga in altezza fino alla forma del pulsante: la stessa entrata delle finestre, in piccolo.</p>', frames: btnFrames('b') },
    { key: 'c', title: 'C · La cornice si apre dal centro, poi il nome', note: '<p>La cornice si allarga dal centro verso i lati; quando è quasi aperta compare il nome.</p><p>Costo: è un movimento diverso da quello delle finestre, quindi le entrate diventano due.</p>', frames: btnFrames('c') },
  ],
};

// ---------- how the home title leaves, second round ----------

const exitFig = (label, out, isPhone = false) => cap(label, `<div class="mock-live ${isPhone ? 'is-phone' : ''}"><iframe src="./?demo=1&amp;title=one&amp;out=${out}" loading="lazy" title="${label}"></iframe></div><button type="button" class="replay" data-replay="accept">Guarda l'uscita</button>`);
const TITLEOUT2 = {
  id: 'titleout2', title: 'Come se ne va il titolo quando accetti, seconda prova',
  quote: '«quando si preme accept, il titolo fades away (coerentemente con uno schermo)» · «non mi piacciono gli effetti di uscita»',
  context: 'Le due uscite di prima erano effetti (la riga di luce, lo sfarfallio) e tu avevi scritto «fades away»: qui sono tre dissolvenze. Ogni riquadro è la console vera: premi ACCEPT dentro il riquadro, oppure «Guarda l\'uscita» sotto, che lo preme per te e poi riporta la richiesta. Così l\'uscita si vede insieme a quello che succede davvero in quel momento: la finestra di NOVA sale al suo posto mentre il titolo se ne va. La mia posizione: A, la dissolvenza semplice: è quello che avevi chiesto, e dura quanto lo spostamento della finestra. Non le ho viste a velocità vera: nel mio browser le animazioni vanno a scatti.',
  dirs: [
    { key: 'fade', title: 'A · Dissolvenza', rec: true, note: '<p>Il titolo perde luce in modo uniforme e sparisce in quattro decimi di secondo.</p>', frames: [exitFig('Laptop', 'fade'), exitFig('Telefono', 'fade', true)] },
    { key: 'glow', title: 'B · Persistenza: la luce cala subito, resta un alone', note: '<p>Come il fosforo di un tubo quando il segnale finisce: il bianco cala di colpo e resta la traccia ciano delle lettere, che si spegne in poco meno di un secondo.</p><p>Costo: dura il doppio, e per un attimo la traccia resta sotto la finestra di NOVA che sale.</p>', frames: [exitFig('Laptop', 'glow')] },
    { key: 'scan', title: 'C · Si dirada fra le righe dello schermo', note: '<p>Le lettere si assottigliano riga per riga, lungo le righe del monitor, fino a sparire: mezzo secondo.</p><p>Costo: è la più vicina a un effetto, quindi alla cosa che non ti è piaciuta.</p>', frames: [exitFig('Laptop', 'scan')] },
  ],
};

// ---------- what stays under the meters, in the left column ----------

const LIVELEFT = {
  id: 'liveleft', title: 'A sinistra, sotto timer e domande', decided: 'A, resta la mappa', chosen: 'map',
  answer: 'A · Resta la mappa > cambia alla mappa dai, così l\'utente vede che si può cambiare, e la mappa è più scenografica',
  quote: '«change layout della console di mission control, centrato nova, a sinistra mappa, a destra report, timer e domande, sopra la mappa, sempre colonna di sinistra»',
  context: 'La disposizione è già quella che hai scritto: NOVA al centro, i rapporti a destra, a sinistra timer e domande e sotto di loro la mappa. Resta un punto che la tua frase non dice: in quel posto, sotto timer e domande, oggi stanno anche gli appunti del caso (la finestra CASE, che si compila mentre NOVA scrive) e il codice, uno alla volta con i tasti BRIEFING, MAP e CODE. Ti chiedo solo cosa ci resta quando NOVA ha finito di scrivere. Finché scrive, in tutte e due ci sono gli appunti che si compilano.',
  dirs: [
    {
      key: 'map', title: 'A · Resta la mappa', rec: true,
      note: `<p>Quando NOVA ha finito, la mappa prende il posto degli appunti e resta lì. Gli appunti si riaprono con il tasto BRIEFING, il codice con CODE; chiudendoli torna la mappa.</p>
        <p>Perché: è quello che hai scritto, e durante l'indagine quello che si guarda di continuo è la mappa; gli appunti servono una volta. Costo: la finestra CASE sparisce da sola a fine briefing, senza che il giocatore tocchi niente.</p>`,
      frames: [liveL('NOVA ha finito: sotto timer e domande c\'è la mappa', 8, { tab: 'map' }), liveL('Tasto BRIEFING: gli appunti al suo posto', 8, { tab: 'briefing' })],
    },
    {
      key: 'notes', title: 'B · Restano gli appunti, la mappa con il tasto MAP',
      note: `<p>Come nello storyboard qui sopra: a fine briefing restano gli appunti del caso, e la mappa compare lì quando premi MAP.</p>
        <p>Perché: niente cambia da solo. Costo: per avere la mappa a sinistra serve un tasto, e per la maggior parte della partita in quel posto c'è un riassunto già letto.</p>`,
      frames: [liveL('NOVA ha finito: sotto timer e domande ci sono gli appunti', 8, { tab: 'briefing' }), liveL('Tasto MAP: la mappa al loro posto', 8, { tab: 'map' })],
    },
  ],
};

// ---------- how a window appears ----------

// the frames show the console full, with the case notes under the meters: the boards were judged that way, before the
// map took that place at the end of the briefing. The typed version (key 'type') shows both, the map first
const fxFrame = (key, label, s = { tab: 'briefing' }) => cap(label, `${laptop(chosen({ flow: 'live', stage: 8, state: liveState(8, s), remainingMs: 10 * MIN - 9000 }), { cls: `${BASE} fxin-${key}`, big: true })}<button type="button" class="replay" data-replay="winfx">Riguarda</button>`);
const fxDir = (key, title, note, rec = false) => ({
  key, title, rec, note,
  frames: key === 'type'
    ? [fxFrame(key, 'Laptop: mappa, rapporti, domande e ossigeno arrivano in fila (premi «Riguarda»)', {}), fxFrame(key, 'Laptop: lo stesso con gli appunti del caso (premi «Riguarda»)')]
    : [fxFrame(key, 'Laptop: la console si popola (premi «Riguarda»)')],
});
const WINFX = {
  id: 'winfx', title: 'Come compaiono le finestre', decided: 'D, con il testo digitato', chosen: 'type',
  answer: 'D · Si apre da una riga, poi il testo si stampa > il testo vorrei che sembri digitato, elementi come la barra di ossigeno non ha senso che abbia effetto digitato, ma che appaia da sinistra a destra come barra che si carica · per la comparsa della mappa, beh come un ologramma',
  quote: '«va definito effetto con cui appaiono le finestre» · «fai mock a+b per finestre» · «per la finestra a+b non mi piace come appare il testo...»',
  context: 'Secondo giro, sul testo. Leggo così: la finestra che si apre da una riga, vuota, resta; non va il modo in cui arriva quello che c\'è dentro, che in A + B sale di poco e si schiarisce. Con i nostri caratteri a pixel un testo che si sposta e sfuma si vede sgranato finché non si ferma, ed è un gesto da pagina web più che da console. Le tre prove nuove (D, E, F) tengono l\'apertura di A e cambiano solo l\'arrivo del testo, senza sfumare e senza spostarlo. Sotto restano le quattro del primo giro. Ogni riquadro rifà in tre secondi l\'arrivo di tutte le finestre in fila, per vederle una dopo l\'altra: nel gioco ognuna arriva quando NOVA la nomina. Con «riduci movimento» attivo nel sistema le finestre compaiono e basta. Nel mio browser le animazioni scorrono a scatti: ho controllato ogni prova fermandola a metà, non a velocità vera.',
  dirs: [
    fxDir('type', 'D, come l\'hai corretta · Si apre da una riga, poi il testo viene digitato', '<p>La finestra si apre vuota da una riga di luce. Poi quello che c\'è dentro arriva nell\'ordine in cui si legge: il titolo e i testi si scrivono lettera dopo lettera; la barra dell\'ossigeno e i tasselli delle domande si caricano da sinistra a destra; un ritratto compare quando la scrittura ci arriva. La mappa arriva come un ologramma: si accende l\'anello del proiettore, sale il fascio, la pianta sfarfalla sul pavimento, poi le stanze si alzano una dopo l\'altra e prendono il nome.</p><p>Mentre si scrive niente si sposta: ogni lettera ha già il suo posto, nascosta, e la finestra ha da subito la sua misura. Una finestra non ci mette mai più di un secondo e un decimo a riempirsi, anche se ha molto testo (un rapporto aperto si scrive più in fretta di un titolo). Il canale di NOVA qui resta fermo: nel gioco le sue righe si scrivono una alla volta mentre parla. Nel mio browser le animazioni scorrono a scatti: le ho controllate fermandole a metà, non a velocità vera.</p>'),
    fxDir('d', 'D · Si apre da una riga, poi il testo si stampa', '<p>La finestra si apre vuota come in A. Poi il titolo si scrive da sinistra e il contenuto esce riga dopo riga dall\'alto, a scatti netti, come quando un terminale stampa.</p><p>Perché: è lo stesso gesto del canale di NOVA, dove il testo arriva una riga alla volta, e degli appunti del caso che si compilano mentre lei scrive. Costo: dura circa otto decimi di secondo per finestra; una finestra alta (la mappa, un rapporto aperto) esce a fasce più grosse di una bassa.</p>', true),
    fxDir('e', 'E · Si apre da una riga, poi il testo si accende', '<p>La finestra si apre vuota come in A. Poi tutto il contenuto si accende in un colpo, molto chiaro, e torna al suo colore: lo stesso lampo con cui si apre la finestra.</p><p>Perché: è il più breve, circa sei decimi di secondo. Costo: sono due lampi di fila per ogni finestra.</p>'),
    fxDir('f', 'F · Si apre da una riga, poi una riga di luce scrive il testo', '<p>La finestra si apre vuota come in A. Poi una riga di luce scende dall\'alto al fondo della finestra e si lascia dietro il contenuto.</p><p>Perché: la riga che apre la finestra è la stessa che la riempie. Costo: è il più vistoso, e con più finestre in fila si vedono più righe che scendono insieme.</p>'),
    fxDir('a', 'A · Si apre da una riga', '<p>Una riga di luce al centro che si apre in altezza fino alla finestra intera, con un lampo che si spegne: un tubo che si accende.</p><p>Perché: è l\'effetto più da console, ed è lo stesso gesto per ogni finestra, grande o piccola.</p>', true),
    fxDir('ab', 'A + B · Si apre da una riga, poi arriva il contenuto', '<p>La finestra si apre da una riga di luce come in A, vuota; appena è aperta, quello che c\'è dentro sale di poco e si schiarisce come in B.</p><p>Costo: dura un po\' di più, circa sette decimi di secondo per finestra.</p><p>La tua risposta: «per la finestra a+b non mi piace come appare il testo...»</p>'),
    fxDir('b', 'B · Prima la cornice, poi il contenuto', '<p>Compare la cornice vuota, poi quello che c\'è dentro sale di poco e si schiarisce.</p><p>Costo: è il più morbido, e il meno «macchina».</p>'),
    fxDir('c', 'C · Si accende a scatti', '<p>La finestra lampeggia due volte prima di restare accesa, senza muoversi.</p><p>Costo: con cinque finestre in fila lo sfarfallio si nota molto.</p>'),
  ],
};

// ---------- the closed report ----------

const repcFrames = (closed) => {
  const v = (s) => chosen({ flow: 'live', stage: 8, state: liveState(8, s), remainingMs: 10 * MIN - 9000, repClosed: closed });
  return [
    cap('Telefono, tasto REPORTS: tutti chiusi', phone(v({ tab: 'reports', openReports: [] }), { cls: BASE })),
    cap('Telefono: il secondo aperto', phone(v({ tab: 'reports', openReports: c.order.slice(1, 2) }), { cls: BASE })),
    cap('Laptop: la colonna a destra, il primo aperto', laptop(v({ openReports: c.order.slice(0, 1) }), { cls: BASE, big: true })),
  ];
};
const REPCLOSED = {
  id: 'repclosed', title: 'Il rapporto chiuso', decided: 'A, una striscia con gli angoli smussati', chosen: 'bar',
  answer: 'A · Una striscia con gli angoli smussati > allinea il pulsante + a quello -, e rendili della stessa grandezza, quindi ingradisci la barra report se serve, così quando si espande, il + va al posto del -',
  quote: '«i report possono compattarsi, come finestrelle» · «immaginavo una cosa molto più compatta, con meno dettagli, es. solo report 1, report 2» · «per i report compressi è orrenda quella roba lì»',
  context: 'Leggo così: la finestra con la linguetta schiacciata in una riga non regge. La linguetta fa uno scalino su una striscia alta due dita, la coda a destra finisce a punta e il + ci sta stretto dentro. Tre modi di disegnarlo da capo, tutti con il solo nome («REPORT 02») e il segno + come avevi chiesto; il rapporto aperto non cambia (la finestra con la linguetta, la carta, il testo e il − in fondo a destra). In tutte tocchi la riga intera per aprirlo. Dopo la tua scelta, in A il + è lo stesso riquadro del − (30 px), a 14 px dal bordo destro e a 12 dal fondo, cioè dove sta il − nel rapporto aperto: aprendo, il segno resta nell\'angolo in basso a destra. Per farcelo stare la striscia è alta 54 px (era 43).',
  dirs: [
    { key: 'tab', title: 'Oggi · La linguetta in una riga', note: '<p>Quella che hai visto, per confronto.</p>', frames: repcFrames('tab').slice(0, 1) },
    {
      key: 'bar', title: 'A · Una striscia con gli angoli smussati', rec: true,
      note: `<p>Da chiuso il rapporto è un rettangolo con gli angoli smussati, senza linguetta: il nome a sinistra, il + a destra nel suo riquadro, uguale al − che lo richiude. La linguetta compare quando lo apri.</p>
        <p>Perché: è la stessa cura che hai dato a QUESTIONS («terrei come rettangoli con angoli smussati e basta»), resta una finestrella larga quanto i rapporti aperti, e il + sta a destra come gli altri pulsanti. Costo: aprendo, la forma cambia da striscia a finestra con linguetta.</p>`,
      frames: repcFrames('bar'),
    },
    {
      key: 'line', title: 'B · Una riga di testo, come gli allegati',
      note: `<p>Da chiuso il rapporto è una riga di terminale, «+ REPORT 02», senza cornice: la stessa scrittura degli allegati nel canale di NOVA. Passandoci sopra si sottolinea.</p>
        <p>Perché: è il più compatto, quattro rapporti chiusi stanno in quattro righe. Costo: da chiuso non è più una finestrella, e come cosa da toccare si nota meno.</p>`,
      frames: repcFrames('line'),
    },
    {
      key: 'chip', title: 'C · Solo la linguetta',
      note: `<p>Da chiuso resta la sola linguetta della finestra, staccata: il nome e il +. Aprendo, sotto la linguetta compare la finestra.</p>
        <p>Perché: la linguetta è l'etichetta della scheda, e una scheda chiusa mostra solo quella. Costo: a destra resta vuoto, e le linguette sono più strette dei rapporti aperti.</p>`,
      frames: repcFrames('chip'),
    },
  ],
};

// ---------- buttons with cut corners (done, to check) ----------

const BTN2 = {
  id: 'buttons2', title: 'I pulsanti con gli angoli smussati', done: 'angoli opposti smussati, hover senza testo nero, tasti di scelta coerenti',
  quote: '«il pulsante è rimasto con un design piatto, non come le nostre finestre, potremmo aggiungere gli angoli opposti smussati, e va risolto il hover che mostra testo nero. e poi è incoerente con i pulsanti per selezionare orario: lì terrei almeno il trasparentino ed effetto hover no?»',
  context: 'I pulsanti tengono le staffe ai lati che avevi scelto e prendono due angoli opposti smussati (in alto a sinistra e in basso a destra), come le finestre. Passandoci sopra si illuminano e le parole restano chiare: prima diventavano scure su ciano pieno. I tasti di scelta (gli intervalli di tempo, e ogni altro tasto piccolo) hanno lo stesso fondo trasparente, gli stessi angoli e la stessa risposta al puntatore; quello scelto resta pieno di ciano, come le cose selezionate altrove. I pulsanti stanno a destra della loro riga, il principale per ultimo, e la nota che li accompagna resta a sinistra («come regola generale i pulsanti a destra?»: sì, è dove li cerca il pollice sul telefono ed è dove hai messo ACCEPT). È solo nei mock: nel gioco lo porto quando mi dici che va bene. Passa il mouse sui pulsanti per vedere l\'effetto.',
  common: [
    cap('NEW QUESTION', phone(chosen({ state: d2state({ tab: 'ask', draft: { ...hatchQ, what: null }, askStep: 0 }), askUi: 'open' }), { cls: BASE })),
    cap('Gli intervalli di tempo', phone(chosen({ state: d2state({ tab: 'ask', draft: hatchQ, askStep: 2 }), askUi: 'open' }), { cls: BASE })),
    cap('SEND QUESTION', phone(chosen({ state: d2state({ tab: 'ask', draft: hatchQ, askStep: 3 }), askUi: 'open' }), { cls: BASE })),
    cap('SEND CODE, e la conferma', phone(chosen({ state: d2state({ tab: 'code', codeInput: '127', confirming: true }) }), { cls: BASE })),
  ],
  dirs: [],
};

// ---------- the map readout in the words of a console (done, texts to approve) ----------

const mapShot = (label, sel) => cap(label, phone(chosen({ state: d2state({ tab: 'map', mapSel: sel }) }), { cls: BASE }));
const MAPTEXT = {
  id: 'maptext', title: 'Sotto la mappa: le parole di una console', done: 'lettura a campi, testi da approvare',
  quote: '«"Logs every opening, with the time. Never who opened it." so lame non scriverlo così scrivilo più nel linguaggio di una console da mission control, sono particolarmente contrario al "never who opened it", cioè è awkward, anche "Disconnected by hand, from inside." è innaturale, anche "Logs whether anything moved, never who."»',
  context: 'Dove: scheda MAP, sotto la mappa, quando si tocca un portello o un modulo; lo legge chi sta decidendo cosa chiedere a NOVA. Al posto delle frasi, una lettura a campi come su una console: etichetta e valore, una riga per cosa. Un portello: «Hatch log: Online», «Records: Each opening, with its time», «Identity: Not recorded». Un modulo: «Motion sensor: Online», «Records: Movement, with its time», «Identity: Not recorded». Life Support: «Motion sensor: Offline», «Cause: Manual disconnection, inside the module». Il portello di Life Support: «Hatch log: Offline», «Cause: Manual disconnection, inside Life Support». «Identity: Not recorded» prende il posto di «never who»: dice la stessa regola (i sensori non dicono chi) come un dato. Sono proposte mie: cambiale come vuoi. La legenda sotto la mappa è tolta («è poco realistico avere la legenda sulla mappa di mission control»): cosa sono i segni lo dice la lettura quando li tocchi, e Life Support ha già scritto SENSORS OFFLINE sul modello.',
  common: [
    mapShot('Un portello', 'M-K'),
    mapShot('Un modulo', 'K'),
    mapShot('Life Support', 'L'),
    mapShot('Il portello di Life Support', 'L-K'),
  ],
  dirs: [],
};

// ---------- under the map ----------

const mapInfoDir = (key, title, note, info, rec = false) => ({
  key, title, rec, note,
  frames: [
    cap('Portello toccato', phone(chosen({ state: d2state({ tab: 'map', mapSel: 'M-K' }), mapDetail: { holo: 4, info } }), { cls: BASE })),
    cap('Life Support toccato', phone(chosen({ state: d2state({ tab: 'map', mapSel: 'L' }), mapDetail: { holo: 4, info } }), { cls: BASE })),
    cap('Niente toccato', phone(chosen({ state: d2state({ tab: 'map' }), mapDetail: { holo: 4, info } }), { cls: BASE })),
    cap('Laptop, indagine (ridotto)', laptop(chosen({ state: d2state({ tab: 'map', mapSel: 'K' }), mapDetail: { holo: 4, info } }), { cls: BASE, big: true })),
  ],
});
const MAPINFO = {
  id: 'mapinfo', title: 'Sotto la mappa', decided: 'B, una lettura da terminale', chosen: 'readout',
  answer: 'B · Una lettura da terminale · «"Logs every opening, with the time. Never who opened it." so lame non scriverlo così scrivilo più nel linguaggio di una console da mission control, sono particolarmente contrario al "never who opened it", cioè è awkward, anche "Disconnected by hand, from inside." è innaturale, anche "Logs whether anything moved, never who."» (i testi nuovi sono nella tavola «Sotto la mappa: le parole di una console»)',
  quote: '«la parte sotto la mappa è da sistemare, i messaggi con ">" in genere sono formattati male»',
  context: `Due cose distinte. La prima l'ho già corretta nel gioco, perché era un difetto: una riga che comincia con «>» e va a capo ora continua sotto il suo testo, non sotto il segno. Vale per tutte: la riga sotto la mappa, lo stato in home, la domanda in anteprima, lo storico delle domande, i finali, la soluzione. La seconda è questa tavola: come sta scritto ciò che si legge sotto la mappa. Le parole sono quelle di oggi, divise in nome e frasi; cambia solo la forma, e la legenda si allinea a sinistra con una linea sotto.`,
  dirs: [
    mapInfoDir('now', 'Oggi, con l\'a capo corretto', '<p>La riga di oggi, con la seconda riga che ora parte sotto il testo.</p>', undefined),
    mapInfoDir('card', 'A · Una scheda del luogo', `<p>Il segno della legenda, il nome del luogo come titolo, e sotto le frasi nel carattere dei testi, bianche. Niente «>».</p>
      <p>Perché: è una descrizione, non una riga che qualcuno sta scrivendo; il «>» resta per ciò che NOVA e la console dicono. E il titolo dice subito cosa hai toccato.</p>`, 'card', true),
    mapInfoDir('readout', 'B · Una lettura da terminale', `<p>Resta il «>»: il nome sulla riga del segno, e le frasi una per riga, rientrate.</p>
      <p>Costo: resta tutto nel carattere a spaziatura fissa, più faticoso da leggere.</p>`, 'readout'),
  ],
};

// ---------- the home as the home of a console ----------

const homeDir2 = (key, title, note, style, rec = false) => ({
  key, title, rec, note,
  frames: [
    cap('Telefono, nessun caso aperto', phone(chosen({ state: { ...base(), phase: 'home' }, homeStyle: style }), { cls: BASE })),
    cap('Telefono, un caso aperto', phone(chosen({ state: { ...base(), phase: 'home' }, homeStyle: style, saved: homeSaved }), { cls: BASE })),
    cap('Laptop (ridotto)', laptop(chosen({ state: { ...base(), phase: 'home' }, homeStyle: style, saved: homeSaved }), { cls: BASE, big: true })),
  ],
});
const HOME2 = {
  id: 'home2', title: 'La home come la home della console',
  redo: '«dovrebbe essere una richiesta di nova, che chiede a mission control di rispondere, chi apre la webapp accetta la trasmissione e nova inizia a scrivere. compare poi la schermata briefing, che si compila mentre nova scrive, come se mission control stesse prendendo in carico il caso e si appunta le cose no, e anche i report vengono aperti man mano che nova li apre (nella chat si vedono come allegati non lo so), lo stile del terminale con cui si scambiano i messaggi nova e mission control deve essere coerente.»',
  quote: '«se tutta l\'app è la console, anche la schermata di gioco non deve menzionare elementi relativi al gioco, ma essere come la home di una console»',
  context: `Leggo così: la schermata da cui si parte è la console di Mission Control in attesa, non il menu di un gioco. Quindi in tutte e tre le direzioni: sparisce «SABOTAGE» (la console non lo sa ancora, lo dice NOVA nel briefing); «NEW GAME» diventa «ANSWER», perché si risponde alla trasmissione di NOVA; «CONTINUE» diventa «RESUME». Sono parole nuove, da approvare. Altre due parole di gioco stanno fuori dalla home e qui non sono disegnate: la conferma dopo il tasto di accensione («QUIT GAME», con i pulsanti QUIT e CANCEL) e «NEW GAME» in fondo alla soluzione. Per tutte e due propongo «CLOSE LINK». Se invece intendevi le schermate dell'indagine, dimmelo.`,
  dirs: [
    homeDir2('window', 'Oggi', '<p>La home di oggi dentro la console.</p>', 'window'),
    homeDir2('plain', 'A · La home di oggi, senza parole di gioco', '<p>Resta com\'è: il nome della stazione grande, lo stato di NOVA nella sua finestra. Cambiano solo le parole dette sopra.</p>', 'plain'),
    homeDir2('console', 'B · La stazione e la trasmissione in arrivo', `<p>La home è il quadro di una console: in alto di chi è (MISSION CONTROL) e lo stato del collegamento; poi la stazione KEPLER-9 con le sue letture (le righe di oggi, come etichetta e valore); sotto, in ambra che lampeggia, «INCOMING TRANSMISSION» di NOVA, con ANSWER. Con un caso aperto, nel quadro della stazione ci sono il caso e l'ossigeno, con RESUME.</p>
      <p>Perché: è l'unica in cui si capisce cosa succede premendo: si risponde a una chiamata. Costo: «INCOMING TRANSMISSION» è una scritta nuova in più.</p>`, 'console', true),
    homeDir2('terminal', 'C · Un terminale', `<p>Le stesse cose come righe di un terminale, in linea con ASK NOVA: la stazione, le letture, e l'ultima riga in ambra, «Incoming transmission: NOVA, station AI».</p>
      <p>Costo: è la più spoglia; due righe nuove («Station Kepler-9» e quella della trasmissione).</p>`, 'terminal'),
  ],
};

// ---------- the time window: free or of fixed length ----------

const timeWinDir = (key, title, note, ui, draft, rec = false) => ({
  key, title, rec, note,
  frames: [
    cap('Telefono, Ask NOVA', phone(chosen({ state: d2state({ tab: 'ask', draft }), timeUi: ui }), { cls: BASE, scroll: '250' })),
    cap('Laptop: la finestra Ask NOVA', `<div class="${BASE}">${column(askPanel({ ...base(), draft }, c, 'tap', { holo: 3 }, null, ui))}</div>`),
  ],
});
const TIMEWIN = {
  id: 'timewin', title: 'La finestra di tempo: libera o a durata fissa', decided: 'A, 10 minuti, si sposta soltanto', chosen: 'fixed10',
  answer: 'A · 10 minuti, si sposta soltanto, non mi piace lo slider (il comando è nella tavola «La finestra di 10 minuti, senza slider»)',
  quote: '«ma se io nel selettore seleziono dalle 2 alle 3, non è sempre meglio di fare un range piccolo? sennò serve un design che invita a selezionare un range, es. uno slider che ha già la durata impostata e non modificabile, e tu trascini solo.»',
  context: `Hai ragione, e l'ho misurato su 3000 casi. La domanda «il portello accusato si è aperto fra le 02:00 e le 03:00?» risolve il caso da sola in 3000 casi su 3000. Una finestra stretta non dà mai di più, e messa nel punto sbagliato dà «no» in tutti e due i casi possibili. Quindi oggi scegliere l'orario è una scelta finta: chi ci pensa chiede tutta l'ora. Con la tua finestra a durata fissa ogni caso resta risolvibile (3000 su 3000 a 5, 10, 15, 20 e 30 minuti, con una domanda e con due), ma diventa necessaria l'ora che il rapporto dichiara («At around 02:55 I heard…»). Due costi, uguali per ogni durata. Primo: una finestra messa male risponde «no», e quel «no» sembra una prova: la squadra può concludere che chi accusa mente e sbagliare il codice. Secondo: è una regola in più da dire, una frase nel briefing e una riga nel materiale del gruppo.`,
  dirs: [
    timeWinDir('free', 'Oggi · Finestra libera', '<p>La linea del tempo che hai scelto, con i due cursori liberi. Qui con tutta l\'ora, come nel tuo esempio.</p>', 'track', { kind: 'hatch', what: 'M-K', a: 0, b: 60 }),
    timeWinDir('fixed10', 'A · 10 minuti, si sposta soltanto', `<p>La finestra è lunga 10 minuti e non si allarga: si trascina, o si tocca un orario e ci va. 11 posizioni; per ogni caso 3 contengono l'ora giusta.</p>
      <p>Perché 10: l'ora dichiarata nel rapporto cade a metà di una finestra (per «around 02:55», da 02:50 a 03:00), quindi chi legge bene il rapporto la mette giusta al primo colpo.</p>`, 'fixed10', { kind: 'hatch', what: 'M-K', a: 50, b: 60 }, true),
    timeWinDir('fixed15', 'B · 15 minuti, si sposta soltanto', `<p>Come A, più larga: 10 posizioni, 4 contengono l'ora giusta.</p>
      <p>Costo: perdona di più chi non ha letto l'ora, quindi l'ora conta meno; e l'ora dichiarata non sta mai a metà.</p>`, 'fixed15', { kind: 'hatch', what: 'M-K', a: 45, b: 60 }),
  ],
};

// ---------- the 10-minute window without a slider ----------

const tenDir = (key, title, note, ui, rec = false) => ({
  key, title, rec, note,
  frames: [
    cap('Telefono, Ask NOVA', phone(chosen({ state: d2state({ tab: 'ask', draft: askDraft10 }), timeUi: ui }), { cls: BASE, scroll: '250' })),
    cap('Laptop: la finestra Ask NOVA', `<div class="${BASE}">${column(askPanel({ ...base(), draft: askDraft10 }, c, 'tap', { holo: 4 }, null, ui))}</div>`),
  ],
});
const TIME10 = {
  id: 'time10', title: 'La finestra di 10 minuti, senza slider', over: '«ask nova vorrei sia più chatbot ma in terminale» (continua nella tavola «ASK NOVA come una chat, nel terminale»)',
  quote: '«A · 10 minuti, si sposta soltanto, non mi piace lo slider»',
  context: `La finestra resta di 10 minuti e si sposta soltanto, a passi di 5: undici posizioni, da 02:00–02:10 a 02:50–03:00. Cambia il comando. In tutte e tre la domanda sotto si aggiorna come oggi. Non mi hai detto cosa non ti piace dello slider: se era solo com'era disegnato e non il gesto, dimmelo e lo ridisegno.`,
  dirs: [
    tenDir('fixed10', 'Oggi · Lo slider', '<p>La finestra che scorre sulla linea, per confronto.</p>', 'fixed10'),
    tenDir('cells10', 'A · Le tacche dell\'ossigeno', `<p>L'ora è fatta di dodici tacche da 5 minuti, come la barra dell'ossigeno in alto; le due accese sono la finestra. Si tocca una tacca e la finestra va lì.</p>
      <p>Perché: è un segno che l'interfaccia ha già, si vede dove sta la finestra dentro l'ora, e non c'è niente da trascinare. Costo: sul telefono una tacca è larga circa 24 pixel; si tocca «vicino», la finestra si ferma sulla posizione più vicina.</p>`, 'cells10', true),
    tenDir('step10', 'B · Un display fra − e +', `<p>La finestra si legge per intero in un display, fra un tasto − e un tasto +: 5 minuti a tocco.</p>
      <p>Costo: fino a dieci tocchi per attraversare l'ora, e non si vede dove sta la finestra dentro l'ora.</p>`, 'step10'),
    tenDir('around10', 'C · Gli orari del rapporto', `<p>Undici tasti con gli orari, da 02:05 a 02:55: si tocca l'ora che il rapporto dichiara («At around 02:55…») e la domanda copre i 5 minuti prima e dopo.</p>
      <p>Perché: è il gesto più vicino a come si ragiona, «verso le 02:55». Costo: undici tasti occupano tre righe sul telefono, e la finestra da 10 minuti si capisce solo dalla domanda sotto.</p>`, 'around10'),
  ],
};

// ---------- the hologram, second round ----------

const holoDir2 = (key, title, note, n, rec = false) => ({
  key, title, rec, note,
  frames: [
    cap('Telefono, scheda MAP', phone(chosen({ state: d2state({ tab: 'map', mapSel: 'K' }), mapDetail: { holo: n } }), { cls: BASE })),
    cap('Telefono, Ask NOVA', phone(chosen({ state: d2state({ tab: 'ask', draft: askDraft10 }), mapDetail: { holo: n } }), { cls: BASE })),
    cap('Laptop, indagine (ridotto)', laptop(chosen({ state: d2state({ tab: 'map', mapSel: 'M-K' }), mapDetail: { holo: n } }), { cls: BASE, big: true })),
  ],
});
const HOLO2 = {
  id: 'holo2', title: 'L\'ologramma della mappa, seconda prova', decided: 'A, pareti di luce, nomi dritti', chosen: 'h4', answer: 'A · Pareti di luce, nomi dritti',
  quote: '«l\'ologramma della mappa è migliorabile»',
  context: `Non mi hai detto in cosa, quindi ti dico cosa ci vedo io di debole, e le prove correggono quello. I nomi dei moduli sono inclinati con il pavimento e tagliati dalle righe delle pareti: si leggono male. Le pareti sono cinque contorni impilati, che sembrano pile di fogli più che stanze. Il proiettore è una barretta piatta. Se intendevi altro, dimmelo e rifaccio su quello. La mappa resta la stessa (stessi moduli, portelli e sensori, stesse zone da toccare).`,
  dirs: [
    holoDir2('now', 'Oggi', '<p>L\'ologramma proiettato che avevi scelto.</p>', 3),
    holoDir2('h4', 'A · Pareti di luce, nomi dritti', `<p>Ogni modulo è un volume: quattro pareti di luce che sfumano verso l'alto e un bordo in cima. I nomi stanno in piedi sopra i moduli, rivolti a chi guarda. Il proiettore è un anello.</p>
      <p>Perché: i nomi si leggono dritti e le stanze sembrano stanze, senza cambiare il punto di vista a cui si tocca già bene.</p>`, 4, true),
    holoDir2('h5', 'B · Il modello di tre quarti', `<p>Come A, ma il modello è girato di tre quarti e ruota piano, come un plastico.</p>
      <p>Costo: girato occupa più spazio, quindi è più piccolo (sul telefono i portelli da toccare si rimpiccioliscono di circa un quinto).</p>`, 5),
  ],
};

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
  id: 'buttons', title: 'Pulsanti', decided: 'B, le parentesi diventano la cornice', chosen: 'B', answer: 'B · Le parentesi diventano la cornice',
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
  id: 'mapq', title: 'Domande a NOVA dalla mappa', decided: 'C, si tocca il luogo', chosen: 'C', answer: 'C · Si tocca il luogo, il sensore segue',
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

// ---------- Bridge console call ----------

// a case where the Bridge occupant (Mira) is a suspect and mentions the call: 02:50–03:00
const CALL_SAMPLE = 'K9-X5GM';
const callCase = generateCase(CALL_SAMPLE, { calls: true });
const baseCall = () => ({ ...newState(), code: CALL_SAMPLE });
const callView = (callUi, state, extra = {}) => ({ ...NOW2, c: callCase, callUi, state: { ...baseCall(), ...state }, remainingMs: 6 * MIN + 5000, ...extra });
const askCall = (callUi, draft) => phone(callView(callUi, { phase: 'play', tab: 'ask', draft }), { cls: 'btns-b', scroll: '120' });
const CALLS = {
  id: 'calls', title: 'Domande a NOVA: la chiamata del Bridge',
  rejected: '«la call > noi di mission control non sappiamo se una chiamata è avvenuta? non ha senso»',
  quote: '«The question builder always offers "Bridge console call" as a sensor type with a time window. [...] Never show the option only when a call exists: that would leak information.»',
  context: `Caso di prova ${CALL_SAMPLE}: Mira è sul Bridge e nel rapporto dice di aver avuto la chiamata con Mission Control dalle 02:50 alle 03:00 (primo riquadro qui sotto). In tutte le direzioni la chiamata si può chiedere sempre, in ogni caso, e la domanda è «Was there a call on the Bridge console between … and …?», ricavata da quella del movimento. Con la chiamata cambia anche il briefing (secondo riquadro): nella frase dei sensori «hatch openings and motion» diventa «hatch openings, motion and calls on the Bridge console», e la scheda SENSORS ha una terza voce, CONSOLE CALL. Finché non scegli, nel gioco le chiamate sono spente: nessun caso ne ha, quindi nessun rapporto ne parla.`,
  common: [
    cap('Il rapporto con la chiamata (scheda REPORTS)', phone(callView('map', { phase: 'play', tab: 'reports' }), { cls: 'btns-b', scroll: '110' })),
    cap('Scheda BRIEFING, riquadro SENSORS', phone(callView('map', { phase: 'play', tab: 'briefing' }), { cls: 'btns-b', scroll: '520' })),
  ],
  dirs: [
    {
      key: 'A', title: 'A · La console sulla mappa', rec: true,
      note: `<p>Sul Bridge c'è la console, disegnata come un terzo sensore: si tocca come un portello. La scheda MAP la mostra, con la sua voce nella legenda e la sua riga quando la tocchi.</p>
        <p>Perché: segue la scelta già fatta per le domande, «si tocca il luogo, il sensore segue». Costo: un bersaglio in più dentro il Bridge, piccolo sul telefono; la zona da toccare è più grande del disegno, come per i portelli.</p>`,
      frames: [
        cap('Ask NOVA, console toccata', askCall('map', { kind: 'call', what: 'B', a: 45, b: 60 })),
        cap('Scheda MAP, console toccata', phone(callView('map', { phase: 'play', tab: 'map', mapSel: 'console' }), { cls: 'btns-b' })),
      ],
    },
    {
      key: 'B', title: 'B · Un pulsante sotto la mappa',
      note: `<p>Sotto la mappa, un pulsante BRIDGE CONSOLE CALL. La mappa resta com'è.</p>
        <p>Perché: si vede sempre, nessuno lo manca. Costo: è l'unico sensore che non si tocca sulla mappa.</p>`,
      frames: [
        cap('Ask NOVA, niente scelto', askCall('button', { kind: 'hatch', what: null, a: 0, b: 60 })),
        cap('Ask NOVA, chiamata scelta', askCall('button', { kind: 'call', what: 'B', a: 45, b: 60 })),
      ],
    },
    {
      key: 'C', title: 'C · Il Bridge chiede quale sensore',
      note: `<p>Toccando il Bridge compare la scelta MOTION / CONSOLE CALL; la riga sotto la mappa dice che sul Bridge si può chiedere anche delle chiamate.</p>
        <p>Costo: la chiamata si scopre solo toccando il Bridge.</p>`,
      frames: [
        cap('Ask NOVA, Bridge toccato', askCall('bridge', { kind: 'motion', what: 'B', a: 45, b: 60 })),
        cap('Ask NOVA, chiamata scelta', askCall('bridge', { kind: 'call', what: 'B', a: 45, b: 60 })),
      ],
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

const STORY = [LIVE];
const OPEN = [INBOX, HOMETITLE, TITLEOUT2, PACE, BTNIN, CODEFLOW, CASEFILE];
const NOTES = [BTN2, MAPTEXT, PORTRAITS];
const DECIDED = [ENDTITLE, RESUME, TEXTFONT, TITLEOUT, CODEPLACE, ARCHIVE, MAPFIT, REPHEAD, REPCOL, PIXELDECK, SCROLLEDGE, WINFX, REPCLOSED, LIVELEFT, BARLED, ASKTERM2, MAPINFO, HOME2, ASKTERM, REPORTS3, BAR, TIME10, WINDOWS2, TIMEWIN, HOLO2, CONSOLE4, WINDOWS, REPORTS2, TIMEUI, CONSOLE3, CALLS, CONSOLE2, CONSOLE2_FX, CONSOLE_BG, CONSOLE_FX, HOLO, HOME, MAPD, BRIEF, BUTTONS, MAPQ, RESET, REPORTS, CRITICAL];
const root = document.getElementById('mocks');
root.innerHTML = `
  <div class="mock-head">
    <h1>NOVA // Mock</h1>
    <p>${tidy(`Schermate vere dell'app, caso di prova ${SAMPLE}, font Jersey 10. Ogni riquadro scorre. Prima le tavole aperte: in ognuna scegli una direzione con il pallino, e in fondo trovi la raccolta. Sotto, le tavole già decise, con tutte le prove.`)}</p>
    <nav class="mock-nav">${STORY.concat(OPEN).map((b) => `<a href="#${b.id}">${b.title}</a>`).join('')}<a href="#summary">Raccolta</a>${NOTES.map((b) => `<a href="#${b.id}">${b.title} (fatto)</a>`).join('')}${DECIDED.map((b) => `<a href="#${b.id}">${b.title} (${b.rejected ? 'bocciata' : b.redo ? 'da rifare' : b.over ? 'superata' : 'deciso'})</a>`).join('')}<a href="#fonts">Font (deciso)</a></nav>
  </div>
  ${STORY.map(board).join('')}
  ${OPEN.map(board).join('')}
  <section class="board" id="summary">
    <header class="board-head"><h2>Raccolta</h2></header>
    <pre class="summary" data-summary></pre>
  </section>
  ${NOTES.map(board).join('')}
  ${DECIDED.map(board).join('')}
  ${fontsBoard}`;

root.addEventListener('click', (e) => {
  const b = e.target.closest('[data-replay]');
  if (!b) return;
  // a frame that plays the game itself starts again from NOVA's request
  // (a frame of the board "pace" plays the whole briefing, without a tap inside it)
  if (b.dataset.replay === 'live') { const f = b.closest('.mock-fig').querySelector('iframe'); f.src = `${f.dataset.play || f.getAttribute('src')}&r=${Date.now()}`; b.textContent = f.dataset.play ? 'Ricomincia il briefing' : b.textContent; return; }
  // the console itself: ACCEPT is pressed inside the frame, and a little later NOVA's request is back
  if (b.dataset.replay === 'accept') {
    const f = b.closest('.mock-fig').querySelector('iframe');
    const press = () => f.contentDocument?.querySelector('[data-act="accept"]')?.click();
    clearTimeout(f.backTimer);
    const back = () => { f.backTimer = setTimeout(() => { f.src = f.getAttribute('src'); }, 2600); };
    if (f.contentDocument?.querySelector('.home-title')) { press(); back(); } else { f.addEventListener('load', () => setTimeout(() => { press(); back(); }, 1500), { once: true }); f.src = f.getAttribute('src'); }
    return;
  }
  // a button comes at its turn: NOVA's window opens and is typed again (or only its last rows), then the buttons
  if (b.dataset.replay === 'btnin') {
    const w = b.closest('.mock-fig').querySelector('.win-term');
    w.querySelectorAll('.btn-in').forEach((x) => { x.classList.remove('btn-in'); x.style.animationDelay = ''; });
    const last = Number(b.dataset.last);
    if (last) { typeNodes([...w.querySelectorAll('.term > .tl')].slice(-last), { cps: 60, max: 0 }); return; }
    w.classList.remove('win-arrive'); void w.offsetWidth; w.classList.add('win-arrive');
    typeWindow(w, { cps: 60, max: 0 });
    return;
  }
  // the end of a case: the windows go out one after the other, the file of the case comes, then the frame is as before
  if (b.dataset.replay === 'closing') {
    const fig = b.closest('.mock-fig');
    const wrap = fig.querySelector('.mock-wide-wrap');
    if (fig.dataset.busy) return;
    fig.dataset.busy = '1';
    const before = wrap.outerHTML;
    wrap.querySelector('.mock-frame').classList.add('fx-closing');
    setTimeout(() => {
      wrap.outerHTML = fig.querySelector('template').innerHTML;
      const file = fig.querySelector('.mock-wide-wrap .win-file');
      file.classList.add('win-arrive');
      typeWindow(file, { max: 1400 });
    }, 2100);
    setTimeout(() => { fig.querySelector('.mock-wide-wrap').outerHTML = before; delete fig.dataset.busy; chatEnd(); }, 7000);
    return;
  }
  // the home title leaves as it does when the transmission is accepted, then comes back to be tried again
  if (b.dataset.replay === 'titleout') {
    const h = b.closest('.mock-fig').querySelector('.home-title');
    h.classList.remove('is-leaving', 'to-line', 'to-dark'); void h.offsetWidth;
    h.classList.add('is-leaving', b.dataset.out);
    setTimeout(() => h.classList.remove('is-leaving', b.dataset.out), 1600);
    return;
  }
  const cs = b.closest('.mock-fig').querySelector('.cs');
  if (b.dataset.replay === 'winfx') {
    const fr = b.closest('.mock-fig').querySelector('.mock-frame');
    const cls = [...fr.classList].find((x) => x.startsWith('fxin-'));
    fr.classList.remove(cls); void fr.offsetWidth; fr.classList.add(cls);
    // the typed version: the style sheet opens each window from a line, the script types what is inside
    if (cls === 'fxin-type') playWindows(fr, { skip: '.win-term' });
    return;
  }
  if (b.dataset.replay === 'boot') { cs.classList.remove('fx-boot'); void cs.offsetWidth; cs.classList.add('fx-boot'); }
  if (b.dataset.replay === 'static') { cs.classList.remove('cs-switching'); void cs.offsetWidth; cs.classList.add('cs-switching'); setTimeout(() => cs.classList.remove('cs-switching'), 400); }
});
// in the filling console NOVA's channel shows its last line, as a conversation does
const chatEnd = () => root.querySelectorAll('.screen-live .win-term .win-body').forEach((b) => { b.scrollTop = b.scrollHeight; b.classList.toggle('is-scrolled', b.scrollTop > 2); });
chatEnd();
document.fonts.ready.then(() => requestAnimationFrame(chatEnd));
// the scroll edge board starts with the conversation half way, where a line is cut under the title
// (the third attachment line sliced in half, as in the picture David sent; set once the fonts have their measures)
const cutLine = () => root.querySelectorAll('.mock-frame[class*="scr-"] .win-term .win-body').forEach((b) => {
  const att = b.querySelectorAll('.att')[2];
  const k = b.getBoundingClientRect().height / b.offsetHeight || 1; // the frame is drawn smaller than it is
  b.scrollTop = Math.round(b.scrollTop + (att.getBoundingClientRect().top - b.getBoundingClientRect().top) / k) + 11;
  b.classList.toggle('is-scrolled', b.scrollTop > 2);
});
document.fonts.ready.then(() => requestAnimationFrame(cutLine));
const codeEnd = () => root.querySelectorAll('.mock-frame.code-side .live-right').forEach((col) => { col.scrollTop = col.scrollHeight; });
document.fonts.ready.then(() => requestAnimationFrame(codeEnd));
root.addEventListener('scroll', (e) => {
  if (e.target.matches?.('.win-body')) e.target.classList.toggle('is-scrolled', e.target.scrollTop > 2);
}, true);
root.querySelectorAll('[data-scroll]').forEach((frame) => {
  const f = frame.querySelector('.cs-screen > .cs-scroll, .cs-mon-main .cs-scroll') || frame;
  f.scrollTop = frame.dataset.scroll === 'bottom' ? f.scrollHeight : Number(frame.dataset.scroll);
});

function summary() {
  const lines = OPEN.map((b) => {
    const vs = [...root.querySelectorAll(`input[name="${b.id}"]:checked`)].map((v) => b.dirs.find((x) => x.key === v.value).title);
    return `${b.title}: ${vs.length ? vs.join(' + ') : '(da scegliere)'}`;
  });
  root.querySelector('[data-summary]').textContent = lines.length ? lines.join('\n') : 'Nessuna tavola con scelte aperte. Sopra c\'è lo storyboard da confermare; sotto, le cose fatte da controllare.';
}
root.addEventListener('change', summary);
summary();
