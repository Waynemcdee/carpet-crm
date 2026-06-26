import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Camera, FileText, Calendar, Package, Star, Zap, BarChart3, ClipboardList, Truck, Wrench, Store } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Visualiser from './pages/Visualiser';
import Quotes from './pages/Quotes';
import CalendarPage from './pages/CalendarPage';
import SamplesPage from './pages/SamplesPage';
import ReviewsPage from './pages/ReviewsPage';
import ReactivationPage from './pages/ReactivationPage';
import AnalyticsPage from './pages/AnalyticsPage';
import PurchaseOrdersPage from './pages/PurchaseOrdersPage';
import OrdersPage from './pages/OrdersPage';
import ChecklistPage from './pages/ChecklistPage';
import FittersPage from './pages/FittersPage';
import ShowroomPage from './pages/ShowroomPage';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Users, label: 'Customers', path: '/customers' },
  { icon: FileText, label: 'Quotes', path: '/quotes' },
  { icon: Calendar, label: 'Calendar', path: '/calendar' },
  { icon: Store, label: 'Showroom', path: '/showroom' },
  { icon: Package, label: 'Samples', path: '/samples' },
  { icon: Truck, label: 'Orders', path: '/orders' },
  { icon: Wrench, label: 'Fitters', path: '/fitters' },
  { icon: ClipboardList, label: 'Checklists', path: '/checklists' },
  { icon: Star, label: 'Reviews', path: '/reviews' },
  { icon: Zap, label: 'Reactivate', path: '/reactivation' },
  { icon: BarChart3, label: 'Analytics', path: '/analytics' },
  { icon: Camera, label: 'Visualiser', path: '/visualiser' },
];

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-60 bg-surface border-r border-white/[0.06] flex flex-col z-40">
      <div className="p-6 pb-4">
        <h1 className="text-xl font-bold tracking-tight text-amber-400">CarpetCRM</h1>
        <p className="text-[11px] text-white/30 mt-1">Sales & Installation</p>
      </div>

      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map((item, i) => {
          const active = location.pathname === item.path ||
            (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <button
              key={i}
              onClick={() => navigate(item.path)}
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-amber-400/10 text-amber-400'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon className="w-[18px] h-[18px]" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/[0.06]">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-xs font-bold text-black">
            JM
          </div>
          <div>
            <p className="text-sm font-medium">John</p>
            <p className="text-[11px] text-white/30">Manager</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function Layout() {
  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <main className="flex-1 ml-60">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/:id" element={<CustomerDetail />} />
          <Route path="/visualiser" element={<Visualiser />} />
          <Route path="/quotes" element={<Quotes />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/showroom" element={<ShowroomPage />} />
          <Route path="/samples" element={<SamplesPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/fitters" element={<FittersPage />} />
          <Route path="/checklists" element={<ChecklistPage />} />
          <Route path="/reviews" element={<ReviewsPage />} />
          <Route path="/reactivation" element={<ReactivationPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}
