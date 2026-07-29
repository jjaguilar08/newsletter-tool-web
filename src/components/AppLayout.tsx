import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import {
    buttonSecondary,
    mutedText,
    sidebar,
    sidebarBrand,
    sidebarFooter,
    sidebarNav,
    sidebarNavLink,
    sidebarNavLinkActive,
} from '../styles/ui'

const NAV_ITEMS = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/subscribers', label: 'Subscribers' },
    { to: '/campaigns', label: 'Campaigns' },
]

// Shared chrome for every protected page - one sidebar instead of each page
// building its own nav/signed-in-as/logout header. Wired in as a layout
// route in App.tsx (nested inside ProtectedRoute, same <Outlet /> pattern),
// so pages below only ever render their own content.
export function AppLayout() {
    const { user, logout } = useAuth()

    return (
        <div className="flex min-h-screen bg-slate-50">
            <aside className={sidebar}>
                <div>
                    <p className={sidebarBrand}>Newsletter Tool</p>
                    <nav className={sidebarNav}>
                        {NAV_ITEMS.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={({ isActive }) =>
                                    isActive ? sidebarNavLinkActive : sidebarNavLink
                                }
                            >
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>
                </div>

                <div className={sidebarFooter}>
                    <p className={mutedText}>Signed in as {user?.name}</p>
                    <button
                        type="button"
                        onClick={() => void logout()}
                        className={`${buttonSecondary} mt-3 w-full`}
                    >
                        Log out
                    </button>
                </div>
            </aside>

            <main className="min-w-0 flex-1 overflow-y-auto">
                <Outlet />
            </main>
        </div>
    )
}
