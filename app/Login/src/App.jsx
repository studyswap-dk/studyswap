import { useState, useEffect } from 'react'
import { authClient } from './auth'
import './App.css'

const API = 'http://localhost:3001'
const AU_MAIL = /^[^\s@]+@([a-z0-9-]+\.)*au\.dk$/i

// Henter et friskt JWT fra Neon Auth (udløber efter 15 minutter)
async function hentToken() {
  try {
    const { data, error } = await authClient.token()
    if (error || !data?.token) return null
    return data.token
  } catch {
    return null
  }
}
// Spørger serveren, om tokenet er gyldigt og kommer fra en AU-mail
async function tjekMedServer(token) {
  try {
    const res = await fetch(`${API}/api/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json().catch(() => ({}))
    console.log('Server svarede', res.status, data)
    return res.ok ? data : null
  } catch (fejl) {
    console.error('Kunne ikke nå serveren:', fejl)
    return null
  }
}

function App() {
  const [trin, setTrin] = useState('email') // 'email' | 'kode' | 'inde'
  const [email, setEmail] = useState('')
  const [kode, setKode] = useState('')
  const [besked, setBesked] = useState('')
  const [henter, setHenter] = useState(false)

  // Er brugeren allerede logget ind fra sidst?
  useEffect(() => {
    async function hentSession() {
      try {
        const token = await hentToken()
        if (!token) return
        const bruger = await tjekMedServer(token)
        if (bruger) {
          setEmail(bruger.email)
          setTrin('inde')
        }
      } catch (fejl) {
        console.error(fejl)
      }
    }
    hentSession()
  }, [])

  async function sendKode(e) {
    e.preventDefault()
    setBesked('')

    if (!AU_MAIL.test(email.trim())) {
      setBesked('Brug din AU-mail (skal ende på au.dk)')
      return
    }

    setHenter(true)
    try {
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email: email.trim().toLowerCase(),
        type: 'sign-in',
      })
      if (error) throw error
      setTrin('kode')
      setBesked('Vi har sendt en kode til ' + email)
    } catch (fejl) {
      console.error(fejl)
      setBesked(fejl.message || 'Kunne ikke sende koden')
    }
    setHenter(false)
  }

  async function tjekKode(e) {
    e.preventDefault()
    setBesked('')
    setHenter(true)

    try {
      const { error } = await authClient.signIn.emailOtp({
        email: email.trim().toLowerCase(),
        otp: kode.trim(),
      })
      if (error) throw error

      const token = await hentToken()
      const bruger = token ? await tjekMedServer(token) : null

      if (!bruger) {
        await authClient.signOut()
        setBesked('Serveren afviste login. Se konsollen (F12) for detaljer.')
        setHenter(false)
        return
      }

      setKode('')
      setBesked('')
      setTrin('inde')
    } catch (fejl) {
      console.error(fejl)
      setBesked(fejl.message || 'Forkert kode')
    }
    setHenter(false)
  }

  async function logUd() {
    await authClient.signOut()
    setEmail('')
    setKode('')
    setBesked('')
    setTrin('email')
  }

  return (
    <div className="login">
      <img src="/studyswap-logo-curves.svg" alt="StudySwap logo" className="login-billede" />

      {trin === 'email' && (
        <form onSubmit={sendKode}>
          <input
            type="email"
            placeholder="AU-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit" disabled={henter}>Send kode</button>
        </form>
      )}

      {trin === 'kode' && (
        <form onSubmit={tjekKode}>
          <input
            type="text"
            inputMode="numeric"
            placeholder="Kode fra mail"
            value={kode}
            onChange={(e) => setKode(e.target.value)}
            required
          />
          <button type="submit" disabled={henter}>Log ind</button>
          <button type="button" onClick={() => { setTrin('email'); setBesked('') }}>
            Skift mail
          </button>
        </form>
      )}

      {trin === 'inde' && (
        <>
          <p>Logget ind som {email}</p>
          <button onClick={logUd}>Log ud</button>
        </>
      )}

      {besked && <p className="besked">{besked}</p>}
    </div>
  )
}

export default App