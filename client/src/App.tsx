import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import SubmitResults from "@/pages/submit-results";
import VerifyResults from "@/pages/verify-results";
import Reports from "@/pages/reports";
import UserManagement from "@/pages/user-management";
import AuditTrail from "@/pages/audit-trail";
import Navigation from "@/components/navigation";
import Sidebar from "@/components/sidebar";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <div className="min-h-screen bg-gray-50">
            <Navigation />
            <div className="flex">
              <Sidebar />
              <main className="flex-1 p-6">
                <Switch>
                  <Route path="/" component={Dashboard} />
                  <Route path="/submit-results" component={SubmitResults} />
                  <Route path="/verify-results" component={VerifyResults} />
                  <Route path="/reports" component={Reports} />
                  <Route path="/user-management" component={UserManagement} />
                  <Route path="/audit-trail" component={AuditTrail} />
                  <Route component={NotFound} />
                </Switch>
              </main>
            </div>
          </div>
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
