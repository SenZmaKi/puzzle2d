const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

// Default to 'info' in prod, 'debug' in dev
const isDev = import.meta.env.DEV;
const storedLevel = localStorage.getItem('puzzle2d_log_level');
const LOG_LEVEL = LEVELS[storedLevel] ?? (isDev ? LEVELS.debug : LEVELS.info);

const COLORS = {
  debug: 'color: #6ec6ff',
  info: 'color: #66bb6a',
  warn: 'color: #ffa726',
  error: 'color: #ef5350',
  scope: 'color: #ce93d8; font-weight: bold',
  meta: 'color: #90a4ae',
  reset: 'color: inherit',
};

function createLogger(scope) {
  const log = (level, message, meta) => {
    if (LEVELS[level] < LOG_LEVEL) return;
    const tag = level.toUpperCase().padEnd(5);
    const ts = new Date().toISOString().split('T')[1].slice(0, 12);

    const parts = [`%c${ts} %c${tag} %c[${scope}]%c ${message}`];
    const styles = [COLORS.meta, COLORS[level], COLORS.scope, COLORS.reset];

    if (meta && Object.keys(meta).length > 0) {
      parts[0] += ' %o';
      styles.push(meta);
      console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](...[parts[0], ...styles]);
    } else {
      console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](...[parts[0], ...styles]);
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
