import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import TradingWorkspace from '@/pages/trading-workspace';
import AdminPage from '@/pages/AdminPage';
import { HomePage, InfoPage } from '@/pages/PublicPages';
import { BlogArticle, BlogPage } from '@/pages/BlogPages';
import { Route, Router as WouterRouter, Switch, useLocation } from 'wouter';

const queryClient = new QueryClient();

function Router() {
  const [location] = useLocation();
  return (
    <ErrorBoundary resetKey={location}>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/about">{() => <InfoPage path="/about" />}</Route>
        <Route path="/features">{() => <InfoPage path="/features" />}</Route>
        <Route path="/trading-guide">{() => <InfoPage path="/trading-guide" />}</Route>
        <Route path="/analytics-guide">{() => <InfoPage path="/analytics-guide" />}</Route>
        <Route path="/auto-trading">{() => <InfoPage path="/auto-trading" />}</Route>
        <Route path="/blog" component={BlogPage} />
        <Route path="/blog/:slug" component={BlogArticle} />
        <Route path="/contact">{() => <InfoPage path="/contact" />}</Route>
        <Route path="/dashboard" component={TradingWorkspace} />
        <Route path="/admin" component={AdminPage} />
        <Route component={NotFound} />
      </Switch>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
