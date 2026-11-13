import {
  ArgumentsHost,
  Catch,
  ConsoleLogger,
  HttpException,
  HttpServer,
  Logger,
  LogLevel,
} from '@nestjs/common';
import { AbstractHttpAdapter, BaseExceptionFilter } from '@nestjs/core';
import type { IncomingMessage, ServerResponse } from 'node:http';

// An error's stack, for a log line's second argument (Nest takes a stack there as text only).
export const stackOf = (error: unknown): string =>
  error instanceof Error ? (error.stack ?? error.message) : String(error);

// Cloud Logging's severities, by Nest's levels.
const SEVERITIES: Record<LogLevel, string> = {
  verbose: 'DEBUG',
  debug: 'DEBUG',
  log: 'INFO',
  warn: 'WARNING',
  error: 'ERROR',
  fatal: 'CRITICAL',
};

// What Nest says of every module and route as it boots: the same on every cold start.
const BOOT_CONTEXTS = new Set([
  'InstanceLoader',
  'RoutesResolver',
  'RouterExplorer',
]);

// The production logger (main.ts): one JSON line per entry, as Cloud Logging reads them. Its `severity` sorts it,
// `message` is its line and `context` where it came from; an error's stack goes in `stack_trace`, where Error
// Reporting looks. Debug and verbose are off, and so are Nest's boot lines (BOOT_CONTEXTS).
export class CloudLogger extends ConsoleLogger {
  constructor() {
    super({ json: true, logLevels: ['log', 'warn', 'error', 'fatal'] });
  }

  protected override printAsJson(
    message: unknown,
    {
      context,
      logLevel,
      writeStreamType,
      errorStack,
    }: {
      context: string;
      logLevel: LogLevel;
      writeStreamType?: 'stdout' | 'stderr';
      errorStack?: unknown;
    },
  ): void {
    if (logLevel === 'log' && BOOT_CONTEXTS.has(context)) return;
    const stack =
      errorStack ?? (message instanceof Error ? message.stack : undefined);
    const entry = {
      severity: SEVERITIES[logLevel],
      message:
        typeof message === 'string'
          ? message
          : message instanceof Error
            ? message.message
            : JSON.stringify(message),
      ...(context && { context }),
      ...(stack !== undefined && { stack_trace: String(stack) }),
    };
    process[writeStreamType ?? 'stdout'].write(`${JSON.stringify(entry)}\n`);
  }
}

// Express's response: `locals` is its per-request bag, where the failure filter leaves the failure.
type LoggedResponse = ServerResponse & { locals: Record<string, unknown> };

// A failure as the API answered it: its message (a 400's list of them) and code.
function failureOf(failure: unknown): string {
  if (!(failure instanceof HttpException)) {
    return failure instanceof Error ? failure.message : String(failure);
  }
  const answer = failure.getResponse();
  const { message, code } =
    typeof answer === 'object'
      ? (answer as { message?: unknown; code?: unknown })
      : { message: answer, code: undefined };
  const text = Array.isArray(message) ? message.join('; ') : String(message);
  return code ? `${text} [${code}]` : text;
}

// One line per API call, when its response is done: info for 2xx and 3xx, a warning for 4xx (with why), an error for
// 5xx (with its stack). Its method, path (without the query), status and time. Calls outside /api (the web app) only
// when they fail on our side. Never bodies.
export function logRequests(logger = new Logger('HTTP')) {
  return (
    request: IncomingMessage,
    response: LoggedResponse,
    next: () => void,
  ) => {
    const started = performance.now();
    // As it came: routing rewrites `url` on the way.
    const path = (request.url ?? '').split('?')[0];
    response.once('close', () => {
      const status = response.statusCode;
      if (!path.startsWith('/api') && status < 500) return;
      const ms = Math.round(performance.now() - started);
      const failure: unknown = response.locals['failure'];
      const line = [
        `${request.method} ${path} ${status} in ${ms} ms`,
        failure !== undefined && ` - ${failureOf(failure)}`,
        !response.writableFinished && ' (the client left before the answer)',
      ]
        .filter(Boolean)
        .join('');
      if (status >= 500) {
        logger.error(
          line,
          failure === undefined ? undefined : stackOf(failure),
        );
      } else if (status >= 400 || !response.writableFinished) {
        logger.warn(line);
      } else {
        logger.log(line);
      }
    });
    next();
  };
}

// Nest's own answers to every failure, keeping the failure for its request's line (logRequests). An unknown error
// isn't logged here as Nest would: that line has it, with its stack.
@Catch()
export class FailureFilter extends BaseExceptionFilter {
  override catch(exception: unknown, host: ArgumentsHost): void {
    host.switchToHttp().getResponse<LoggedResponse>().locals['failure'] =
      exception;
    super.catch(exception, host);
  }

  override handleUnknownError(
    exception: unknown,
    host: ArgumentsHost,
    applicationRef: AbstractHttpAdapter | HttpServer,
  ): void {
    const body = this.isHttpError(exception)
      ? { statusCode: exception.statusCode, message: exception.message }
      : { statusCode: 500, message: 'Internal server error' };
    const response = host.getArgByIndex(1);
    if (applicationRef.isHeadersSent(response)) {
      applicationRef.end(response);
      return;
    }
    applicationRef.reply(response, body, body.statusCode);
  }
}
