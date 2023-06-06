import { useState, useEffect } from "react";

/**
 * Custom hook to manage alert state.
 */
const useAlert = (duration = 5000) => {
  const [alert, setAlert] = useState({ show: false, msg: "", type: "" });

  /**
   * Displays or updates the alert with specified properties.
   * @param {boolean} [show=false] - Whether to show the alert.
   * @param {string} [msg=""] - The message to display in the alert.
   * @param {string} [type=""] - The type of alert (e.g., "error").
   */
  const showAlert = (show = false, msg = "", type = "") => {
    setAlert({ show, msg, type });
  };

  /**
   * Displays an error alert that auto-hides after a duration.
   * @param {number} [duration=5000] - The duration in milliseconds before the alert hides.
   */
  const showError = (duration = 5000) => {
    setAlert({ show: true, msg: "", type: "error" });
    setTimeout(() => {
      setAlert({ show: false, msg: "", type: "" });
    }, duration);
  };

  /**
   * Auto-hides the alert after the specified duration when shown.
   */
  useEffect(() => {
    let timer;

    if (alert.show) {
      timer = setTimeout(() => {
        setAlert({ show: false, msg: "", type: "" });
      }, duration);
    }

    return () => clearTimeout(timer);
  }, [alert.show, duration]);

  return [alert, showAlert, showError];
};

export default useAlert;
