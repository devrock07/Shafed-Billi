const moment = require("moment-timezone");

/**
 * Shafed Billi - Anime Logger
 * Clean, Sexy, and Kawaii ~
 */
class Logger {
  static get now() {
    return moment().tz("Asia/Kolkata").format("DD-MM-YYYY HH:mm:ss");
  }

  /**
   * Defines the color palette and styles using ANSI codes.
   * Keeping it raw for performance and zero-deps.
   */
  static get style() {
    return {
      reset: "\x1b[0m",
      bold: "\x1b[1m",
      dim: "\x1b[2m",
      italic: "\x1b[3m",

      // Foreground Colors (Pastel-ish via standard ANSI)
      black: "\x1b[30m",
      red: "\x1b[31m",
      green: "\x1b[32m",
      yellow: "\x1b[33m",
      blue: "\x1b[34m",
      magenta: "\x1b[35m",
      cyan: "\x1b[36m",
      white: "\x1b[37m",
      gray: "\x1b[90m",

      // Background Colors
      bgRed: "\x1b[41m",
      bgGreen: "\x1b[42m",
      bgYellow: "\x1b[43m",
      bgBlue: "\x1b[44m",
      bgMagenta: "\x1b[45m",
      bgCyan: "\x1b[46m",
      bgWhite: "\x1b[47m",
    };
  }

  static _print(type, icon, color, message) {
    const s = this.style;
    const timestamp = `${s.gray}[${this.now}]${s.reset}`;
    const badge = `${color}${s.bold}${icon} ${type.padEnd(5)}${s.reset}`;
    const content = `${s.white}${message}${s.reset}`;

    console.log(`${timestamp} ${badge} ${s.gray}::${s.reset} ${content}`);
  }

  static log(message, type = "info") {
    switch (type.toLowerCase()) {
      case "info":
      case "log":
        this.info(message);
        break;
      case "warn":
      case "warning":
        this.warn(message);
        break;
      case "error":
      case "err":
        this.error(message);
        break;
      case "debug":
        this.debug(message);
        break;
      case "cmd":
        this.cmd(message);
        break;
      case "event":
        this.event(message);
        break;
      case "ready":
        this.ready(message);
        break;
      default:
        this.info(message);
        break;
    }
  }

  static info(message) {
    this._print("INFO", "( ◕ ‿ ◕ )", this.style.cyan, message);
  }

  static warn(message) {
    this._print("WARN", "( ◕ ︿ ◕ )", this.style.yellow, message);
  }

  static error(message) {
    this._print("ERROR", "( ✖ ╭╮ ✖ )", this.style.red, message);
  }

  static debug(message) {
    this._print("DEBUG", "( ¬ ‿ ¬ )", this.style.gray, message);
  }

  static cmd(message) {
    this._print("CMD", "( ⋆ ＾ － ＾ ⋆ )", this.style.magenta, message);
  }

  static event(message) {
    this._print("EVENT", "( ﾉ ◕ ヮ ◕ )ﾉ", this.style.blue, message);
  }

  static ready(message) {
    this._print("READY", "( ✿ ◠ ‿ ◠ )", this.style.green, message);
  }

  static system(message) {
    this._print("SYSTEM", "( ー _ ー )", this.style.white, message);
  }
}

module.exports = Logger;
