import React, { useState, useEffect, useRef } from "react";
import "./NavigationLog.css";
import Keypad from "./keypad";
import TimePicker from "./timePicker";
import "./timePicker.css";

const NavigationLog = () => {
  const [showKeypad, setShowKeypad] = useState(false);
  const [activeInput, setActiveInput] = useState(null);

  const [inputValues, setInputValues] = useState(() => {
    try {
      const raw = localStorage.getItem("navigation_inputs");
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (e) {
      console.warn("Failed to read navigation_inputs on init", e);
      return {};
    }
  });

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [activeAtoIndex, setActiveAtoIndex] = useState(null);

  const [atoValues, setAtoValues] = useState(() => {
    try {
      const raw = localStorage.getItem("navigation_ato_times");
      if (!raw) return {};
      let parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const obj = {};
        parsed.forEach((val, i) => {
          if (val !== null && val !== undefined && val !== "") obj[i] = val;
        });
        parsed = obj;
      } else if (!parsed || typeof parsed !== "object") {
        parsed = {};
      }
      return parsed;
    } catch (e) {
      console.warn("Failed to read navigation_ato_times on init", e);
      return {};
    }
  });

  // legTimes persisted array (13 items)
  const [legTimes, setLegTimes] = useState(() => {
    try {
      const raw = localStorage.getItem("navigation_leg_times");
      if (!raw) return Array(13).fill("");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed))
        return parsed.concat(Array(13 - parsed.length).fill("")).slice(0, 13);
      return Array(13).fill("");
    } catch (e) {
      console.warn("Failed to read navigation_leg_times on init", e);
      return Array(13).fill("");
    }
  });

  const initializedRef = useRef(false);
  useEffect(() => {
    initializedRef.current = true;
  }, []);

  useEffect(() => {
    if (!initializedRef.current) return;
    try {
      localStorage.setItem("navigation_inputs", JSON.stringify(inputValues));
    } catch (e) {
      console.warn("Failed to save navigation_inputs:", e);
    }
  }, [inputValues]);

  useEffect(() => {
    if (!initializedRef.current) return;
    try {
      localStorage.setItem("navigation_ato_times", JSON.stringify(atoValues));
    } catch (e) {
      console.warn("Failed to save navigation_ato_times:", e);
    }
  }, [atoValues]);

  useEffect(() => {
    if (!initializedRef.current) return;
    try {
      localStorage.setItem("navigation_leg_times", JSON.stringify(legTimes));
    } catch (e) {
      console.warn("Failed to save navigation_leg_times:", e);
    }
  }, [legTimes]);

  // Recompute ETOs whenever ATOs or LegTimes change
  const calculateNewEto = (ato, legTime) => {
    if (!ato || typeof ato !== "string") return "";
    const atoParts = ato.split(":").map((v) => Number(v));
    if (atoParts.length !== 2 || atoParts.some((n) => Number.isNaN(n)))
      return "";
    const atoMinutes = atoParts[0] * 60 + atoParts[1];

    let legMinutes = 0;
    if (!legTime) legMinutes = 0;
    else if (typeof legTime === "string" && legTime.includes(":")) {
      const lp = legTime.split(":").map((v) => Number(v));
      if (lp.length === 2 && !lp.some((n) => Number.isNaN(n))) {
        legMinutes = lp[0] * 60 + lp[1];
      }
    } else {
      const n = Number(String(legTime).replace(",", "."));
      legMinutes = Number.isFinite(n) ? Math.round(n) : 0;
    }

    const total = atoMinutes + legMinutes;
    const hh = Math.floor(total / 60) % 24;
    const mm = total % 60;
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(hh)}:${pad(mm)}`;
  };

  useEffect(() => {
    setInputValues((prev) => {
      const next = { ...prev };
      for (let i = 0; i < 13; i++) {
        const ato = atoValues[i];
        const key = `eto${i + 2}`; // ETO2 corresponds to ato index 0
        if (ato) {
          const newEto = calculateNewEto(ato, legTimes[i]);
          if (newEto) next[key] = newEto;
          else delete next[key];
        } else {
          if (next[key]) delete next[key];
        }
      }
      return next;
    });
  }, [atoValues, legTimes]);

  const handleInputFocus = (inputId) => {
    setShowKeypad(true);
    setActiveInput(inputId);
  };

  const handleKeypadSubmit = (value) => {
    if (activeInput && activeInput.startsWith("legTime")) {
      const idx = Number(activeInput.replace("legTime", ""));
      if (!Number.isNaN(idx) && idx >= 0 && idx < 13) {
        setLegTimes((prev) => {
          const copy = [...prev];
          copy[idx] = value;
          return copy;
        });
      }
    } else {
      setInputValues((prev) => ({
        ...prev,
        [activeInput]: value,
      }));
    }
    setShowKeypad(false);
    setActiveInput(null);
  };

  const handleAtoClick = (index) => {
    setActiveAtoIndex(index);
    setShowTimePicker(true);
  };

  const handleTimeSubmit = (timeStr) => {
    if (activeAtoIndex !== null) {
      setAtoValues((prev) => ({
        ...prev,
        [activeAtoIndex]: timeStr,
      }));
    }
    setShowTimePicker(false);
    setActiveAtoIndex(null);
  };

  // --- új: Delete gombhoz ---
  const handleTimeDelete = () => {
    if (activeAtoIndex !== null) {
      setAtoValues((prev) => {
        const copy = { ...prev };
        if (copy.hasOwnProperty(activeAtoIndex)) delete copy[activeAtoIndex];
        return copy;
      });
    }
    setShowTimePicker(false);
    setActiveAtoIndex(null);
  };
  // --- vége ---

  const handleTrainerReset = () => {
    setInputValues({});
    setAtoValues({});
    setLegTimes(Array(13).fill("")); // Reset leg times
    localStorage.removeItem("navigation_inputs");
    localStorage.removeItem("navigation_ato_times");
    localStorage.removeItem("navigation_leg_times");
  };

  // Waypoint list (no "Type another" in the array)
  const waypointList = [
    "Ajak",
    "Apagy",
    "Baktalórántháza",
    "Békés",
    "BKS VOR",
    "Dombrád",
    "Ebes / EBES",
    "Edelény",
    "Földes",
    "Gávavencsellő",
    "Hajdúböszörmény",
    "Józsefháza",
    "JOZA",
    "Kálmánháza",
    "Kótaj",
    "LHBC",
    "LHDC",
    "LHNY",
    "Mátészalka",
    "NCS",
    "Nyíradony",
    "Nyírbátor",
    "Nyíregyháza VOR",
    "PERIT",
    "Polgár",
    "ROMKA",
    "Sárospatak",
    "SAG VOR",
    "Szerencs",
    "Szeghalom",
    "Tiszalúc",
    "Tiszavasvári",
    "Újfehértó",
    "Újszentmargita",
  ];

  const [showWaypointPicker, setShowWaypointPicker] = useState(false);
  const [activeWaypointIndex, setActiveWaypointIndex] = useState(null);

  const handleWaypointClick = (index) => {
    setActiveWaypointIndex(index);
    setShowWaypointPicker(true);
  };

  const handleWaypointSelect = (name) => {
    if (activeWaypointIndex === null) return;
    setInputValues((prev) => ({
      ...prev,
      [`wp${activeWaypointIndex}`]: name,
    }));
    setShowWaypointPicker(false);
    setActiveWaypointIndex(null);
  };

  const handleAddAnotherClick = () => {
    if (activeWaypointIndex === null) return;
    setShowWaypointPicker(false);
    setActiveInput(`wp${activeWaypointIndex}`);
    setShowKeypad(true);
  };

  return (
    <div className="navigation-log">
      <div className="header">
        <div className="title">
          <h1>Navigation Log</h1>
        </div>
        <div className="logo">
          <img
            src="trener_logo.png"
            alt="Tréner"
            style={{ cursor: "pointer" }}
            onClick={handleTrainerReset}
          />
        </div>
      </div>
      <div className="table-container">
        <div className="">
          <p>Call Sign:</p>
          <input
            type="text"
            readOnly
            onClick={() => handleInputFocus("callSign")}
            value={inputValues["callSign"] || ""}
          />
        </div>
        <div>
          <p>Squawk:</p>
          <input
            type="text"
            readOnly
            onClick={() => handleInputFocus("squawk")}
            value={inputValues["squawk"] || ""}
          />
        </div>
        <div>
          <p>QNH:</p>
          <input
            type="text"
            readOnly
            onClick={() => handleInputFocus("qnh")}
            value={inputValues["qnh"] || ""}
          />
        </div>
        <div className="">
          <p>COFF-Block:</p>
          <input
            type="text"
            readOnly
            onClick={() => handleInputFocus("coffBlock")}
            value={inputValues["coffBlock"] || ""}
          />
        </div>
        <div>
          <p>ON-Block:</p>
          <input
            type="text"
            readOnly
            onClick={() => handleInputFocus("onBlock")}
            value={inputValues["onBlock"] || ""}
          />
        </div>
        <div>
          <p>Flight Time:</p>
          <input
            type="text"
            readOnly
            onClick={() => handleInputFocus("flightTime")}
            value={inputValues["flightTime"] || ""}
          />
        </div>
      </div>

      <div className="main-container">
        <div className="left-column">
          <div className="row">
            <div className="cell">Waypoint Name</div>
            <div className="cell">ETO</div>
            <div className="cell">ATO</div>
          </div>

          {/* Render 13 ATO rows dynamically (0..12) */}
          {[...Array(13)].map((_, idx) => (
            <div className={`row ${idx === 12 ? "last-row" : ""}`} key={idx}>
              <div
                className="cell"
                style={{ cursor: "pointer" }}
                onClick={() => handleWaypointClick(idx)}
              >
                {inputValues[`wp${idx}`] || ""}
              </div>
              <div className="cell">{inputValues[`eto${idx + 1}`] || ""}</div>
              <div
                className="cell"
                style={{ cursor: "pointer", userSelect: "none" }}
                onClick={() => handleAtoClick(idx)}
              >
                {atoValues[idx] || ""}
              </div>
            </div>
          ))}
        </div>

        <div className="right-column">
          <div className="row">
            <div className="cell">Leg Time</div>
            <div className="cell">Dist. (nm)</div>
            <div className="cell">Mag. HDG</div>
            <div className="cell">W/V</div>
            <div className="cell">Mag. Track</div>
            <div className="cell">Alt</div>
            <div className="cell">MSA</div>
          </div>

          {/* Render 13 rows for right column */}
          {[...Array(13)].map((_, index) => (
            <div className="row" key={index}>
              <div
                className="cell"
                onClick={() => handleInputFocus(`legTime${index}`)}
                style={{ cursor: "pointer" }}
              >
                {legTimes[index] || ""}
              </div>
              <div
                className="cell"
                onClick={() => handleInputFocus(`distance${index}`)}
                style={{ cursor: "pointer" }}
              >
                {inputValues[`distance${index}`] || ""}
              </div>
              <div
                className="cell"
                onClick={() => handleInputFocus(`magHDG${index}`)}
                style={{ cursor: "pointer" }}
              >
                {inputValues[`magHDG${index}`] || ""}
              </div>
              <div
                className="cell"
                onClick={() => handleInputFocus(`wind${index}`)}
                style={{ cursor: "pointer" }}
              >
                {inputValues[`wind${index}`] || ""}
              </div>
              <div
                className="cell"
                onClick={() => handleInputFocus(`magTrack${index}`)}
                style={{ cursor: "pointer" }}
              >
                {inputValues[`magTrack${index}`] || ""}
              </div>
              <div
                className="cell"
                onClick={() => handleInputFocus(`alt${index}`)}
                style={{ cursor: "pointer" }}
              >
                {inputValues[`alt${index}`] || ""}
              </div>
              <div
                className="cell"
                onClick={() => handleInputFocus(`msa${index}`)}
                style={{ cursor: "pointer" }}
              >
                {inputValues[`msa${index}`] || ""}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="block-container">
        <div className="row">
          <div className="cell">NAV/COM frequencies</div>
          <div className="cell"></div>
          <div className="cell">Fuel Calculation</div>
        </div>

        <div className="row">
          <div className="cell"></div>
          <div className="cell"></div>
          <div className="cell"></div>
          <div className="cell"></div>
          <div className="cell">trip</div>
          <div className="cell"></div>
        </div>
        <div className="row">
          <div className="cell"></div>
          <div className="cell"></div>
          <div className="cell"></div>
          <div className="cell"></div>
          <div className="cell">cont. 5%</div>
          <div className="cell"></div>
        </div>
        <div className="row">
          <div className="cell"></div>
          <div className="cell"></div>
          <div className="cell"></div>
          <div className="cell"></div>
          <div className="cell">alternate</div>
          <div className="cell"></div>
        </div>
        <div className="row">
          <div className="cell"></div>
          <div className="cell"></div>
          <div className="cell"></div>
          <div className="cell"></div>
          <div className="cell">reserve</div>
          <div className="cell"></div>
        </div>
        <div className="row">
          <div className="cell"></div>
          <div className="cell"></div>
          <div className="cell"></div>
          <div className="cell"></div>
          <div className="cell">extra</div>
          <div className="cell"></div>
        </div>
        <div className="row">
          <div className="cell"></div>
          <div className="cell"></div>
          <div className="cell"></div>
          <div className="cell"></div>
          <div className="cell">taxi</div>
          <div className="cell"></div>
        </div>
        <div className="row">
          <div className="cell"></div>
          <div className="cell"></div>
          <div className="cell"></div>
          <div className="cell"></div>
          <div className="cell">Block</div>
          <div className="cell"></div>
        </div>
      </div>

      <div className="custom-final-block">
        <div className="custom-left-column">
          <div className="custom-row custom-full-width">
            <div className="custom-cell">Fuel Monitoring</div>
          </div>

          <div className="custom-row">
            <div className="custom-cell">Time</div>
            <div className="custom-cell">Fuel in tanks</div>
            <div className="custom-cell">Fuel rmg.</div>
            <div className="custom-cell">Consumption G/h</div>
            <div className="custom-cell">Safe Endurance</div>
            <div className="custom-cell">ETA at limit of safe endurance</div>
          </div>
          {[...Array(5)].map((_, index) => (
            <div className="custom-row" key={index}>
              <div className="custom-cell"></div>
              <div className="custom-cell"></div>
              <div className="custom-cell"></div>
              <div className="custom-cell"></div>
              <div className="custom-cell"></div>
              <div className="custom-cell"></div>
            </div>
          ))}

          <div
            className="custom-row custom-full-width"
            style={{ height: "100px" }}
          >
            <div className="custom-cell">Additional Information</div>
          </div>
        </div>

        <div className="custom-right-column">
          <img
            src="trener_wind.png"
            alt="Tréner"
            className="wind-correction-img"
          />
        </div>
      </div>
      <div className="form"></div>

      <Keypad
        isVisible={showKeypad}
        onClose={() => setShowKeypad(false)}
        onSubmit={handleKeypadSubmit}
        initialValue={inputValues[activeInput] || ""} // If no saved value, it will be empty
        style={{ width: "95vw", maxWidth: "95vw" }} // Set width to 95% of the viewport width
      />

      <TimePicker
        isVisible={showTimePicker}
        onClose={() => {
          setShowTimePicker(false);
          setActiveAtoIndex(null);
        }}
        initialTime={
          activeAtoIndex !== null ? atoValues[activeAtoIndex] || "" : ""
        }
        onSave={handleTimeSubmit}
        onDelete={handleTimeDelete}
      />

      {showWaypointPicker && (
        <div
          className="tp-overlay"
          style={{ zIndex: 1300 }}
          onMouseDown={() => {
            setShowWaypointPicker(false);
            setActiveWaypointIndex(null);
          }}
        >
          <div
            className="waypoint-picker-container tp-modal"
            onMouseDown={(e) => e.stopPropagation()}
            style={{ width: 600, maxWidth: "95vw" }} // width set in code per kérés
          >
            <div className="tp-header">
              <h3>Select Waypoint</h3>
            </div>
            <div style={{ maxHeight: 420, overflowY: "auto", padding: 12 }}>
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {waypointList.map((wp) => (
                  <li key={wp}>
                    <button
                      onClick={() => handleWaypointSelect(wp)}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        padding: "12px",
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        borderRadius: 6,
                        fontSize: "1.5rem",
                      }}
                    >
                      {wp}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Add another button under the list */}
            <div
              style={{
                padding: 12,
                borderTop: "1px solid #eee",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <button
                onClick={handleAddAnotherClick}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 16px",
                  fontSize: "1.05rem",
                  borderRadius: 8,
                  border: "1px solid #ddd",
                  background: "#fafafa",
                  cursor: "pointer",
                }}
              >
                <span style={{ fontSize: "1.4rem", lineHeight: 1 }}>+</span> Add
                another
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NavigationLog;
