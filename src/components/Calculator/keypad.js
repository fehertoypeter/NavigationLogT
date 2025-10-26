import React, { useState, useEffect } from "react";
import "./keypad.css";

const Keypad = ({ isVisible, onClose, onSubmit, initialValue = "" }) => {
  const [inputValue, setInputValue] = useState(initialValue);

  // Update keys array to include hyphen
  const keys = [
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-"],
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["Z", "X", "C", "V", "B", "N", "M", ".", "!", "?"],
  ];

  // Reset inputValue when initialValue changes
  useEffect(() => {
    setInputValue(initialValue);
  }, [initialValue]);

  const handleKeyClick = (key) => {
    setInputValue((prev) => prev + key);
  };

  const handleBackspace = () => {
    setInputValue((prev) => prev.slice(0, -1));
  };

  const handleSubmit = () => {
    onSubmit(inputValue);
    onClose();
  };

  const handleOverlayClick = (e) => {
    if (e.target.classList.contains("keypad-overlay")) {
      onSubmit(inputValue);
      onClose();
    }
  };

  useEffect(() => {
    if (isVisible) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="keypad-overlay" onClick={handleOverlayClick}>
      <div className="keypad-container">
        <div className="keypad-input-display">
          {inputValue === "" ? "Type something..." : inputValue}
        </div>
        <div className="keypad-grid">
          {keys.map((row, rowIndex) => (
            <div key={rowIndex} className="keypad-row">
              {row.map((key) => (
                <button
                  key={key}
                  className="keypad-key"
                  onClick={() => handleKeyClick(key)}
                >
                  {key}
                </button>
              ))}
            </div>
          ))}
          <div className="keypad-row">
            <button
              className="keypad-key keypad-key-wide"
              data-action="backspace"
              onClick={handleBackspace}
            >
              ⌫
            </button>
            <button
              className="keypad-key keypad-key-wide tp-save"
              data-action="enter"
              onClick={handleSubmit}
            >
              Enter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Keypad;
