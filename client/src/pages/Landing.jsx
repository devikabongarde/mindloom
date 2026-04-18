import { useEffect } from 'react'
import ScrollScenes from '../landing/ScrollScenes'
import '../landing/landing.css'

export default function Landing() {
  useEffect(() => {
    document.body.classList.add('landing-theme')

    return () => {
      document.body.classList.remove('landing-theme')
    }
  }, [])

  return <ScrollScenes />
}
