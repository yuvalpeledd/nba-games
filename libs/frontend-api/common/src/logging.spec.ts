import {
  ArgumentsHost,
  BadRequestException,
  HttpServer,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  createServer,
  IncomingMessage,
  Server,
  ServerResponse,
} from 'node:http';
import type { AddressInfo } from 'node:net';
import { CloudLogger, FailureFilter, logRequests } from './logging';

describe('CloudLogger', () => {
  // What the logger wrote to each stream, a JSON entry a line.
  const written = () => {
    const lines: Record<'stdout' | 'stderr', unknown[]> = {
      stdout: [],
      stderr: [],
    };
    for (const stream of ['stdout', 'stderr'] as const) {
      jest.spyOn(process[stream], 'write').mockImplementation((chunk) => {
        lines[stream].push(JSON.parse(String(chunk)));
        return true;
      });
    }
    return lines;
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("writes Cloud Logging's JSON: its severity, the message and where it came from", () => {
    const lines = written();
    const logger = new CloudLogger();

    logger.log('Migrations ran', 'Database');
    logger.warn('Slow query (1200 ms)', 'Database');

    expect(lines.stdout).toEqual([
      { severity: 'INFO', message: 'Migrations ran', context: 'Database' },
      {
        severity: 'WARNING',
        message: 'Slow query (1200 ms)',
        context: 'Database',
      },
    ]);
  });

  it("puts an error's stack in stack_trace, on stderr", () => {
    const lines = written();
    const logger = new CloudLogger();
    const error = new Error('Connection terminated');

    logger.error('Reading games failed', error.stack, 'Games');
    logger.error(error);

    expect(lines.stderr).toEqual([
      {
        severity: 'ERROR',
        message: 'Reading games failed',
        context: 'Games',
        stack_trace: error.stack,
      },
      {
        severity: 'ERROR',
        message: 'Connection terminated',
        stack_trace: error.stack,
      },
    ]);
  });

  it('leaves out debug and verbose lines', () => {
    const lines = written();
    const logger = new CloudLogger();

    logger.debug('a detail');
    logger.verbose('another');

    expect(lines).toEqual({ stdout: [], stderr: [] });
  });
});

describe('logRequests', () => {
  let server: Server;
  let baseUrl: string;
  // The handler of the call under test, after the middleware.
  let handle: (request: IncomingMessage, response: ServerResponse) => void;
  // The line it logged, and how.
  let logged: Promise<[string, string, string | undefined]>;
  let logger: Logger;

  beforeAll(async () => {
    server = createServer((request, response) => {
      Object.assign(response, { locals: {} });
      logRequests(logger)(
        request,
        response as ServerResponse & { locals: Record<string, unknown> },
        () => handle(request, response),
      );
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(() => new Promise((resolve) => server.close(resolve)));

  // A fresh logger, whose first line `logged` gives.
  const listen = () => {
    logged = new Promise((resolve) => {
      const as = (level: string) =>
        jest.fn((line: string, stack?: string) =>
          resolve([level, line, stack]),
        );
      logger = {
        log: as('log'),
        warn: as('warn'),
        error: as('error'),
      } as unknown as Logger;
    });
  };

  beforeEach(listen);

  // Answers `status`, after `act` (what the failure filter leaves).
  const call = async (
    method: string,
    path: string,
    status: number,
    act: (locals: Record<string, unknown>) => void = () => undefined,
  ) => {
    handle = (_, response) => {
      act(
        (response as ServerResponse & { locals: Record<string, unknown> })
          .locals,
      );
      response.statusCode = status;
      response.end();
    };
    await fetch(`${baseUrl}${path}`, { method });
    return logged;
  };

  it("logs an API call's method, path (without its query), status and time", async () => {
    const [level, line] = await call('GET', '/api/games?from=2026-11-11', 200);

    expect(level).toBe('log');
    expect(line).toMatch(/^GET \/api\/games 200 in \d+ ms$/);
  });

  it('warns of a 4xx with what the API answered: its message, or messages', async () => {
    const missing = await call('GET', '/api/teams/nba-xyz', 404, (locals) => {
      locals['failure'] = new NotFoundException('Team nba-xyz not found');
    });
    expect(missing[0]).toBe('warn');
    expect(missing[1]).toMatch(
      /^GET \/api\/teams\/nba-xyz 404 in \d+ ms - Team nba-xyz not found$/,
    );

    listen();
    const [, invalid] = await call('GET', '/api/games', 400, (locals) => {
      locals['failure'] = new BadRequestException([
        'from is a required field',
        'teamId must be at most 100 characters',
      ]);
    });
    expect(invalid).toMatch(
      / - from is a required field; teamId must be at most 100 characters$/,
    );
  });

  it('logs a 5xx as an error, with its stack', async () => {
    const error = new Error('Connection terminated');

    const [level, line, stack] = await call(
      'GET',
      '/api/health',
      500,
      (locals) => {
        locals['failure'] = error;
      },
    );

    expect(level).toBe('error');
    expect(line).toMatch(
      /^GET \/api\/health 500 in \d+ ms - Connection terminated$/,
    );
    expect(stack).toBe(error.stack);
  });

  it('logs a call outside /api only when it fails on our side', async () => {
    const quiet = jest.fn();
    logger.log = quiet;
    handle = (_, response) => {
      response.statusCode = 200;
      response.end();
    };
    await fetch(`${baseUrl}/standings`);

    const [level, line] = await call('GET', '/index.html', 500);

    expect(quiet).not.toHaveBeenCalled();
    expect(level).toBe('error');
    expect(line).toMatch(/^GET \/index.html 500 in \d+ ms$/);
  });
});

describe('FailureFilter', () => {
  // Nest's adapter, as far as the filter uses it.
  const adapterOf = () => ({
    isHeadersSent: jest.fn(() => false),
    reply: jest.fn(),
    end: jest.fn(),
  });
  const hostOf = (locals: Record<string, unknown>) =>
    ({
      switchToHttp: () => ({ getResponse: () => ({ locals }) }),
      getArgByIndex: () => ({ locals }),
    }) as unknown as ArgumentsHost;

  it("answers an unknown error with Nest's 500 and keeps it for the request's line, logging nothing itself", () => {
    const adapter = adapterOf();
    const locals: Record<string, unknown> = {};
    const error = new Error('Connection terminated');
    const logs = jest.spyOn(Logger.prototype, 'error');

    new FailureFilter(adapter as unknown as HttpServer).catch(
      error,
      hostOf(locals),
    );

    expect(adapter.reply).toHaveBeenCalledWith(
      { locals },
      { statusCode: 500, message: 'Internal server error' },
      500,
    );
    expect(locals['failure']).toBe(error);
    expect(logs).not.toHaveBeenCalled();
  });

  it('answers an HTTP exception as Nest does: its body and status', () => {
    const adapter = adapterOf();
    const locals: Record<string, unknown> = {};
    const failure = new NotFoundException('Game nba-x not found');

    new FailureFilter(adapter as unknown as HttpServer).catch(
      failure,
      hostOf(locals),
    );

    expect(adapter.reply).toHaveBeenCalledWith(
      { locals },
      failure.getResponse(),
      404,
    );
    expect(locals['failure']).toBe(failure);
  });
});
