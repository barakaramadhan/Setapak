import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../shared/Sidebar'
import { useSettings } from '../../store/useSettings'
import { useOnline } from '../../store/useOnline'

function UserLayout() {
  const { resolvedTheme } = useSettings()
  const online = useOnline()

  // Tema gelap hanya berlaku di area user; dilepas lagi saat keluar dari area ini.
  useEffect(() => {
    const dark = resolvedTheme === 'dark'
    document.body.classList.toggle('theme-dark', dark)
    return () => document.body.classList.remove('theme-dark')
  }, [resolvedTheme])

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <main className="flex-1 min-w-0 max-lg:pt-14">
        {!online && (
          <div
            role="status"
            className="flex items-center justify-center gap-2 bg-grey-light px-4 py-2 text-center font-jakarta text-sm font-semibold text-white"
          >
            <i className="fi fi-rr-wifi-slash leading-none" />
            Mode offline: kamu melihat rencana trip yang tersimpan di perangkat. Chat AI butuh internet.
          </div>
        )}
        <Outlet />
      </main>
    </div>
  )
}

export default UserLayout
