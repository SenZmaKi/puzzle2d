const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const LOG_LEVEL = LEVELS[process.env.LOG_LEVEL || 'info'] ?? LEVELS.info;

const COLORS = {
  debug: '\x1b[36m',  // cyan
  info: '\x1b[32m',   // green
  warn: '\x1b[33m',   // yellow
  error: '\x1b[31m',  // red
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
};

function timestamp() {
  return new Date().toISOString();
}

function formatMsg(level, scope, message, meta) {
  const c = COLORS[level];
  const prefix = `${COLORS.dim}${timestamp()}${COLORS.reset} ${c}${level.toUpperCase().padEnd(5)}${COLORS.reset}`;
  const scopeStr = scope ? ` ${COLORS.bold}[${scope}]${COLORS.reset}` : '';
  const metaStr = meta && Object.keys(meta).length > 0
    ? ` ${COLORS.dim}${JSON.stringify(meta)}${COLORS.reset}`
    : '';
  return `${prefix}${scopeStr} ${message}${metaStr}`;
}

function createLogger(scope) {
  const log = (level, message, meta) => {
    if (LEVELS[level] < LOG_LEVEL) return;
    const line = formatMsg(level, scope, message, meta);
    if (level === 'error') {
      console.error(line);
    } else if (level === 'warn') {
      console.warn(line);
    } else {
      console.log(line);
    }
  };

  return {
    debug: (msg, meta) => log('debug', msg, meta),
    info: (msg, meta) => log('info', msg, meta),
    warn: (msg, meta) => log('warn', msg, meta),
    error: (msg, meta) => log('error', msg, meta),
    child: (childScope) => createLogger(`${scope}:${childScope}`),
  };
}

export default createLogger;
