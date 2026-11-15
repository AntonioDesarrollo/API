import { useEffect, useState } from 'react'
import { HashRouter, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { I } from '@/components/Icons'
import { NowPlaying } from '@/components/NowPlaying'
import { PlayerBar } from '@/components/PlayerBar'
import { Toasts } from '@/components/Toasts'
import { AlbumPage } from '@/pages/Album'
import { ArtistPage } from '@/pages/Artist'
import { Home } from '@/pages/Home'
import { Library } from '@/pages/Library'
import { LikedPage } from '@/pages/Liked'
import { Login } from '@/pages/Login'
import { PlaylistPage } from '@/pages/Playlist'
import { QueuePage } from '@/pages/Queue'
import { Search } from '@/pages/Search'
import { Settings } from '@/pages/Settings'
import { Setup } from '@/pages/Setup'
import { useAuth } from '@/store/auth'
import { usePlayer } from '@/store/player'
import { usePrefs } from '@/store/prefs'

function useSideNav(): boolean {
  const pref = usePrefs((s) => s.navPosition)
  const [wide, setWide] = useState(() => window.innerWidth >= 900)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px)')
    const fn = () => setWide(mq.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])
  return pref === 'lado' ? true : pref === 'abajo' ? false : wide
}

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    document.querySelector('.app > main')?.scrollTo({ top: 0 })
  }, [pathname])
  return null
}

function Shell() {
  const side = useSideNav()
  const init = usePlayer((s) => s.init)
  useEffect(() => {
    init()
  }, [init])
  const links = [
    { to: '/', label: 'Inicio', icon: <I.Home /> },
    { to: '/search', label: 'Buscar', icon: <I.Search /> },
    { to: '/library', label: 'Biblioteca', icon: <I.Library /> },
    { to: '/settings', label: 'Ajustes', icon: <I.Settings /> },
  ]
  return (
    <div className={`app ${side ? 'side' : ''}`}>
      <ScrollTop />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/library" element={<Library />} />
          <Route path="/liked" element={<LikedPage />} />
          <Route path="/queue" element={<QueuePage />} />
          <Route path="/playlist/:id" element={<PlaylistPage />} />
          <Route path="/album/:id" element={<AlbumPage />} />
          <Route path="/artist/:id" element={<ArtistPage />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <PlayerBar />
      <nav className="nav">
        <div className="brand"><img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" />Ondas</div>
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
            {l.icon}
            <span>{l.label}</span>
          </NavLink>
        ))}
      </nav>
      <NowPlaying />
    </div>
  )
}

export default function App() {
  const { status, init } = useAuth()
  useEffect(() => {
    init()
  }, [init])
  return (
    <HashRouter>
      {status === 'loading' && <div className="spinner" style={{ marginTop: '30vh' }} />}
      {status === 'setup' && <Setup />}
      {status === 'anon' && <Login />}
      {status === 'ok' && <Shell />}
      <Toasts />
    </HashRouter>
  )
}
