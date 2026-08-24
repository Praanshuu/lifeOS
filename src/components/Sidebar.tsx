"use client";

import { useState } from "react";
import {
    LayoutDashboard, Target, Shield, Activity,
    LucideIcon, Menu, X, ChevronLeft, ChevronRight
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

interface NavItemProps {
    icon: LucideIcon;
    label: string;
    href: string;
    active: boolean;
    isCollapsed?: boolean;
    onClick?: () => void;
}

const NavItem = ({
    icon: Icon,
    label,
    href,
    active,
    isCollapsed = false,
    onClick,
}: NavItemProps) => {
    return (
        <Link href={href} onClick={onClick} title={isCollapsed ? label : undefined}>
            <div
                className={`flex items-center ${isCollapsed ? "justify-center p-3" : "gap-3 p-3"} rounded-xl cursor-pointer transition-all duration-200 group relative ${
                    active
                        ? "bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shadow-sm shadow-cyan-950/40"
                        : "text-zinc-400 hover:bg-zinc-900/80 hover:text-zinc-100 border border-transparent"
                }`}
            >
                <Icon className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-105 ${active ? "text-cyan-400" : "text-zinc-400 group-hover:text-zinc-200"}`} />
                {!isCollapsed && (
                    <span className="font-medium text-sm tracking-tight truncate">{label}</span>
                )}
                {/* Collapsed Tooltip */}
                {isCollapsed && (
                    <div className="absolute left-full ml-3 px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs font-semibold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                        {label}
                    </div>
                )}
            </div>
        </Link>
    );
};

export const Sidebar = ({
    isCollapsed = false,
    onToggle,
}: {
    isCollapsed?: boolean;
    onToggle?: () => void;
}) => {
    const pathname = usePathname();
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    return (
        <>
            {/* Mobile Top Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-900 z-40 flex items-center justify-between px-4 shadow-sm">
                <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
                    <Image
                        src="/logo.png"
                        alt="LifeOS Logo"
                        width={24}
                        height={24}
                        className="object-contain"
                    />
                    <h1 className="text-xl font-bold text-white tracking-tight">LifeOS</h1>
                </Link>
                <button onClick={() => setIsMobileOpen(!isMobileOpen)} className="text-zinc-400 hover:text-white p-2">
                    {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>

            {/* Overlay for mobile */}
            {isMobileOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Sidebar Desktop + Mobile */}
            <aside
                className={`fixed inset-y-0 left-0 bg-zinc-950 flex flex-col justify-between border-r border-zinc-900 z-50 transition-all duration-300 ease-in-out md:translate-x-0 shadow-2xl md:shadow-none ${
                    isMobileOpen ? "translate-x-0 w-64" : "-translate-x-full md:translate-x-0"
                } ${isCollapsed ? "md:w-[72px]" : "md:w-64"}`}
            >
                <div>
                    {/* Header */}
                    <div className={`flex items-center ${isCollapsed ? "justify-center p-5" : "justify-between p-6 md:p-7"}`}>
                        <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity group">
                            <Image
                                src="/logo.png"
                                alt="LifeOS Logo"
                                width={32}
                                height={32}
                                className="object-contain transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110 shrink-0"
                            />
                            {!isCollapsed && (
                                <div>
                                    <h1 className="text-xl font-bold text-white tracking-tight">LifeOS</h1>
                                    <h3 className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold group-hover:text-cyan-400 transition-colors">
                                        Command Center
                                    </h3>
                                </div>
                            )}
                        </Link>
                        <button className="md:hidden text-zinc-400 hover:text-white" onClick={() => setIsMobileOpen(false)}>
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className={`flex flex-col gap-1.5 ${isCollapsed ? "px-2.5" : "px-4"} mt-2`}>
                        <NavItem
                            href="/"
                            icon={LayoutDashboard}
                            label="Focus Today"
                            active={pathname === "/"}
                            isCollapsed={isCollapsed}
                            onClick={() => setIsMobileOpen(false)}
                        />
                        <NavItem
                            href="/logs"
                            icon={Activity}
                            label="Activity Logs"
                            active={pathname === "/logs"}
                            isCollapsed={isCollapsed}
                            onClick={() => setIsMobileOpen(false)}
                        />
                        <NavItem
                            href="/goals"
                            icon={Target}
                            label="Goal Strategy"
                            active={pathname === "/goals"}
                            isCollapsed={isCollapsed}
                            onClick={() => setIsMobileOpen(false)}
                        />
                        <div className="my-4 border-t border-zinc-900 mx-2" />
                        <NavItem
                            href="/bodyguard"
                            icon={Shield}
                            label="AI Bodyguard"
                            active={pathname === "/bodyguard"}
                            isCollapsed={isCollapsed}
                            onClick={() => setIsMobileOpen(false)}
                        />
                    </nav>
                </div>

                {/* Bottom Toggle Collapse Button (Desktop Only) */}
                <div className={`hidden md:flex items-center ${isCollapsed ? "justify-center p-3" : "justify-between px-4 py-4"} border-t border-zinc-900`}>
                    {!isCollapsed && (
                        <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Collapse Menu</span>
                    )}
                    <button
                        onClick={onToggle}
                        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                        className="p-2 rounded-xl bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                        {isCollapsed ? (
                            <ChevronRight className="w-4 h-4 text-zinc-400" />
                        ) : (
                            <ChevronLeft className="w-4 h-4 text-zinc-400" />
                        )}
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;