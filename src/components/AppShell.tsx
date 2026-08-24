"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { usePathname } from "next/navigation";

interface SidebarContextType {
    isCollapsed: boolean;
    setIsCollapsed: (collapsed: boolean) => void;
    toggleSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType>({
    isCollapsed: false,
    setIsCollapsed: () => {},
    toggleSidebar: () => {},
});

export const useSidebar = () => useContext(SidebarContext);

export function AppShell({ children }: { children: React.ReactNode }) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [mounted, setMounted] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        setMounted(true);
        const stored = localStorage.getItem("lifeos_sidebar_collapsed");
        if (stored !== null) {
            setIsCollapsed(stored === "true");
        }
    }, []);

    const toggleSidebar = () => {
        setIsCollapsed(prev => {
            const next = !prev;
            localStorage.setItem("lifeos_sidebar_collapsed", String(next));
            return next;
        });
    };

    const isBodyguardPage = pathname === "/bodyguard";

    return (
        <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed, toggleSidebar }}>
            <Sidebar isCollapsed={isCollapsed} onToggle={toggleSidebar} />
            <main
                className={`min-h-screen transition-all duration-300 ease-in-out ${
                    isCollapsed ? "md:pl-[72px]" : "md:pl-64"
                } pt-16 md:pt-0 flex flex-col`}
            >
                <div
                    className={`w-full mx-auto flex-1 flex flex-col ${
                        isBodyguardPage
                            ? "max-w-5xl px-4 sm:px-6 py-4 md:py-6"
                            : "max-w-6xl p-6 md:p-10 lg:p-14"
                    }`}
                >
                    {children}
                </div>
            </main>
        </SidebarContext.Provider>
    );
}
