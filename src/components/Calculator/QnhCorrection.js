import React, { useState, useEffect } from "react";

/**
 * QNH Correction Component
 * Formula: (Altimeter - QNH) * 27 + Elevation = Altitude
 * User can input any 3 of 4 fields, the missing one is auto-calculated.
 */

const QnhCorrection = () => {
  const [fields, setFields] = useState({
    Altimeter: "",
    QNH: "",
    Elevation: "",
    Altitude: "",
  });

  const [units, setUnits] = useState({
    Altimeter: "hPa",
    QNH: "hPa",
    Elevation: "ft",
    Altitude: "ft",
  });

  const [activeField, setActiveField] = useState("Altimeter");
  const [inputValue, setInputValue] = useState("");

  // --- Conversion helpers ---
  const pressureToHpa = (val, unit) => {
    if (unit === "hPa") return val;
    if (unit === "Pa") return val / 100;
    if (unit === "inHg") return val * 33.8639;
  };
  const fromHpa = (val, unit) => {
    if (unit === "hPa") return val;
    if (unit === "Pa") return val * 100;
    if (unit === "inHg") return val / 33.8639;
  };

  const heightToFt = (val, unit) => {
    if (unit === "ft") return val;
    if (unit === "m") return val / 0.3048;
    if (unit === "km") return val / 0.0003048;
  };
  const fromFt = (val, unit) => {
    if (unit === "ft") return val;
    if (unit === "m") return val * 0.3048;
    if (unit === "km") return val * 0.0003048;
  };

  // --- Automatic recalculation logic ---
  useEffect(() => {
    const filled = Object.entries(fields)
      .filter(([_, v]) => v !== "" && !isNaN(v))
      .map(([k]) => k);

    if (filled.length < 3) return; // need at least 3 fields

    const A = parseFloat(pressureToHpa(fields.Altimeter, units.Altimeter));
    const Q = parseFloat(pressureToHpa(fields.QNH, units.QNH));
    const E = parseFloat(heightToFt(fields.Elevation, units.Elevation));
    const T = parseFloat(heightToFt(fields.Altitude, units.Altitude));

    let resultField = Object.keys(fields).find((f) => !filled.includes(f));
    if (!resultField)
      resultField = Object.keys(fields).find((f) => fields[f] === "");

    let result = "";

    try {
      switch (resultField) {
        case "Altimeter":
          result = Q + (T - E) / 27;
          result = fromHpa(result, units.Altimeter);
          break;
        case "QNH":
          result = A - (T - E) / 27;
          result = fromHpa(result, units.QNH);
          break;
        case "Elevation":
          result = T - (A - Q) * 27;
          result = fromFt(result, units.Elevation);
          break;
        case "Altitude":
          result = (A - Q) * 27 + E;
          result = fromFt(result, units.Altitude);
          break;
        default:
          break;
      }
      if (result && !isNaN(result)) {
        setFields((prev) => ({
          ...prev,
          [resultField]: parseFloat(result.toFixed(2)),
        }));
      }
    } catch (err) {
      console.error("Calculation error:", err);
    }
  }, [fields, units]);

  // --- Handle numeric keypad input ---
  const handleKey = (val) => {
    if (val === "AC") {
      setFields((prev) => ({ ...prev, [activeField]: "" }));
      setInputValue("");
      return;
    }
    if (val === "←") {
      setInputValue((p) => p.slice(0, -1));
      return;
    }
    if (val === "UNIT") {
      toggleUnit();
      return;
    }
    if (val === "=") {
      setFields((prev) => ({
        ...prev,
        [activeField]: parseFloat(inputValue) || "",
      }));
      setInputValue("");
      return;
    }
    setInputValue((p) => (p + val).slice(0, 12));
  };

  // --- Unit toggling ---
  const toggleUnit = () => {
    const current = units[activeField];
    let newUnit;
    if (["Altimeter", "QNH"].includes(activeField)) {
      if (current === "hPa") newUnit = "Pa";
      else if (current === "Pa") newUnit = "inHg";
      else newUnit = "hPa";
    } else {
      if (current === "ft") newUnit = "m";
      else if (current === "m") newUnit = "km";
      else newUnit = "ft";
    }
    // convert current field value to new unit
    const currentVal = fields[activeField];
    let valHpaFt = ["Altimeter", "QNH"].includes(activeField)
      ? pressureToHpa(currentVal, current)
      : heightToFt(currentVal, current);
    const converted = ["Altimeter", "QNH"].includes(activeField)
      ? fromHpa(valHpaFt, newUnit)
      : fromFt(valHpaFt, newUnit);

    setUnits((prev) => ({ ...prev, [activeField]: newUnit }));
    if (currentVal !== "")
      setFields((prev) => ({
        ...prev,
        [activeField]: parseFloat(converted.toFixed(2)),
      }));
  };

  // --- UI ---
  const keypad = [
    ["7", "8", "9", "AC", "UNIT", "←"],
    ["4", "5", "6", ".", "", ""],
    ["1", "2", "3", "=", "", ""],
    ["0", "", "", "", "", ""],
  ];

  return (
    <div className="flex flex-col items-center w-full text-white font-mono">
      <h2 className="text-2xl font-bold mb-4 text-center">QNH Correction</h2>

      <div className="w-full max-w-md bg-gray-900 p-4 rounded-lg shadow-lg">
        {Object.keys(fields).map((key) => (
          <div
            key={key}
            className={`flex justify-between items-center py-2 px-2 mb-2 rounded cursor-pointer ${
              activeField === key ? "bg-gray-700" : "bg-gray-800"
            }`}
            onClick={() => {
              setActiveField(key);
              setInputValue(fields[key].toString());
            }}
          >
            <span className="text-sm">{key}</span>
            <span className="text-right">
              {fields[key]}{" "}
              <span className="text-gray-400 text-xs">{units[key]}</span>
            </span>
          </div>
        ))}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-6 gap-2 mt-4 bg-gray-800 p-3 rounded-lg w-full max-w-md">
        {keypad.flat().map((key, i) =>
          key ? (
            <button
              key={i}
              onClick={() => handleKey(key)}
              className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition"
            >
              {key}
            </button>
          ) : (
            <div key={i}></div>
          )
        )}
      </div>
    </div>
  );
};

export default QnhCorrection;
