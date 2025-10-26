import React, { useState } from "react";
import { BsArrowBarUp, BsArrowBarDown } from "react-icons/bs";
import { IoBackspaceOutline } from "react-icons/io5";

/** ======= ÁLTALÁNOS BEÁLLÍTÁSOK ======= */
const charWidthPx = 21;
const maxVisibleChars = 21;

/** demo adatbázis a Search menühöz (maradhat üresen is) */
const database = [
  {
    id: 1,
    question: "Sea breeze forms when…",
    answer: "Land heats faster; onshore breeze by day.",
  },
];

const menuItems = ["Search", "Meteo", "QNH"];

/** ======= HASZNOS FÜGGVÉNYEK ======= */

/** string -> number | null (üres/hibás esetben null) */
function toNum(v) {
  return v !== "" && v !== null && v !== undefined && !isNaN(Number(v))
    ? Number(v)
    : null;
}

/**
 * Számolja a hiányzó 4. mezőt — de NEM írja vissza state-be.
 * A bemenet a 4 mező nyers stringje: [Altimeter(hPa), QNH(hPa), Elevation(ft), Altitude(ft)]
 * Visszatérés: { canSolve: boolean, solvedIndex: 0..3 vagy null, value: number | null }
 */
function solveQnhOnTheFly(valuesArr) {
  const A = toNum(valuesArr[0]); // Altimeter
  const Q = toNum(valuesArr[1]); // QNH
  const E = toNum(valuesArr[2]); // Elevation
  const H = toNum(valuesArr[3]); // Altitude

  const results = [A, Q, E, H];
  const filled = results.filter((v) => v !== null).length;
  if (filled < 3) {
    return {
      canSolve: false,
      solved: [A, Q, E, H],
    };
  }

  let a = A,
    q = Q,
    e = E,
    h = H;

  // Altitude
  if (h === null && a !== null && q !== null && e !== null)
    h = (a - q) * 27 + e;

  // Altimeter
  if (a === null && q !== null && e !== null && h !== null)
    a = (h - e) / 27 + q;

  // QNH
  if (q === null && a !== null && e !== null && h !== null)
    q = a - (h - e) / 27;

  // Elevation
  if (e === null && a !== null && q !== null && h !== null)
    e = h - (a - q) * 27;

  const solved = [
    a !== null ? Math.round(a * 100) / 100 : "",
    q !== null ? Math.round(q * 100) / 100 : "",
    e !== null ? Math.round(e * 100) / 100 : "",
    h !== null ? Math.round(h * 100) / 100 : "",
  ];

  return {
    canSolve: true,
    solved,
  };
}

/** Kereséshez */
function filterDb(query, db) {
  const lower = query.toLowerCase().trim();
  const terms = lower.split(" ").filter((t) => t.length >= 3);
  if (terms.length === 0) return [];
  let results = db;
  for (const term of terms) {
    const r = new RegExp(`\\b${term}\\b`, "i");
    results = results.filter((x) => r.test(x.question) || r.test(x.answer));
  }
  return results;
}

