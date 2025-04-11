import { useState, useEffect } from "react";
import { AlertTypes } from "../models/alert";

/**
 * Custom hook to manage alert state.
 */
const useAlert = (
  duration: number = 5000
): [AlertTypes, (show?: boolean, msg?: string, type?: string) => void] => {
  const [alert, setAlert] = useState<AlertTypes>({
    show: false,
    msg: "",
    type: "",
  });

  /**
   * Displays or updates the alert with specified properties.
   * @param {boolean} [show=false] - Whether to show the alert.
   * @param {string} [msg=""] - The message to display in the alert.
   * @param {string} [type=""] - The type of alert (e.g., "error").
   */
  const showAlert = (
    show: boolean = false,
    msg: string = "",
    type: string = ""
  ): void => {
    setAlert({ show, msg, type });
  };

  /**
   * Auto-hides the alert after the specified duration when shown.
   */
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;

    if (alert.show) {
      timer = setTimeout(() => {
        setAlert({ show: false, msg: "", type: "" });
      }, duration);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [alert.show, duration]);

  return [alert, showAlert];
};

export default useAlert;
