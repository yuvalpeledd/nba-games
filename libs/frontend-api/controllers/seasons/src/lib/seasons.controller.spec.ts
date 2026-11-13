import { TestApp } from '@nba/frontend-api-test-utils';
import { FrontendApiSeasonsControllerModule } from './seasons.module';

describe('SeasonsController', () => {
  let app: TestApp;
  beforeAll(async () => {
    app = await TestApp.create([FrontendApiSeasonsControllerModule]);
  });
  afterAll(() => app.close());
  beforeEach(() => app.clearDatabase());

  describe('GET /seasons', () => {
    describe('behavior', () => {
      it('lists the seasons newest first, each with the year standings and games carry', async () => {
        const older = await app.createSeason(2025);
        const newer = await app.createSeason(2026);

        const { status, body } = await app.call('GET', '/seasons');

        expect(status).toBe(200);
        expect(body).toEqual({
          data: [
            { ...newer, year: 2026 },
            { ...older, year: 2025 },
          ],
        });
      });
    });
  });
});
