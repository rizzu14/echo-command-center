import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Layout } from './components/Layout/Layout';
import { Login } from './views/Auth/Login';
import { AuthGuard } from './views/Auth/AuthGuard';
import { Home } from './views/Home/Home';
import { Dashboard } from './views/Dashboard/Dashboard';
import { AgentIntelligence } from './views/AgentIntelligence/AgentIntelligence';
import { ActionPipeline } from './views/ActionPipeline/ActionPipeline';
import { AgentNetwork } from './views/AgentNetwork/AgentNetwork';
import { Governance } from './views/Governance/Governance';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';

export function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<AuthGuard><Layout /></AuthGuard>}>
            <Route index element={<Home />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="agents" element={<AgentIntelligence />} />
            <Route path="actions" element={<ActionPipeline />} />
            <Route path="network" element={<AgentNetwork />} />
            <Route path="governance" element={<Governance />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}
