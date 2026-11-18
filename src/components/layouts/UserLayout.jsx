import React from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../shared/Sidebar'

function UserLayout() {
  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  )
}

export default UserLayout