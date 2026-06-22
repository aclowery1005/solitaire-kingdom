import React, { useState, useCallback, useEffect, useRef } from "react";

// ---------- Card model (Klondike engine) ----------
const SUITS = ["spades", "hearts", "clubs", "diamonds"];
const SUIT_SYMBOL = { spades: "♠", hearts: "♥", clubs: "♣", diamonds: "♦" };
const RED_SUITS = new Set(["hearts", "diamonds"]);
const RANKS = [1,2,3,4,5,6,7,8,9,10,11,12,13];
const RANK_LABEL = { 1: "A", 11: "J", 12: "Q", 13: "K" };

function rankLabel(r) { return RANK_LABEL[r] || String(r); }

function makeDeck() {
  const deck = [];
  let id = 0;
  for (const s of SUITS) for (const r of RANKS) deck.push({ id: `c${id++}`, suit: s, rank: r, faceUp: false });
  return deck;
}
function shuffle(deck) {
  const d = deck.slice();
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}
function isRed(suit) { return RED_SUITS.has(suit); }

function dealNewGame() {
  const deck = shuffle(makeDeck());
  const tableau = [[], [], [], [], [], [], []];
  let idx = 0;
  for (let col = 0; col < 7; col++) {
    for (let row = 0; row <= col; row++) {
      const card = { ...deck[idx++] };
      card.faceUp = row === col;
      tableau[col].push(card);
    }
  }
  const stock = deck.slice(idx).map((c) => ({ ...c, faceUp: false }));
  const foundations = { spades: [], hearts: [], clubs: [], diamonds: [] };
  return { tableau, stock, waste: [], foundations };
}

