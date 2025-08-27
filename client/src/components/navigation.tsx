import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Vote } from "lucide-react";
import { User } from "@shared/schema";

export default function Navigation() {
  const { user } = useAuth() as { user: User | null };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center mr-3">
              <Vote className="text-white h-4 w-4" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900" data-testid="text-app-title">
              PTC System
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Real-time Status Indicator */}
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" data-testid="indicator-live-status"></div>
              <span className="text-sm text-gray-600">Live</span>
            </div>
            
            {/* User Menu */}
            <div className="flex items-center space-x-2">
              <img 
                className="w-8 h-8 rounded-full bg-primary-100" 
                src={user?.profileImageUrl || `https://ui-avatars.com/api/?name=${user?.firstName}+${user?.lastName}&background=1565c0&color=fff`}
                alt="User avatar"
                data-testid="img-user-avatar"
              />
              <span className="text-sm font-medium text-gray-700" data-testid="text-user-name">
                {user?.firstName} {user?.lastName}
              </span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={async () => {
                  try {
                    await fetch("/api/logout", { method: "POST" });
                    window.location.href = "/login";
                  } catch (error) {
                    console.error("Logout failed:", error);
                    window.location.href = "/login";
                  }
                }}
                data-testid="button-logout"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
