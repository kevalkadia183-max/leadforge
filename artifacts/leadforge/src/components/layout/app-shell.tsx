import React from 'react';
import { Link, useLocation } from 'wouter';
import { UserButton } from '@clerk/react';
import { LayoutDashboard, Users, Mail, Settings, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/leads', label: 'Leads', icon: Users },
    { href: '/outreach', label: 'Outreach', icon: Mail },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex h-[100dvh] bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside className="w-16 md:w-64 border-r border-border bg-card flex flex-col shrink-0 transition-all duration-300">
        <div className="h-16 flex items-center justify-center md:justify-start md:px-6 border-b border-border">
          <Link href="/" className="flex items-center gap-3 text-primary font-bold text-lg cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0">
              <Activity size={18} strokeWidth={2.5} />
            </div>
            <span className="hidden md:block tracking-tight">LeadForge</span>
          </Link>
        </div>
        
        <nav className="flex-1 py-6 px-3 flex flex-col gap-2 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== '/' && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} className={cn(
                "flex items-center justify-center md:justify-start gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )} title={item.label}>
                <item.icon size={18} className={cn(isActive ? "opacity-100" : "opacity-80")} />
                <span className="hidden md:block">{item.label}</span>
              </Link>
            )
          })}
        </nav>
        
        <div className="p-4 border-t border-border flex flex-col md:flex-row items-center justify-center md:justify-start gap-3 bg-muted/20">
          <UserButton appearance={{ elements: { userButtonAvatarBox: "w-8 h-8 rounded-md" } }} />
          <div className="hidden md:block min-w-0">
            <div className="text-sm font-medium text-foreground truncate">My Account</div>
            <div className="text-xs text-muted-foreground">Manage profile</div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {children}
      </main>
    </div>
  );
}
