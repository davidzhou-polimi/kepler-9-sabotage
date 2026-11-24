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
function laptop(view, { cls = '', big = false } = {}) {
  const v = { c, wide: true, remainingMs: 10 * MIN, dev: false, ...view };
  return `<div class="mock-wide-wrap ${big ? 'is-big' : ''}"><div class="mock-frame mock-wide ${cls}" data-font="${JERSEY}">${screen(v)}</div></div>`;
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
  const isChosen = Boolean(chosen) && [].concat(chosen).includes(d.key);
  const lock = chosen ? `disabled ${isChosen ? 'checked' : ''}` : '';
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
  return `<section class="board" id="${b.id}">
    <header class="board-head">
      <h2>${b.title}${b.decided ? ` <span class="done">Deciso: ${b.decided}</span>` : ''}${b.rejected ? ' <span class="done done-no">Bocciata</span>' : ''}</h2>
      <p class="quote">${b.quote}</p>
      <p>${tidy(b.context)}</p>
    </header>
    ${b.decided && b.answer ? `<p class="answer">La tua scelta: <b>${b.answer}</b></p>` : ''}
    ${b.rejected ? `<p class="answer">La tua risposta: <b>${b.rejected}</b></p>` : ''}
    ${b.common ? `<div class="dir-frames board-common">${b.common.join('')}</div>` : ''}
    ${b.dirs.map((d) => direction(b.id, d, b.chosen)).join('')}
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

// ---------- windows after the group's game cards ----------

const winFrames = (cls) => [
  cap('Telefono, rapporti', phone(desk2('top', { state: d2state({ tab: 'reports' }) }), { cls: `btns-b ${cls}` })),
  cap('Telefono, domande', phone(desk2('top', { state: d2state({ tab: 'ask', draft: askDraft }) }), { cls: `btns-b ${cls}` })),
  cap('Telefono, briefing', phone(desk2('top', { state: d2state({ tab: 'briefing' }) }), { cls: `btns-b ${cls}` })),
  cap('Telefono, home', phone(desk2('top', { state: { ...base(), phase: 'home' }, saved: { code: SAMPLE, phase: 'play', remainingMs: 6 * MIN + 12000 } }), { cls: `btns-b ${cls}` })),
  cap('Laptop, indagine (ridotto)', laptop(desk2('top', { state: d2state({ tab: 'code', codeInput: '12' }) }), { cls: `btns-b ${cls}`, big: true })),
];
const WINDOWS = {
  id: 'windows', title: 'Le finestre come le carte del gruppo',
  quote: '«possiamo ispirarci per le finestre? deve esserci coerenza tra il materiale del gruppo»',
  context: `Sì. Dalle carte di Shravani ho preso ciò che fa da cornice: la linea ciano con gli angoli tagliati, il titolo in ciano senza barra piena (al posto dei tre quadratini da finestra di computer), il fondo quasi nero con la griglia fine, la linguetta dei riquadri «YOUR OBJECTIVE» e «MISSION PROTOCOL», le strisce in fondo. Dentro le finestre non cambia niente: rapporti, mappa, domande e codice restano quelli decisi. Le prove sono sulla console della tavola sopra (direzione A). Ho misurato anche il ciano: sulle carte è #3AD4F1, più azzurro; nell'app è #43D9D2, più verde. È l'ultima casella, e si può aggiungere a qualsiasi direzione.`,
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

const OPEN = [CONSOLE3, WINDOWS, CALLS];
const DECIDED = [CONSOLE2, CONSOLE2_FX, CONSOLE_BG, CONSOLE_FX, HOLO, HOME, MAPD, BRIEF, BUTTONS, MAPQ, RESET, REPORTS, CRITICAL];
const root = document.getElementById('mocks');
root.innerHTML = `
  <div class="mock-head">
    <h1>NOVA // Mock</h1>
    <p>${tidy(`Schermate vere dell'app, caso di prova ${SAMPLE}, font Jersey 10. Ogni riquadro scorre. Prima le tavole aperte: in ognuna scegli una direzione con il pallino, e in fondo trovi la raccolta. Sotto, le tavole già decise, con tutte le prove.`)}</p>
    <nav class="mock-nav">${OPEN.map((b) => `<a href="#${b.id}">${b.title}</a>`).join('')}<a href="#summary">Raccolta</a>${DECIDED.map((b) => `<a href="#${b.id}">${b.title} (${b.rejected ? 'bocciata' : 'deciso'})</a>`).join('')}<a href="#fonts">Font (deciso)</a></nav>
  </div>
  ${OPEN.map(board).join('')}
  <section class="board" id="summary">
    <header class="board-head"><h2>Raccolta</h2></header>
    <pre class="summary" data-summary></pre>
  </section>
  ${DECIDED.map(board).join('')}
  ${fontsBoard}`;

root.addEventListener('click', (e) => {
  const b = e.target.closest('[data-replay]');
  if (!b) return;
  const cs = b.closest('.mock-fig').querySelector('.cs');
  if (b.dataset.replay === 'boot') { cs.classList.remove('fx-boot'); void cs.offsetWidth; cs.classList.add('fx-boot'); }
  if (b.dataset.replay === 'static') { cs.classList.remove('cs-switching'); void cs.offsetWidth; cs.classList.add('cs-switching'); setTimeout(() => cs.classList.remove('cs-switching'), 400); }
});
root.querySelectorAll('[data-scroll]').forEach((f) => { f.scrollTop = f.dataset.scroll === 'bottom' ? f.scrollHeight : Number(f.dataset.scroll); });

function summary() {
  const lines = OPEN.map((b) => {
    const vs = [...root.querySelectorAll(`input[name="${b.id}"]:checked`)].map((v) => b.dirs.find((x) => x.key === v.value).title);
    return `${b.title}: ${vs.length ? vs.join(' + ') : '(da scegliere)'}`;
  });
  root.querySelector('[data-summary]').textContent = lines.join('\n');
}
root.addEventListener('change', summary);
summary();
