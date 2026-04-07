import { useNavigate, useLocation } from 'react-router-dom'
import {
    LayoutDashboard, Calendar, BookOpen, Monitor, FolderOpen, Layers,
    Ticket, ChevronLeft, ChevronRight,
    User, ShieldCheck, Tag, UserPlus, Map
} from 'lucide-react'

const menu = [
    {
        section: 'MENÚ',
        items: [
            { label: 'Inicio', icon: LayoutDashboard, path: '/dashboard' },
            { label: 'Calendario', icon: Calendar, path: '/calendario' },
        ]
    },
    {
        section: 'ACADEMIA',
        items: [
            { label: 'Cursos', icon: BookOpen, path: '/courses' },
            { label: 'Matrículas', icon: UserPlus, path: '/matriculas' },
            { label: 'Rutas', icon: Map, path: '/rutas' },
            { label: 'Simuladores', icon: Monitor, path: '/simuladores' },
            { label: 'Recursos', icon: FolderOpen, path: '/recursos' },
        ]
    },
    {
        section: 'HERRAMIENTAS',
        items: [
            { label: 'Flashcards', icon: Layers, path: '/flashcards' },
        ]
    },
    {
        section: 'SOPORTE',
        items: [
            { label: 'Tickets', icon: Ticket, path: '/tickets' },
            { label: 'Categorías', icon: Tag, path: '/categorias' },
        ]

    },
    {
        section: 'CONFIGURACIÓN',
        items: [
            { label: 'Usuarios', icon: User, path: '/users' },
            { label: 'Roles', icon: ShieldCheck, path: '/roles' },
        ]

    },
]

export default function Sidebar({ collapsed, onToggle }) {
    const navigate = useNavigate()
    const location = useLocation()

    return (
        <aside className={`h-screen bg-gray-900 text-white flex flex-col transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'} fixed top-0 left-0 z-40`}>
            {/* Logo */}
            <div className={`flex items-center h-16 px-4 border-b border-gray-700 ${collapsed ? 'justify-center' : 'justify-between'}`}>
                {!collapsed && (
                    <span className="text-xl font-bold text-white tracking-wide">EduApp</span>
                )}
                <button
                    onClick={onToggle}
                    className="p-1.5 rounded-lg hover:bg-gray-700 transition text-gray-400 hover:text-white"
                >
                    {collapsed ? <ChevronRight size={20}/> : <ChevronLeft size={20}/>}
                </button>
            </div>

            {/* Menu */}
            <nav className="flex-1 overflow-y-auto py-4 space-y-4">
                {menu.map((group) => (
                <div key={group.section}>
                    {!collapsed && (
                    <p className="text-xs font-semibold text-gray-500 uppercase px-4 mb-1 tracking-wider">
                        {group.section}
                    </p>
                    )}
                    {group.items.map((item) => {
                    const Icon = item.icon
                    const isActive = location.pathname === item.path
                    return (
                        <button
                        key={item.path}
                        onClick={() => navigate(item.path)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 transition-all
                            ${isActive
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                            }
                            ${collapsed ? 'justify-center' : ''}
                        `}
                        title={collapsed ? item.label : ''}
                        >
                        <Icon size={20} />
                        {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                        </button>
                    )
                    })}
                </div>
                ))}
            </nav>
        </aside>
    )
}