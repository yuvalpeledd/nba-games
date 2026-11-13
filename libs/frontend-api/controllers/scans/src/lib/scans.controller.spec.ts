import { TestApp } from '@nba/frontend-api-test-utils';
import { ScanDalService } from '@nba/sql-scans';
import { FrontendApiScansControllerModule } from './scans.module';

describe('ScansController', () => {
  let app: TestApp;
  beforeAll(async () => {
    app = await TestApp.create([FrontendApiScansControllerModule]);
  });
  afterAll(() => app.close());
  beforeEach(() => app.clearDatabase());

  describe('GET /scans/last', () => {
    describe('behavior', () => {
      it('is null before the first scan', async () => {
        const { status, body } = await app.call('GET', '/scans/last');

        expect(status).toBe(200);
        expect(body).toEqual({ data: null });
      });

      it('answers the latest scan to start', async () => {
        const scans = app.get(ScanDalService);
        const scan = {
          success: true,
          inserted: 1,
          updated: 2,
          unchanged: 3,
          error: null,
        };
        await scans.record({
          ...scan,
          startedAt: new Date('2026-11-12T10:00:00Z'),
          finishedAt: new Date('2026-11-12T10:01:00Z'),
        });
        await scans.record({
          ...scan,
          success: false,
          error: 'GamesFetcherService: Games failed for 2026-11-11',
          startedAt: new Date('2026-11-13T10:00:00Z'),
          finishedAt: new Date('2026-11-13T10:01:00Z'),
        });

        const { status, body } = await app.call('GET', '/scans/last');

        expect(status).toBe(200);
        expect(body).toEqual({
          data: {
            ...scan,
            success: false,
            error: 'GamesFetcherService: Games failed for 2026-11-11',
            startedAt: '2026-11-13T10:00:00.000Z',
            finishedAt: '2026-11-13T10:01:00.000Z',
          },
        });
      });
    });
  });
});
