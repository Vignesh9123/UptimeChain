import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import ClientDashboard from './pages/ClientDashboard';
import AddWebsitePage from './pages/AddWebsitePage';
import ValidatorDashboard from './pages/ValidatorDashboard';
import WebsitesListPage from './pages/WebsitesListPage';
import WebsiteDetailPage from './pages/WebsiteDetailPage';
import Login from './pages/LoginPage';
import Register from './pages/RegisterPage';
import OtpPage from './pages/OtpPage';
import { AuthProvider } from './components/AuthProvider';
import { ThemeProvider } from './components/theme-provider';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { useMemo } from 'react';

import '@solana/wallet-adapter-react-ui/styles.css';

function App() {
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={"http://127.0.0.1:8899"}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <Router>
            <AuthProvider>
              <ThemeProvider defaultTheme="system" storageKey='uptimechain-ui-theme'>
                <Routes>
                  <Route path="/" element={<Layout><LandingPage /></Layout>} />
                  <Route path="/login" element={<Layout><Login /></Layout>} />
                  <Route path="/register" element={<Layout><Register /></Layout>} />
                  <Route path="/otp" element={<Layout><OtpPage /></Layout>} />
                  <Route path="/client" element={<Layout><ClientDashboard /></Layout>} />
                  <Route path="/client/add-website" element={<Layout><AddWebsitePage /></Layout>} />
                  <Route path="/client/websites" element={<Layout><WebsitesListPage /></Layout>} />
                  <Route path="/client/websites/:websiteId" element={<Layout><WebsiteDetailPage /></Layout>} />
                  <Route path="/validator" element={<Layout><ValidatorDashboard /></Layout>} />
                </Routes>
              </ThemeProvider>
            </AuthProvider>
          </Router>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;