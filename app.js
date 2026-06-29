(function () {
  "use strict";

  const OPS = { "+": "+", "-": "−", "*": "×", "/": "÷" };

  const state = {
    current: "0",
    previous: null,
    operator: null,
    waitingForOperand: false,
    expression: "",
    justEvaluated: false,
  };

  const displayEl = document.getElementById("display");
  const expressionEl = document.getElementById("expression");

  function render() {
    const formatted = formatNumber(state.current);
    displayEl.textContent = formatted;
    expressionEl.textContent = state.expression;

    const len = formatted.replace(/[^0-9.]/g, "").length;
    if (len > 9) {
      displayEl.style.fontSize = "clamp(1.5rem, 8vw, 2.5rem)";
    } else if (len > 7) {
      displayEl.style.fontSize = "clamp(2rem, 10vw, 3.25rem)";
    } else {
      displayEl.style.fontSize = "";
    }
  }

  function formatNumber(value) {
    if (value === "Error") return "Error";
    if (value.includes(".") && value.endsWith(".")) {
      const intPart = value.split(".")[0];
      return numberWithCommas(intPart) + ".";
    }
    if (value.includes(".")) {
      const [intPart, decPart] = value.split(".");
      return numberWithCommas(intPart) + "." + decPart;
    }
    return numberWithCommas(value);
  }

  function numberWithCommas(numStr) {
    const isNeg = numStr.startsWith("-");
    const abs = isNeg ? numStr.slice(1) : numStr;
    const withCommas = abs.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return isNeg ? "-" + withCommas : withCommas;
  }

  function calculate(a, op, b) {
    const x = parseFloat(a);
    const y = parseFloat(b);
    if (isNaN(x) || isNaN(y)) return "Error";
    switch (op) {
      case "+": return safeResult(x + y);
      case "-": return safeResult(x - y);
      case "*": return safeResult(x * y);
      case "/": return y === 0 ? "Error" : safeResult(x / y);
      default: return b;
    }
  }

  function safeResult(num) {
    if (!isFinite(num)) return "Error";
    const str = String(num);
    if (str.length > 12) {
      return parseFloat(num.toPrecision(10)).toString();
    }
    return str;
  }

  // ── Actions ─────────────────────────────────────────

  function inputNumber(digit) {
    if (state.justEvaluated) {
      state.current = digit;
      state.expression = "";
      state.justEvaluated = false;
      state.waitingForOperand = false;
      render();
      return;
    }
    if (state.waitingForOperand) {
      state.current = digit;
      state.waitingForOperand = false;
    } else {
      if (state.current === "0" && digit !== "0") {
        state.current = digit;
      } else if (state.current === "0" && digit === "0") {
        return;
      } else {
        if (state.current.replace("-", "").replace(".", "").length >= 12) return;
        state.current += digit;
      }
    }
    render();
  }

  function inputDecimal() {
    if (state.justEvaluated) {
      state.current = "0.";
      state.expression = "";
      state.justEvaluated = false;
      state.waitingForOperand = false;
      render();
      return;
    }
    if (state.waitingForOperand) {
      state.current = "0.";
      state.waitingForOperand = false;
      render();
      return;
    }
    if (!state.current.includes(".")) {
      state.current += ".";
    }
    render();
  }

  function inputOperator(op) {
    clearOperatorHighlights();

    if (state.justEvaluated) {
      state.previous = state.current;
      state.operator = op;
      state.expression = formatNumber(state.current) + " " + OPS[op];
      state.waitingForOperand = true;
      state.justEvaluated = false;
      render();
      return;
    }

    if (state.operator && !state.waitingForOperand) {
      const result = calculate(state.previous, state.operator, state.current);
      if (result === "Error") {
        reset();
        state.current = "Error";
        render();
        return;
      }
      state.current = result;
      state.previous = result;
    } else {
      state.previous = state.current;
    }

    state.operator = op;
    state.expression = formatNumber(state.previous) + " " + OPS[op];
    state.waitingForOperand = true;
    render();

    highlightOperator(op);
  }

  function evaluate() {
    if (!state.operator || state.waitingForOperand) return;

    clearOperatorHighlights();

    const result = calculate(state.previous, state.operator, state.current);
    state.expression =
      formatNumber(state.previous) +
      " " +
      OPS[state.operator] +
      " " +
      formatNumber(state.current) +
      " =";

    if (result === "Error") {
      reset();
      state.current = "Error";
      state.expression = "";
      render();
      return;
    }

    state.current = result;
    state.previous = null;
    state.operator = null;
    state.waitingForOperand = false;
    state.justEvaluated = true;
    render();
  }

  function toggleSign() {
    if (state.current === "0" || state.current === "Error") return;
    if (state.current.startsWith("-")) {
      state.current = state.current.slice(1);
    } else {
      state.current = "-" + state.current;
    }
    render();
  }

  function applyPercent() {
    if (state.current === "Error") return;
    const num = parseFloat(state.current);
    if (isNaN(num)) return;
    state.current = safeResult(num / 100);
    render();
  }

  function clearAll() {
    reset();
    render();
  }

  function reset() {
    state.current = "0";
    state.previous = null;
    state.operator = null;
    state.waitingForOperand = false;
    state.expression = "";
    state.justEvaluated = false;
    clearOperatorHighlights();
  }

  // ── Operator highlight ──────────────────────────────

  function highlightOperator(op) {
    const btn = document.querySelector(`.key--op[data-value="${op}"]`);
    if (btn) btn.classList.add("active");
  }

  function clearOperatorHighlights() {
    document.querySelectorAll(".key--op.active").forEach(function (el) {
      el.classList.remove("active");
    });
  }

  // ── Event handling ──────────────────────────────────

  function handleKeyAction(action, value) {
    switch (action) {
      case "number":   inputNumber(value); break;
      case "decimal":  inputDecimal(); break;
      case "operator": inputOperator(value); break;
      case "equals":   evaluate(); break;
      case "sign":     toggleSign(); break;
      case "percent":  applyPercent(); break;
      case "clear":    clearAll(); break;
    }
  }

  document.querySelector(".keypad").addEventListener("click", function (e) {
    const key = e.target.closest(".key");
    if (!key) return;
    const action = key.dataset.action;
    const value = key.dataset.value;
    handleKeyAction(action, value);

    if (navigator.vibrate && action !== "number") {
      navigator.vibrate(10);
    }
  });

  document.addEventListener("keydown", function (e) {
    const keyMap = {
      "0": { action: "number", value: "0" },
      "1": { action: "number", value: "1" },
      "2": { action: "number", value: "2" },
      "3": { action: "number", value: "3" },
      "4": { action: "number", value: "4" },
      "5": { action: "number", value: "5" },
      "6": { action: "number", value: "6" },
      "7": { action: "number", value: "7" },
      "8": { action: "number", value: "8" },
      "9": { action: "number", value: "9" },
      ".": { action: "decimal" },
      "+": { action: "operator", value: "+" },
      "-": { action: "operator", value: "-" },
      "*": { action: "operator", value: "*" },
      "/": { action: "operator", value: "/" },
      Enter: { action: "equals" },
      "=": { action: "equals" },
      "%": { action: "percent" },
      Escape: { action: "clear" },
      Backspace: { action: "backspace" },
    };

    const mapping = keyMap[e.key];
    if (!mapping) return;
    e.preventDefault();

    if (mapping.action === "backspace") {
      if (state.current.length > 1 && state.current !== "Error") {
        state.current = state.current.slice(0, -1);
      } else {
        state.current = "0";
      }
      render();
      return;
    }

    handleKeyAction(mapping.action, mapping.value);
  });

  render();
})();
