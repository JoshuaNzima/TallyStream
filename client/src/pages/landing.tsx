import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Vote, Shield, BarChart3, Users } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <Card className="w-full max-w-md mx-auto shadow-2xl">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Vote className="text-white h-8 w-8" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Parallel Tally Center</h1>
              <p className="text-gray-600">Secure Election Management System</p>
            </div>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-center space-x-3 text-sm text-gray-600">
                <Shield className="h-5 w-5 text-primary-500" />
                <span>Secure result collection and verification</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-gray-600">
                <BarChart3 className="h-5 w-5 text-primary-500" />
                <span>Real-time dashboard and analytics</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-gray-600">
                <Users className="h-5 w-5 text-primary-500" />
                <span>Multi-role access control</span>
              </div>
            </div>
            
            <Button 
              onClick={() => window.location.href = "/login"}
              className="w-full bg-primary-500 hover:bg-primary-600 text-white font-medium py-3 transition-colors duration-200"
              data-testid="button-login"
            >
              Sign In to Continue
            </Button>
            
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                Authorized personnel only. All activities are logged and monitored.
              </p>
            </div>
          </CardContent>
        </Card>
        
        <div className="mt-8 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Transparent Election Monitoring</h2>
          <p className="text-lg opacity-90 max-w-2xl mx-auto">
            Collect, verify, and tally election results with confidence. 
            Real-time data collection from field agents, comprehensive verification workflows, 
            and secure audit trails ensure election integrity.
          </p>
        </div>
      </div>
    </div>
  );
}
