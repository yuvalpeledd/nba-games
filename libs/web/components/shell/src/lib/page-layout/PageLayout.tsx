import { Outlet } from 'react-router';
import { Navbar } from '../navbar/Navbar';
import './page-layout.scss';

// Every page: the side navbar, then the page.
export function PageLayout() {
  return (
    <div className="page-layout">
      <Navbar />
      <main className="page-layout__content">
        <Outlet />
      </main>
    </div>
  );
}
