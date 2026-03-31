import  { useState } from'react'
import Sidebar from './Sidebar'
import Navbar from './Navbar'

export default function Layout ({ children }) {
    const [collapsed, setCollapsed] = useState(false)

    return (
        <div className="min-h-screen bg-gray-100">
            <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
            <Navbar collapsed={collapsed} />
            <main className={`pt-16 transition-all duration-300 ${collapsed ? 'ml-16' : 'ml-64'}`}>
                <div className="p-6">
                    {children}
                </div>
            </main>
        </div>
    )
}