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
import LoginPage from './pages/LoginPage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import GoogleSignupPage from './pages/GoogleSignupPage.jsx';
import VerifyEmailPage from './pages/VerifyEmailPage.jsx';
import AccountPage from './pages/AccountPage.jsx';
import AuthProvider from './auth/AuthProvider.jsx';
import RequireAuth from './auth/RequireAuth.jsx';
import TerminalSessionProvider from './lab/TerminalSessionProvider.jsx';
import TerminalPip from './lab/TerminalPip.jsx';

// 터미널 실습 세션은 PIP 모드에서 페이지를 이동해도 유지되도록 레이아웃에서 관리한다
function Layout() {
  return (
    <AuthProvider>
      <TerminalSessionProvider>
        <Header />
        <main className="site-main">
          <Outlet />
        </main>
        <TerminalPip />
      </TerminalSessionProvider>
    </AuthProvider>
  );
}

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* 누구나: 메인(미리 보기), 로그인·회원가입·이메일 인증 */}
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignupPage />} />
        <Route path="signup/google" element={<GoogleSignupPage />} />
        <Route path="verify-email" element={<VerifyEmailPage />} />

        {/* 로그인(이메일 인증 완료 또는 관리자) 필요 */}
        <Route element={<RequireAuth />}>
          <Route path="account" element={<AccountPage />} />
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
      </Route>
    </Routes>
  );
}

export default App;
