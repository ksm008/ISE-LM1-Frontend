import { Outlet, Route, Routes } from 'react-router';
import Header from './components/Header.jsx';
import HomePage from './pages/HomePage.jsx';
import TopicPage from './pages/TopicPage.jsx';
import LinuxMasterPage from './pages/LinuxMasterPage.jsx';
import LabHubPage from './pages/LabHubPage.jsx';
import TerminalLabPage from './pages/TerminalLabPage.jsx';
import WiresharkLabPage from './pages/WiresharkLabPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

function Layout() {
  return (
    <>
      <Header />
      <main className="site-main">
        <Outlet />
      </main>
    </>
  );
}

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="isec/:topicId" element={<TopicPage />} />
        <Route path="linux" element={<LinuxMasterPage />} />
        <Route path="lab">
          <Route index element={<LabHubPage />} />
          <Route path="terminal" element={<TerminalLabPage />} />
          <Route path="wireshark" element={<WiresharkLabPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;
