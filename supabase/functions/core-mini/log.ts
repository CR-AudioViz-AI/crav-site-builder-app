// Structured logs with request_id

export interface LogContext {
  request_id: string;
  org_id?: string;
  user_id?: string;
  action?: string;
  [key: string]: any;
}

function log(level: string, message: string, context: LogContext) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };
  console.log(JSON.stringify(entry));
}

export function info(message: string, context: LogContext) {
  log("info", message, context);
}

export function warn(message: string, context: LogContext) {
  log("warn", message, context);
}

export function error(message: string, context: LogContext) {
  log("error", message, context);
}

export function debug(message: string, context: LogContext) {
  log("debug", message, context);
}

export function createLogger(baseContext: Partial<LogContext>) {
  return {
    info: (msg: string, ctx?: Partial<LogContext>) =>
      info(msg, { ...baseContext, ...ctx } as LogContext),
    warn: (msg: string, ctx?: Partial<LogContext>) =>
      warn(msg, { ...baseContext, ...ctx } as LogContext),
    error: (msg: string, ctx?: Partial<LogContext>) =>
      error(msg, { ...baseContext, ...ctx } as LogContext),
    debug: (msg: string, ctx?: Partial<LogContext>) =>
      debug(msg, { ...baseContext, ...ctx } as LogContext),
  };
}