/** ======= FŐ KOMPONENS ======= */
const Calculator = () => {
  /** normál számológép állapotok */
  const [displayLines, setDisplayLines] = useState(["", "", "", "", "", "0"]);
  const [currentExpression, setCurrentExpression] = useState("0");
  const [lastResult, setLastResult] = useState(false);
  const [cursorIndex, setCursorIndex] = useState(0);
  const [showCursor, setShowCursor] = useState(true);

  /** titkos menü állapotok */
  const [secretMenu, setSecretMenu] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState(0);
  const [inSearch, setInSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredResults, setFilteredResults] = useState([]);
  const [scrollOffset, setScrollOffset] = useState(0);

  /** QNH Correction állapotok (→ mindig a 4 nyers input, STRING-ként) */
  // indexek: 0 Altimeter(hPa), 1 QNH(hPa), 2 Elevation(ft), 3 Altitude(ft)
  const [qnhActive, setQnhActive] = useState(false);
  const [qnhInputs, setQnhInputs] = useState(["", "", "", ""]);
  const [qnhSelected, setQnhSelected] = useState(0);

  /** látható keresési eredmények (max 5) */
  const VISIBLE_COUNT = 5;
  const visibleResults = filteredResults.slice(
    scrollOffset,
    scrollOffset + VISIBLE_COUNT
  );

  /** ========== RESET ========== */
  const resetCalculator = () => {
    setDisplayLines(["", "", "", "", "", "0"]);
    setCurrentExpression("0");
    setLastResult(false);
    setCursorIndex(0);
    setShowCursor(true);

    setSecretMenu(false);
    setSelectedMenu(0);
    setInSearch(false);
    setSearchQuery("");
    setFilteredResults([]);
    setScrollOffset(0);

    setQnhActive(false);
    setQnhInputs(["", "", "", ""]);
    setQnhSelected(0);
  };

  /** ========== BEVITELKEZELÉS ========== */
  const handleInput = (value) => {
    /** ------ TITKOS MENÜ ----- */
    if (secretMenu) {
      // globális AC
      if (value === "AC") {
        resetCalculator();
        return;
      }

      /** ---- QNH NÉZETBEN ---- */
      if (qnhActive) {
        // sorválasztás
        if (value === "cursorUp") {
          setQnhSelected((p) => (p > 0 ? p - 1 : 3));
          return;
        }
        if (value === "cursorDown") {
          setQnhSelected((p) => (p < 3 ? p + 1 : 0));
          return;
        }

        // backspace: ha van karakter, töröljön; ha üres a mező, vissza a Meteo listába
        if (value === "backspace") {
          setQnhInputs((prev) => {
            const next = [...prev];
            const cur = next[qnhSelected];
            if (cur && cur.length > 0) {
              next[qnhSelected] = cur.slice(0, -1);
              return next;
            }
            // üres mezőn backspace → vissza a Meteo listába
            setQnhActive(false);
            return prev;
          });
          return;
        }

        // "=": itt nem szükséges semmi külön — minden beütésre számolunk renderben
        if (value === "=") return;

        // numerikus bevitel
        const valStr = String(value);
        const isDigit = /^[0-9]$/.test(valStr);
        const isDot = valStr === ".";
        if (isDigit || isDot) {
          setQnhInputs((prev) => {
            const next = [...prev];
            const cur = next[qnhSelected] ?? "";
            if (isDot && cur.includes(".")) return prev; // csak 1 pont
            next[qnhSelected] = (cur + valStr).slice(0, 16);
            return next; // NINCS azonnali számolás itt — renderkor számolunk tisztán
          });
          return;
        }

        // más gomb: ignor
        return;
      }

      /** ---- KERESÉS NÉZETBEN ---- */
      if (inSearch) {
        if (value === "backspace") {
          setInSearch(false);
          setFilteredResults([]);
          setSearchQuery("");
          return;
        }
        if (value === "cursorUp") {
          setScrollOffset((p) => Math.max(p - 1, 0));
          return;
        }
        if (value === "cursorDown") {
          setScrollOffset((p) => {
            const maxOffset = Math.max(filteredResults.length - 5, 0);
            return Math.min(p + 1, maxOffset);
          });
          return;
        }
        return;
      }

      /** ---- MENÜ LISTÁBAN ---- */
      if (value === "cursorUp") {
        setSelectedMenu((p) => (p > 0 ? p - 1 : menuItems.length - 1));
        return;
      }
      if (value === "cursorDown") {
        setSelectedMenu((p) => (p < menuItems.length - 1 ? p + 1 : 0));
        return;
      }
      if (value === "backspace") {
        setSecretMenu(false);
        setInSearch(false);
        return;
      }
      if (value === "=") {
        if (menuItems[selectedMenu] === "Search") {
          setInSearch(true);
          return;
        }
        if (menuItems[selectedMenu] === "Meteo") {
          setQnhActive(true);
          setQnhSelected(0);
          return;
        }
        // egyéb menüpont: zárjuk a titkos menüt, mint korábban
        setSecretMenu(false);
        setInSearch(false);
        return;
      }
      return;
    }

    /** ------ NORMÁL SZÁMOLÓGÉP ----- */
    setDisplayLines((prev) => {
      let lines = [...prev];

      if (value === "AC") {
        resetCalculator();
        return ["", "", "", "", "", "0"];
      }

      if (value === "backspace") {
        if (cursorIndex > 0 && currentExpression !== "0") {
          const newExpr =
            currentExpression.slice(0, cursorIndex - 1) +
            currentExpression.slice(cursorIndex);
          const normalized = newExpr.length ? newExpr : "0";
          lines[5] = normalized;
          setCurrentExpression(normalized);
          setCursorIndex((p) => Math.max(p - 1, 0));
        }
        return lines;
      }

      if (value === "=") {
        if (currentExpression === "1111") {
          setSecretMenu(true);
          setSelectedMenu(0);
          return lines;
        }
        try {
          const evalExpr = currentExpression
            .replace(/×/g, "*")
            .replace(/÷/g, "/")
            .replace(/\^/g, "**")
            .replace(/√\(/g, "Math.sqrt(");
          const result = eval(evalExpr);
          for (let i = 0; i < 5; i++) lines[i] = lines[i + 1];
          lines[5] = String(result);
          setCurrentExpression(String(result));
          setLastResult(true);
          setCursorIndex(String(result).length);
        } catch {
          lines[5] = "Error";
          setCurrentExpression("0");
          setCursorIndex(0);
        }
        return lines;
      }

      // normál bevitel
      const val = String(value);
      const isDigit = /^[0-9]$/.test(val);
      const isOperator = /^[+\-×÷\^]$/.test(val);

      if (lastResult && isDigit) {
        for (let i = 0; i < 5; i++) lines[i] = lines[i + 1];
        lines[5] = val;
        setCurrentExpression(val);
        setCursorIndex(1);
        setLastResult(false);
        return lines;
      }
      if (lastResult && isOperator) {
        const newExprCont = currentExpression + val;
        lines[5] = newExprCont;
        setCurrentExpression(newExprCont);
        setCursorIndex(newExprCont.length);
        setLastResult(false);
        return lines;
      }

      const base = currentExpression === "0" ? "" : currentExpression;
      const newExpr =
        base.slice(0, cursorIndex) + val + base.slice(cursorIndex);
      lines[5] = newExpr;
      setCurrentExpression(newExpr);
      setCursorIndex(cursorIndex + val.length);
      setShowCursor(true);
      setLastResult(false);
      return lines;
    });
  };

  /** ======= GOMBOK ======= */
  const buttonLabels = {
    1: "√",
    2: "xy",
    3: "()",
    4: "",
    5: "AC",
    6: "",
    26: "0",
    19: "7",
    20: "8",
    21: "9",
    13: "4",
    14: "5",
    15: "6",
    7: "1",
    8: "2",
    9: "3",
    25: "backspace",
    30: "=",
    28: "+",
    22: "-",
    16: "×",
    10: "÷",
    27: ".",
    18: "cursorUp",
    24: "cursorDown",
  };
  const buttons = Array.from({ length: 30 }, (_, i) => i + 1);

  /** ======= RENDER ======= */

  // QNH: pillanatnyi megjelenítendő értékek (a 4 közül a hiányzót kiszámoljuk, de NEM írjuk vissza state-be)
  const solved = solveQnhOnTheFly(qnhInputs);
  const qnhDisplay = solved.canSolve
    ? solved.solved // a teljesen kiszámolt tömböt mutatja (A, Q, E, H)
    : qnhInputs; // ha még nincs elég adat, akkor az eredeti beírt értékeket

  return (
    <div className="calc-container">
      <div className="calc-screen">
        {secretMenu ? (
          <div className="secret-menu">
            {inSearch ? (
              <div className="search-area">
                <div className="search-bar">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSearchQuery(val);
                      setFilteredResults(filterDb(val, database));
                      setScrollOffset(0);
                    }}
                    placeholder="Type to search..."
                    className="search-input"
                  />
                </div>
                {visibleResults.length > 0 && (
                  <div className="results">
                    {visibleResults.map((item) => (
                      <div key={item.id} className="result-item">
                        <div className="result-q">{item.question}</div>
                        <div className="result-a">{item.answer}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : qnhActive ? (
              // ===== QNH MODUL: címsor + 4 teljes szélességű sor (mint a menüelemek) =====
              <div className="w-full h-full flex flex-col text-left text-base">
                <div
                  className="menu-item selected"
                  style={{ fontWeight: "bold" }}
                >
                  QNH Correction
                </div>

                {/* Altimeter (hPa) */}
                <div
                  className={`menu-item ${qnhSelected === 0 ? "selected" : ""}`}
                  onClick={() => setQnhSelected(0)}
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span>Altimeter (hPa)</span>
                  <span>{qnhDisplay[0]}</span>
                </div>

                {/* QNH (hPa) */}
                <div
                  className={`menu-item ${qnhSelected === 1 ? "selected" : ""}`}
                  onClick={() => setQnhSelected(1)}
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span>QNH (hPa)</span>
                  <span>{qnhDisplay[1]}</span>
                </div>

                {/* Elevation (ft) */}
                <div
                  className={`menu-item ${qnhSelected === 2 ? "selected" : ""}`}
                  onClick={() => setQnhSelected(2)}
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span>Elevation (ft)</span>
                  <span>{qnhDisplay[2]}</span>
                </div>

                {/* Altitude (ft) */}
                <div
                  className={`menu-item ${qnhSelected === 3 ? "selected" : ""}`}
                  onClick={() => setQnhSelected(3)}
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span>Altitude (ft)</span>
                  <span>{qnhDisplay[3]}</span>
                </div>
              </div>
            ) : (
              // ===== Titkos menü lista =====
              menuItems.map((item, idx) => (
                <div
                  key={idx}
                  className={`menu-item ${
                    selectedMenu === idx ? "selected" : ""
                  }`}
                >
                  {item}
                </div>
              ))
            )}
          </div>
        ) : (
          // ===== Normál kijelző (6 soros) =====
          displayLines.map((line, idx) => {
            let startIdx = 0;
            const totalLength = line.length;
            if (totalLength > maxVisibleChars)
              startIdx = Math.max(totalLength - maxVisibleChars, 0);
            const visibleRaw = line.slice(startIdx, startIdx + maxVisibleChars);

            return (
              <div key={idx} className="line">
                <span className="line-content">
                  {visibleRaw}
                  {idx === 5 && showCursor && (
                    <span
                      className="cursor animate-blink"
                      style={{
                        right: `${
                          (visibleRaw.length - cursorIndex) * charWidthPx
                        }px`,
                      }}
                    />
                  )}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* GOMBOK */}
      <div className="button-grid">
        {buttons.map((num) => {
          const label = buttonLabels[num];
          const onClickValue =
            num === 18 ? "cursorUp" : num === 24 ? "cursorDown" : label;

          return (
            <button
              key={num}
              onClick={() => handleInput(onClickValue)}
              className="btn"
            >
              {label === "backspace" ? (
                <IoBackspaceOutline />
              ) : label === "cursorUp" ? (
                <BsArrowBarUp />
              ) : label === "cursorDown" ? (
                <BsArrowBarDown />
              ) : (
                label
              )}
            </button>
          );
        })}
      </div>

      {/* ======= STYLES (CSS) ======= */}
      <style>{`
        /* Layout */
        .calc-container {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; min-height: 100vh; background: #111827;
          gap: 20px; font-family: monospace;
        }
        .calc-screen {
          width: 480px; height: 480px; background: #000; color: #fff;
          border: 1px solid #d1d5db; border-radius: 8px; padding: 16px;
          display: flex; flex-direction: column; justify-content: flex-end; align-items: flex-end;
          overflow: hidden; font-size: 1.5rem;
        }
        .line { width: 100%; text-align: right; position: relative; }
        .line-content { display: inline-flex; justify-content: flex-end; width: 100%; position: relative; }
        .cursor { position: absolute; border-left: 2px solid white; height: 1em; top: 0; }
        @keyframes blink { 0%,100%{opacity:1;} 50%{opacity:0;} }
        .animate-blink { animation: blink 1s step-start infinite; }

        /* Secret menu + QNH */
        .secret-menu { width: 100%; height: 100%; display: flex; flex-direction: column; text-align: left; font-size: 1rem; }
        .menu-item {
          padding: 8px 12px; border-bottom: 1px solid #4b5563;
          background: #1f2937; transition: background .2s, color .2s;
        }
        .menu-item.selected { background: #fff; color: #000; }

        /* Search area */
        .search-area { display: flex; flex-direction: column; overflow-y: hidden; height: 100%; }
        .search-bar { border: 1px solid #6b7280; padding: 4px; background: #1f2937; margin-bottom: 4px; position: sticky; top: 0; }
        .search-input { width: 100%; padding: 6px 8px; font-size: .9rem; border-radius: 4px; border: none; outline: none; }
        .results { display: flex; flex-direction: column; gap: 8px; transition: all .2s; }
        .result-item { border: 1px solid #4b5563; padding: 8px; border-radius: 6px; background: #1f2937; }
        .result-q { font-weight: bold; font-size: .75rem; }
        .result-a { color: #4ade80; font-size: .75rem; }

        /* Keypad */
        .button-grid {
          display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px;
          background: #1f2937; padding: 12px; border-radius: 10px; max-width: 480px; width: 100%;
        }
        .btn {
          background: #374151; color: #fff; padding: 18px; border-radius: 8px;
          font-size: 1.2rem; font-weight: bold; display: flex; align-items: center; justify-content: center;
          border: none; cursor: pointer; height: 68px;
        }
        .btn:hover { background: #4b5563; }
      `}</style>
    </div>
  );
};

export default Calculator;
