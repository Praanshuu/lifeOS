"use client"

import { useState } from "react";
import { LayoutDashboard, Target, Brain, Shield, Activity, LucideIcon, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const Sidebar = () => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const NavItem = ({
    icon: Icon,
    label,
    href,
    active,
  }: { icon: LucideIcon; label: string; href: string; active: boolean }) => {
    return (
      <Link href={href} onClick={() => setIsOpen(false)}>
        <div
          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${active ? "bg-zinc-900 text-cyan-400" : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
            }`}
        >
          <Icon className={`w-5 h-5 ${active ? "text-cyan-400" : "text-zinc-400"}`} />
          <span className="font-medium text-sm">{label}</span>
        </div>
      </Link>
    );
  };

  return (
    <>
      {/* Mobile Top Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900 z-40 flex items-center justify-between px-4 shadow-sm">
        <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">LifeOS</h1>
        </div>
        <button onClick={() => setIsOpen(!isOpen)} className="text-zinc-400 hover:text-white p-2">
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity" onClick={() => setIsOpen(false)} />
      )}

      {/* Sidebar Desktop + Mobile */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-zinc-950 flex flex-col border-r border-zinc-900 z-50 transform transition-transform duration-300 ease-in-out md:translate-x-0 shadow-2xl md:shadow-none ${isOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-6 md:p-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">LifeOS</h1>
            <h3 className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold mt-1">Command Center</h3>
          </div>
          <button className="md:hidden text-zinc-400 hover:text-white" onClick={() => setIsOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <nav className="flex flex-col gap-1 px-4 mt-2">
          <NavItem href="/" icon={LayoutDashboard} label="Focus Today" active={pathname === "/"} />
          <NavItem href="/logs" icon={Activity} label="Activity Logs" active={pathname === "/logs"} />
          <NavItem href="/goals" icon={Target} label="Goal Strategy" active={pathname === "/goals"} />
          <div className="my-6 border-t border-zinc-900/80 mx-2"></div>
          <NavItem href="/bodyguard" icon={Shield} label="AI Bodyguard" active={pathname === "/bodyguard"} />
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;