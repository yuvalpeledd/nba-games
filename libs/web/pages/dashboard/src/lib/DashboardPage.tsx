import './dashboard-page.scss';
import { LastScan } from './last-scan/LastScan';
import { PredictionsSummary } from './predictions-summary/PredictionsSummary';

// ponytail: the user's predictions and the data-fetcher's last run until the dashboard has more to show (today's games).
export function DashboardPage() {
  return (
    <div className="dashboard-page">
      <PredictionsSummary />
      <LastScan />
    </div>
  );
}