// ---------- Card visuals ----------
const CardFace = React.memo(function CardFace({ card, w, h }) {
  const red = isRed(card.suit);
  const sym = SUIT_SYMBOL[card.suit];
  const color = red ? "#A8332B" : "#1A1A1A";
  return (
    <svg width={w} height={h} viewBox="0 0 100 140" style={{ display: "block" }}>
      <defs>
        <linearGradient id={`paper-${card.id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FCFAF3" />
          <stop offset="100%" stopColor="#F2ECDB" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="98" height="138" rx="7" fill={`url(#paper-${card.id})`} stroke="#D4AF37" strokeWidth="1.1" />
      <rect x="4.5" y="4.5" width="91" height="131" rx="4.5" fill="none" stroke="#D4AF37" strokeWidth="0.5" opacity="0.55" />
      <text x="8" y="24" fontFamily="Georgia, serif" fontWeight="700" fontSize="20" fill={color}>{rankLabel(card.rank)}</text>
      <text x="8" y="42" fontFamily="Georgia, serif" fontSize="17" fill={color}>{sym}</text>
      <text x="92" y="124" fontFamily="Georgia, serif" fontWeight="700" fontSize="20" fill={color} textAnchor="end" transform="rotate(180 92 124)">{rankLabel(card.rank)}</text>
      <text x="92" y="106" fontFamily="Georgia, serif" fontSize="17" fill={color} textAnchor="end" transform="rotate(180 92 106)">{sym}</text>
      <text x="50" y="82" fontFamily="Georgia, serif" fontSize="42" fill={color} textAnchor="middle" opacity="0.92">{sym}</text>
    </svg>
  );
});
const CardBack = React.memo(function CardBack({ w, h }) {
  return (
    <svg width={w} height={h} viewBox="0 0 100 140" style={{ display: "block" }}>
      <defs>
        <linearGradient id="back-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3B1F63" />
          <stop offset="55%" stopColor="#2A1148" />
          <stop offset="100%" stopColor="#1B0B30" />
        </linearGradient>
        <pattern id="back-pat" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(0)">
          <path d="M10 4 C 11.5 7, 13.5 7.5, 13 10 C 12.7 11.8, 11 12.4, 10 11.2 C 9 12.4, 7.3 11.8, 7 10 C 6.5 7.5, 8.5 7, 10 4 Z" fill="#D4AF37" opacity="0.5" />
          <circle cx="10" cy="14.5" r="0.9" fill="#D4AF37" opacity="0.4" />
        </pattern>
      </defs>
      <rect x="1" y="1" width="98" height="138" rx="7" fill="url(#back-grad)" stroke="#D4AF37" strokeWidth="1.3" />
      <rect x="6" y="6" width="88" height="128" rx="4" fill="url(#back-pat)" stroke="#D4AF37" strokeWidth="0.9" opacity="0.95" />
      <rect x="9" y="9" width="82" height="122" rx="3" fill="none" stroke="#D4AF37" strokeWidth="0.5" opacity="0.5" />
    </svg>
  );
});
function EmptySlot({ symbol, w, h }) {
  return (
    <svg width={w} height={h} viewBox="0 0 100 140" style={{ display: "block" }}>
      <rect x="1" y="1" width="98" height="138" rx="7" fill="rgba(255,255,255,0.04)" stroke="#6e5a8c" strokeWidth="1" strokeDasharray="4 4" />
      {symbol && <text x="50" y="86" fontFamily="Georgia, serif" fontSize="38" fill="#6e5a8c" textAnchor="middle" opacity="0.6">{symbol}</text>}
    </svg>
  );
}

const CARD_W = 70;
const CARD_H = 98;
const FAN = 24;

const TOURNAMENT_HAND_SECONDS = 5 * 60; // 5 minute countdown on tournament days

function formatTime(totalSeconds) {
  const s = Math.max(0, totalSeconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/**
 * Fires onWin(moves) and onMove() callbacks up to the app shell so the
 * shell can award participation points / progress daily tasks against
 * the real database.
 */
export default function KlondikeGame({ onWin, onMove, drawThree, setDrawThree, isTournament, onTimeUp }) {
  const [state, setState] = useState(() => dealNewGame());
  const [selection, setSelection] = useState(null);
  const [history, setHistory] = useState([]);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const [hint, setHint] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [timeUpFired, setTimeUpFired] = useState(false);
  const dragInfo = useRef(null);

  useEffect(() => {
    if (won) return;
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [won]);

  const remaining = isTournament ? Math.max(0, TOURNAMENT_HAND_SECONDS - elapsed) : null;

  const pushHistory = useCallback((prev) => setHistory((h) => [...h.slice(-49), prev]), []);
  const checkWin = useCallback((st) => SUITS.every((s) => st.foundations[s].length === 13), []);

  const cloneState = (st) => ({
    tableau: st.tableau.map((c) => c.slice()),
    stock: st.stock.slice(),
    waste: st.waste.slice(),
    foundations: {
      spades: st.foundations.spades.slice(),
      hearts: st.foundations.hearts.slice(),
      clubs: st.foundations.clubs.slice(),
      diamonds: st.foundations.diamonds.slice(),
    },
  });

  const newGame = useCallback(() => {
    setState(dealNewGame());
    setSelection(null);
    setHistory([]);
    setMoves(0);
    setWon(false);
    setHint(null);
    setElapsed(0);
    setTimeUpFired(false);
  }, []);

  useEffect(() => {
    if (isTournament && remaining === 0 && !timeUpFired && !won) {
      setTimeUpFired(true);
      onTimeUp?.();
      setTimeout(() => newGame(), 1200);
    }
  }, [isTournament, remaining, timeUpFired, won, onTimeUp, newGame]);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setState(prev);
      setSelection(null);
      setWon(false);
      return h.slice(0, -1);
    });
  }, []);

  const drawFromStock = useCallback(() => {
    setHint(null);
    setState((st) => {
      const next = cloneState(st);
      if (next.stock.length === 0) {
        if (next.waste.length === 0) return st;
        pushHistory(st);
        next.stock = next.waste.slice().reverse().map((c) => ({ ...c, faceUp: false }));
        next.waste = [];
        return next;
      }
      pushHistory(st);
      const n = drawThree ? 3 : 1;
      const taken = next.stock.splice(Math.max(0, next.stock.length - n), n);
      taken.reverse().forEach((c) => next.waste.push({ ...c, faceUp: true }));
      return next;
    });
    setMoves((m) => m + 1);
    onMove?.();
    setSelection(null);
  }, [pushHistory, drawThree, onMove]);

  const canStackTableau = (movingCard, targetCard) => {
    if (!targetCard) return movingCard.rank === 13;
    return isRed(movingCard.suit) !== isRed(targetCard.suit) && movingCard.rank === targetCard.rank - 1;
  };
  const canStackFoundation = (card, pile) => {
    if (pile.length === 0) return card.rank === 1;
    const top = pile[pile.length - 1];
    return top.suit === card.suit && card.rank === top.rank + 1;
  };

  const flipTopIfNeeded = (col) => {
    if (col.length > 0 && !col[col.length - 1].faceUp) col[col.length - 1] = { ...col[col.length - 1], faceUp: true };
  };

  const moveSelectionTo = useCallback((dest) => {
    if (!selection) return false;
    let success = false;
    setState((st) => {
      const next = cloneState(st);
      let movingCards = [];
      if (selection.from === "tableau") movingCards = next.tableau[selection.col].slice(selection.startIndex);
      else if (selection.from === "waste") { if (next.waste.length === 0) return st; movingCards = [next.waste[next.waste.length - 1]]; }
      else if (selection.from === "foundation") { const f = next.foundations[selection.suit]; if (f.length === 0) return st; movingCards = [f[f.length - 1]]; }
      if (movingCards.length === 0) return st;
      const lead = movingCards[0];

      if (dest.type === "tableau") {
        const targetCol = next.tableau[dest.col];
        const targetCard = targetCol[targetCol.length - 1];
        if (selection.from === "tableau" && selection.col === dest.col) return st;
        if (movingCards.length > 1 && !movingCards.every((c) => c.faceUp)) return st;
        if (!canStackTableau(lead, targetCard)) return st;
        pushHistory(st);
        targetCol.push(...movingCards);
      } else if (dest.type === "foundation") {
        if (movingCards.length !== 1) return st;
        if (!canStackFoundation(lead, next.foundations[dest.suit])) return st;
        if (lead.suit !== dest.suit) return st;
        pushHistory(st);
        next.foundations[dest.suit].push(lead);
      } else return st;

      if (selection.from === "tableau") { next.tableau[selection.col] = next.tableau[selection.col].slice(0, selection.startIndex); flipTopIfNeeded(next.tableau[selection.col]); }
      else if (selection.from === "waste") next.waste = next.waste.slice(0, -1);
      else if (selection.from === "foundation") next.foundations[selection.suit] = next.foundations[selection.suit].slice(0, -1);

      success = true;
      if (checkWin(next)) setWon(true);
      return next;
    });
    if (success) { setMoves((m) => m + 1); onMove?.(); }
    setSelection(null);
    setHint(null);
    return success;
  }, [selection, pushHistory, checkWin, onMove]);

  useEffect(() => { if (won) onWin?.(moves); }, [won]);

  const handleCardClick = useCallback((from, payload) => {
    setHint(null);
    if (from === "tableau") {
      const { col, index } = payload;
      const pile = state.tableau[col];
      const card = pile[index];
      if (!card.faceUp) return;
      if (selection && selection.from === "tableau" && selection.col === col && selection.startIndex === index) { setSelection(null); return; }
      if (selection) { const moved = moveSelectionTo({ type: "tableau", col }); if (!moved) setSelection({ from: "tableau", col, startIndex: index }); return; }
      setSelection({ from: "tableau", col, startIndex: index });
    } else if (from === "waste") {
      if (state.waste.length === 0) return;
      if (selection) { setSelection(null); return; }
      setSelection({ from: "waste" });
    } else if (from === "foundation-take") {
      const { suit } = payload;
      if (state.foundations[suit].length === 0) return;
      if (selection && selection.from === "foundation" && selection.suit === suit) { setSelection(null); return; }
      setSelection({ from: "foundation", suit });
    } else if (from === "foundation-drop") {
      if (selection) moveSelectionTo({ type: "foundation", suit: payload.suit });
    } else if (from === "tableau-empty") {
      if (selection) moveSelectionTo({ type: "tableau", col: payload.col });
    }
  }, [state, selection, moveSelectionTo]);

  const handleDoubleClick = useCallback((col, index) => {
    const pile = state.tableau[col];
    if (index !== pile.length - 1) return;
    const card = pile[index];
    if (!card.faceUp) return;
    const target = SUITS.find((s) => canStackFoundation(card, state.foundations[s]));
    if (target) { setSelection({ from: "tableau", col, startIndex: index }); setTimeout(() => moveSelectionTo({ type: "foundation", suit: target }), 0); }
  }, [state, moveSelectionTo]);

  const handleWasteDoubleClick = useCallback(() => {
    if (state.waste.length === 0) return;
    const card = state.waste[state.waste.length - 1];
    const target = SUITS.find((s) => canStackFoundation(card, state.foundations[s]));
    if (target) { setSelection({ from: "waste" }); setTimeout(() => moveSelectionTo({ type: "foundation", suit: target }), 0); }
  }, [state, moveSelectionTo]);

  const onDragStart = (e, from, payload) => {
    if (from === "tableau") { const card = state.tableau[payload.col][payload.index]; if (!card.faceUp) { e.preventDefault(); return; } dragInfo.current = { from: "tableau", col: payload.col, startIndex: payload.index }; }
    else if (from === "waste") { if (state.waste.length === 0) { e.preventDefault(); return; } dragInfo.current = { from: "waste" }; }
    else if (from === "foundation") { if (state.foundations[payload.suit].length === 0) { e.preventDefault(); return; } dragInfo.current = { from: "foundation", suit: payload.suit }; }
    setSelection(dragInfo.current);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", "drag");
  };
  const onDropTableau = (e, col) => { e.preventDefault(); if (!dragInfo.current) return; moveSelectionTo({ type: "tableau", col }); dragInfo.current = null; };
  const onDropFoundation = (e, suit) => { e.preventDefault(); if (!dragInfo.current) return; moveSelectionTo({ type: "foundation", suit }); dragInfo.current = null; };
  const allowDrop = (e) => e.preventDefault();

  const findHint = useCallback(() => {
    const st = state;
    if (st.waste.length > 0) { const card = st.waste[st.waste.length - 1]; if (SUITS.find((x) => canStackFoundation(card, st.foundations[x]))) return { type: "waste-foundation" }; }
    for (let c = 0; c < 7; c++) {
      const pile = st.tableau[c];
      if (pile.length === 0) continue;
      const card = pile[pile.length - 1];
      if (!card.faceUp) continue;
      if (SUITS.find((x) => canStackFoundation(card, st.foundations[x]))) return { type: "tableau-foundation", col: c };
    }
    if (st.waste.length > 0) {
      const card = st.waste[st.waste.length - 1];
      for (let c = 0; c < 7; c++) { const top = st.tableau[c][st.tableau[c].length - 1]; if (canStackTableau(card, top)) return { type: "waste-tableau", col: c }; }
    }
    for (let c = 0; c < 7; c++) {
      const pile = st.tableau[c];
      for (let i = 0; i < pile.length; i++) {
        if (!pile[i].faceUp) continue;
        const seq = pile.slice(i);
        if (!seq.every((x) => x.faceUp)) continue;
        const lead = seq[0];
        for (let c2 = 0; c2 < 7; c2++) {
          if (c2 === c) continue;
          const top2 = st.tableau[c2][st.tableau[c2].length - 1];
          if (canStackTableau(lead, top2)) { if (i === 0 && !top2) continue; return { type: "tableau-tableau", fromCol: c, toCol: c2 }; }
        }
        break;
      }
    }
    if (st.stock.length > 0) return { type: "draw" };
    if (st.waste.length > 0) return { type: "recycle" };
    return null;
  }, [state]);

  const showHint = useCallback(() => {
    const h = findHint();
    if (!h) { setHint({ type: "none" }); setTimeout(() => setHint(null), 1600); return; }
    setHint(h);
    setTimeout(() => setHint(null), 1800);
  }, [findHint]);

  const isSelected = (from, col, index) => {
    if (!selection) return false;
    if (from === "tableau" && selection.from === "tableau") return selection.col === col && index >= selection.startIndex;
    if (from === "waste" && selection.from === "waste") return true;
    if (from === "foundation" && selection.from === "foundation") return true;
    return false;
  };
  const isHintTarget = (kind) => {
    if (!hint) return false;
    if (kind === "stock" && (hint.type === "draw" || hint.type === "recycle")) return true;
    return false;
  };

  return (
    <div style={gStyles.wrap}>
      <div style={gStyles.toolbar}>
        <div style={gStyles.statGroup}>
          <div style={gStyles.statBlock}><span style={gStyles.statLabel}>Moves</span><span style={gStyles.statValue}>{moves}</span></div>
          <div style={gStyles.statBlock}>
            <span style={gStyles.statLabel}>{isTournament ? "Time left" : "Time"}</span>
            <span style={{ ...gStyles.statValue, ...(isTournament && remaining <= 30 ? gStyles.statValueUrgent : {}) }}>
              {formatTime(isTournament ? remaining : elapsed)}
            </span>
          </div>
          <label style={gStyles.drawToggle}>
            <input type="checkbox" checked={drawThree} onChange={(e) => { setDrawThree(e.target.checked); newGame(); }} style={{ accentColor: "#D4AF37" }} />
            Draw 3
          </label>
        </div>
        <div style={gStyles.btnRow}>
          <button style={gStyles.btn} onClick={undo} disabled={history.length === 0}>Undo</button>
          <button style={gStyles.btn} onClick={showHint}>Hint</button>
          <button style={{ ...gStyles.btn, ...gStyles.btnPrimary }} onClick={newGame}>New deal</button>
        </div>
      </div>

      <div style={gStyles.table}>
        <div style={gStyles.topRow}>
          <div style={gStyles.stockWasteGroup}>
            <div style={gStyles.slot} onClick={drawFromStock} title={state.stock.length === 0 ? "Recycle waste" : "Draw"}>
              {state.stock.length > 0 ? (
                <div className={isHintTarget("stock") ? "sk-card sk-hinted" : "sk-card"}><CardBack w={CARD_W} h={CARD_H} /></div>
              ) : <EmptySlot symbol="↺" w={CARD_W} h={CARD_H} />}
            </div>
            <div style={gStyles.wastePile}>
              {state.waste.length === 0 ? <EmptySlot w={CARD_W} h={CARD_H} /> : state.waste.slice(drawThree ? -3 : -1).map((card, i, arr) => {
                const isTop = i === arr.length - 1;
                return (
                  <div key={card.id} className={isSelected("waste") && isTop ? "sk-card sk-selected" : "sk-card"} style={{ position: "absolute", left: i * 16, zIndex: i }}
                    draggable={isTop} onDragStart={(e) => onDragStart(e, "waste", {})} onClick={() => isTop && handleCardClick("waste")} onDoubleClick={() => isTop && handleWasteDoubleClick()}>
                    <CardFace card={card} w={CARD_W} h={CARD_H} />
                  </div>
                );
              })}
            </div>
          </div>
          <div style={gStyles.foundationsGroup}>
            {SUITS.map((suit) => {
              const pile = state.foundations[suit];
              const top = pile[pile.length - 1];
              return (
                <div key={suit} style={gStyles.slot} onDragOver={allowDrop} onDrop={(e) => onDropFoundation(e, suit)} onClick={() => handleCardClick(top ? "foundation-take" : "foundation-drop", { suit })}>
                  {top ? (
                    <div className={isSelected("foundation") && selection?.suit === suit ? "sk-card sk-selected" : "sk-card"} draggable onDragStart={(e) => { e.stopPropagation(); onDragStart(e, "foundation", { suit }); }}>
                      <CardFace card={top} w={CARD_W} h={CARD_H} />
                    </div>
                  ) : <EmptySlot symbol={SUIT_SYMBOL[suit]} w={CARD_W} h={CARD_H} />}
                </div>
              );
            })}
          </div>
        </div>

        <div style={gStyles.tableau}>
          {state.tableau.map((pile, col) => (
            <div key={col} style={gStyles.tableauCol} onDragOver={allowDrop} onDrop={(e) => onDropTableau(e, col)} onClick={() => pile.length === 0 && handleCardClick("tableau-empty", { col })}>
              {pile.length === 0 ? <EmptySlot w={CARD_W} h={CARD_H} /> : pile.map((card, index) => {
                const top = index * FAN;
                const selected = isSelected("tableau", col, index);
                return (
                  <div key={card.id} className={selected ? "sk-card sk-selected" : "sk-card"} style={{ position: "absolute", top, left: 0, zIndex: index }}
                    draggable={card.faceUp} onDragStart={(e) => { e.stopPropagation(); onDragStart(e, "tableau", { col, index }); }}
                    onClick={(e) => { e.stopPropagation(); handleCardClick("tableau", { col, index }); }}
                    onDoubleClick={(e) => { e.stopPropagation(); handleDoubleClick(col, index); }}>
                    {card.faceUp ? <CardFace card={card} w={CARD_W} h={CARD_H} /> : <CardBack w={CARD_W} h={CARD_H} />}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {hint?.type === "none" && <div style={gStyles.toast}>No moves to suggest — try the stock pile.</div>}
    </div>
  );
}

const gStyles = {
  wrap: { padding: "0 16px 16px" },
  toolbar: { display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 700, margin: "0 auto 14px", flexWrap: "wrap", gap: 10 },
  statGroup: { display: "flex", alignItems: "center", gap: 14, background: "rgba(0,0,0,0.25)", border: "1px solid rgba(201,168,106,0.35)", borderRadius: 8, padding: "6px 12px" },
  statBlock: { display: "flex", flexDirection: "column", alignItems: "center", minWidth: 50 },
  statLabel: { fontSize: 9, letterSpacing: 1.5, opacity: 0.65, textTransform: "uppercase" },
  statValue: { fontSize: 16, fontWeight: 600, color: "#D4AF37" },
  statValueUrgent: { color: "#E25555" },
  drawToggle: { display: "flex", alignItems: "center", gap: 6, fontSize: 11, opacity: 0.85, cursor: "pointer" },
  btnRow: { display: "flex", gap: 8 },
  btn: { fontFamily: "'JetBrains Mono', monospace", fontSize: 11, padding: "8px 12px", borderRadius: 6, border: "1px solid rgba(201,168,106,0.45)", background: "rgba(0,0,0,0.25)", color: "#F2ECDB", cursor: "pointer" },
  btnPrimary: { background: "linear-gradient(180deg, #D4AF37, #b8932a)", color: "#1B2A22", fontWeight: 700, border: "1px solid #9a7a1f" },
  table: { maxWidth: 700, margin: "0 auto" },
  topRow: { display: "flex", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 16 },
  stockWasteGroup: { display: "flex", gap: 14 },
  wastePile: { position: "relative", width: CARD_W + 32, height: CARD_H },
  foundationsGroup: { display: "flex", gap: 8 },
  slot: { width: CARD_W, height: CARD_H, position: "relative", cursor: "pointer" },
  tableau: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 },
  tableauCol: { position: "relative", minHeight: CARD_H + FAN * 12, minWidth: CARD_W },
  toast: { position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.75)", border: "1px solid rgba(201,168,106,0.4)", padding: "10px 18px", borderRadius: 8, fontSize: 12, zIndex: 150 },
};
