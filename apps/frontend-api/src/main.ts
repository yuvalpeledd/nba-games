import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { CloudLogger, logRequests } from '@nba/frontend-api-common';
import { resolve } from 'node:path';
import { AppModule } from './app/app.module';

// In the container this server also serves the built web app (same origin); locally Vite does.
function serveWeb(app: NestExpressApplication, webDir: string): void {
  app.useStaticAssets(webDir);
  // Client-side routes get the SPA shell.
  app.use(
    (
      request: { method: string; path: string },
      response: { sendFile: (path: string) => void },
      next: () => void,
    ) =>
      request.method === 'GET' && !request.path.startsWith('/api')
        ? response.sendFile(resolve(webDir, 'index.html'))
        : next(),
  );
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // JSON lines in production; locally Nest's own colored lines.
    logger:
      process.env['NODE_ENV'] === 'production' ? new CloudLogger() : undefined,
  });
  // First, so every response gets its line.
  app.use(logRequests());
  app.setGlobalPrefix('api');
  const webDir = process.env['WEB_DIR'];
  if (webDir) serveWeb(app, webDir);
  app.enableShutdownHooks();
  const port = process.env['PORT'] ?? 3000;
  await app.listen(port);
  Logger.log(
    `frontend-api listening on http://localhost:${port}/api${webDir ? `, serving the web app from ${webDir}` : ''}`,
  );
}

bootstrap();
