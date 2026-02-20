import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Activity, FileText, Settings, BarChart3, LogOut } from "lucide-react";
import { appClient } from "@/api/appClient";
import { useAuth } from "@/lib/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const navigationItems = [
  {
    title: "Triage Dashboard",
    url: createPageUrl("TriageDashboard"),
    icon: Activity,
  },
  {
    title: "AI Protocol Management",
    url: createPageUrl("AIProtocolManagement"),
    icon: Settings,
  },
  {
    title: "Rules Management",
    url: createPageUrl("RulesManagement"),
    icon: Settings,
  },
  {
    title: "Paging Configuration",
    url: createPageUrl("PagingConfiguration"),
    icon: Settings,
  },
  {
    title: "Compliance & Security",
    url: createPageUrl("Compliance"),
    icon: FileText,
  },
  {
    title: "Audit Log",
    url: createPageUrl("AuditLog"),
    icon: FileText,
  },
  {
    title: "Analytics",
    url: createPageUrl("Analytics"),
    icon: BarChart3,
  },
  {
    title: "Reports",
    url: createPageUrl("Reports"),
    icon: FileText,
  },
  {
    title: "Reporting Dashboard",
    url: createPageUrl("ReportingDashboard"),
    icon: BarChart3,
  },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  const filteredNavItems = navigationItems;

  return (
    <SidebarProvider>
      <style>{`
        :root {
          --background: #000000;
          --foreground: #60A5FA;
          --card: #374151;
          --card-foreground: #60A5FA;
          --primary: #60A5FA;
          --primary-foreground: #60A5FA;
          --secondary: #374151;
          --secondary-foreground: #60A5FA;
          --muted: #374151;
          --muted-foreground: #60A5FA;
          --accent: #60A5FA;
          --accent-foreground: #60A5FA;
          --border: #60A5FA;
          --input: #60A5FA;
          --ring: #60A5FA;
        }
        
        body {
          background-color: #000000 !important;
          color: #60A5FA !important;
        }
        
        * {
          border-color: #60A5FA !important;
        }
      `}</style>
      <div className="min-h-screen flex w-full" style={{ backgroundColor: '#000000' }}>
        <Sidebar className="border-r" style={{ borderColor: '#60A5FA', backgroundColor: '#000000' }}>
          <SidebarHeader className="border-b p-6" style={{ borderColor: '#60A5FA', backgroundColor: '#000000' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#60A5FA' }}>
                <Activity className="w-6 h-6" style={{ color: '#000000' }} />
              </div>
              <div>
                <h2 className="font-bold text-xl" style={{ color: '#60A5FA' }}>TriageLink</h2>
                <p className="text-xs" style={{ color: '#60A5FA' }}>Smart Triage Support</p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-3" style={{ backgroundColor: '#000000' }}>
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider px-2 py-2" style={{ color: '#60A5FA' }}>
                Navigation
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {filteredNavItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={`transition-all duration-200 rounded-lg mb-1`}
                        style={location.pathname === item.url ? { backgroundColor: '#60A5FA', color: '#000000' } : { color: '#60A5FA' }}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-3 py-2.5">
                          <item.icon className="w-5 h-5" />
                          <span className="font-medium">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t p-4" style={{ borderColor: '#60A5FA', backgroundColor: '#000000' }}>
            <div className="space-y-3">
              <div className="flex items-center gap-3 px-2">
                <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: '#60A5FA' }}>
                  <span className="font-semibold text-sm" style={{ color: '#000000' }}>
                    {user?.full_name?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: '#60A5FA' }}>
                    {user?.full_name || 'User'}
                  </p>
                  <p className="text-xs truncate" style={{ color: '#60A5FA' }}>
                    {user?.email || ''}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors duration-200"
                style={{ backgroundColor: '#EF4444', color: '#60A5FA', borderColor: '#60A5FA' }}
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium">Logout</span>
              </button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          <header className="border-b px-6 py-4 md:hidden" style={{ borderColor: '#60A5FA', backgroundColor: '#374151' }}>
            <div className="flex items-center gap-4">
              <SidebarTrigger className="p-2 rounded-lg transition-colors duration-200" style={{ color: '#60A5FA' }} />
              <h1 className="text-xl font-bold" style={{ color: '#60A5FA' }}>TriageLink</h1>
            </div>
          </header>

          <div className="flex-1 overflow-auto" style={{ backgroundColor: '#000000' }}>
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}