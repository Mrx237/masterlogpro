import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Auth from "./pages/Auth.tsx";
import ForgotPassword from "./pages/ForgotPassword.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import Subscribe from "./pages/Subscribe.tsx";
import Payment from "./pages/Payment.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import NewTrade from "./pages/NewTrade.tsx";
import Trades from "./pages/Trades.tsx";
import Exercises from "./pages/Exercises.tsx";
import Analyse from "./pages/Analyse.tsx";
import News from "./pages/News.tsx";
import NewsDetail from "./pages/NewsDetail.tsx";
import Calculator from "./pages/Calculator.tsx";
import Profile from "./pages/Profile.tsx";
import Admin from "./pages/Admin.tsx";
import Leaderboard from "./pages/Leaderboard.tsx";
import Affiliate from "./pages/Affiliate.tsx";
import { ProtectedRoute } from "./components/ProtectedRoute.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/subscribe" element={<Subscribe />} />
          <Route path="/payment" element={<ProtectedRoute><Payment /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/trades" element={<ProtectedRoute requireJournal><Trades /></ProtectedRoute>} />
          <Route path="/trades/new" element={<ProtectedRoute requireJournal><NewTrade /></ProtectedRoute>} />
          <Route path="/exercises" element={<ProtectedRoute><Exercises /></ProtectedRoute>} />
          <Route path="/analyse" element={<ProtectedRoute><Analyse /></ProtectedRoute>} />
          <Route path="/news" element={<ProtectedRoute><News /></ProtectedRoute>} />
          <Route path="/news/:id" element={<ProtectedRoute><NewsDetail /></ProtectedRoute>} />
          <Route path="/calculateur" element={<ProtectedRoute><Calculator /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/affiliate" element={<ProtectedRoute><Affiliate /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute requireAdmin><Admin /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
