import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  BarChart3, 
  Plus, 
  CheckCircle, 
  FileText, 
  Users, 
  History,
  Settings,
  User,
  AlertTriangle,
  Shield,
  Database
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3, roles: ["agent", "supervisor", "admin", "reviewer"] },
  { name: "Submit Results", href: "/submit-results", icon: Plus, roles: ["agent", "supervisor", "admin"] },
  { name: "Verify Results", href: "/verify-results", icon: CheckCircle, roles: ["supervisor", "admin"] },
  { name: "Review Flagged", href: "/review-flagged", icon: AlertTriangle, roles: ["reviewer", "admin"] },
  { name: "Reports", href: "/reports", icon: FileText, roles: ["supervisor", "admin", "reviewer"] },
  { name: "User Management", href: "/user-management", icon: Users, roles: ["admin"] },
  { name: "Political Parties", href: "/political-parties", icon: Shield, roles: ["admin", "supervisor"] },
  { name: "Data Management", href: "/data-management", icon: Database, roles: ["admin"] },
  { name: "Admin Management", href: "/admin-management", icon: Settings, roles: ["admin"] },
  { name: "Audit Trail", href: "/audit-trail", icon: History, roles: ["supervisor", "admin", "reviewer"] },
  { name: "Profile", href: "/profile", icon: User, roles: ["agent", "supervisor", "admin", "reviewer"] },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes((user as any)?.role || "agent")
  );

  return (
    <aside className="w-64 bg-white shadow-sm h-screen">
      <div className="p-4">
        <div className="space-y-1">
          {filteredNavigation.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <div
                  className={cn(
                    "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer",
                    isActive
                      ? "bg-primary-50 text-primary-700"
                      : "text-gray-700 hover:bg-gray-50"
                  )}
                  data-testid={`link-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <item.icon
                    className={cn(
                      "mr-3 h-5 w-5",
                      isActive ? "text-primary-500" : "text-gray-400"
                    )}
                  />
                  {item.name}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
