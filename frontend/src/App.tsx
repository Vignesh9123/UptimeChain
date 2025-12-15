import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import ClientDashboard from './pages/ClientDashboard';
import AddWebsitePage from './pages/AddWebsitePage';
import ValidatorDashboard from './pages/ValidatorDashboard';
import Login from './pages/LoginPage';
import Register from './pages/RegisterPage';
import { AuthProvider } from './components/AuthProvider';
import { ThemeProvider } from './components/theme-provider';

function App() {
  return (
    <Router>
      <AuthProvider>
        <ThemeProvider defaultTheme="system" storageKey='uptimechain-ui-theme'>
          <Routes>
            <Route path="/" element={<Layout><LandingPage /></Layout>} />
            <Route path="/login" element={<Layout><Login /></Layout>} />
            <Route path="/register" element={<Layout><Register /></Layout>} />
            <Route path="/client" element={<Layout><ClientDashboard /></Layout>} />
            <Route path="/client/add-website" element={<Layout><AddWebsitePage /></Layout>} />
            <Route path="/validator" element={<Layout><ValidatorDashboard /></Layout>} />
          </Routes>
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;