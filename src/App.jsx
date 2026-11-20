import { Outlet, Route, Routes } from 'react-router';
import Header from './components/Header.jsx';
import HomePage from './pages/HomePage.jsx';
import TopicPage from './pages/TopicPage.jsx';
import LinuxMasterPage from './pages/LinuxMasterPage.jsx';
import LabHubPage from './pages/LabHubPage.jsx';
import TerminalLabPage from './pages/TerminalLabPage.jsx';
import WiresharkLabPage from './pages/WiresharkLabPage.jsx';
import VulnLabPage from './pages/VulnLabPage.jsx';
import VulnCategoryPage from './pages/VulnCategoryPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import TerminalSessionProvider from './lab/TerminalSessionProvider.jsx';
import TerminalPip from './lab/TerminalPip.jsx';

// 터미널 실습 세션은 PIP 모드에서 페이지를 이동해도 유지되도록 레이아웃에서 관리한다
function Layout() {
  return (
    <TerminalSessionProvider>
      <Header />
      <main className="site-main">
        <Outlet />
      </main>
      <TerminalPip />
    </TerminalSessionProvider>
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
          <Route path="vuln" element={<VulnLabPage />} />
          <Route path="vuln/:vulnId" element={<VulnCategoryPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;
