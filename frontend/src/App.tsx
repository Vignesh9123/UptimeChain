import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import ClientDashboard from './pages/ClientDashboard';
import ValidatorDashboard from './pages/ValidatorDashboard';
import Login from './pages/LoginPage';
import Register from './pages/RegisterPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout><LandingPage /></Layout>} />
        <Route path="/login" element={<Layout><Login /></Layout>} />
        <Route path="/register" element={<Layout><Register /></Layout>} />
        <Route path="/client" element={<Layout><ClientDashboard /></Layout>} />
        <Route path="/validator" element={<Layout><ValidatorDashboard /></Layout>} />
      </Routes>
    </Router>
  );
}

export default App;