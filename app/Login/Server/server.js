import express from 'express'
import cors from 'cors'
import { createRemoteJWKSet, jwtVerify, decodeProtectedHeader, decodeJwt } from 'jose'

const JWKS_URL = process.env.NEON_AUTH_JWKS_URL
if (!JWKS_URL) throw new Error('Mangler NEON_AUTH_JWKS_URL i .env')

const jwks = createRemoteJWKSet(new URL(JWKS_URL))

// Tillader @au.dk og underdomæner, fx @post.au.dk og @student.au.dk
const AU_MAIL = /^[^\s@]+@([a-z0-9-]+\.)*au\.dk$/i

async function kraevLogin(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ fejl: 'Mangler token' })

  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: new URL(JWKS_URL).origin,
    })

    if (!payload.email || !AU_MAIL.test(payload.email)) {
      return res.status(403).json({ fejl: 'Kun AU-mails har adgang' })
    }

    req.bruger = { id: payload.sub, email: payload.email }
    next()
  } catch (fejl) {
    console.error('Ugyldigt token:', fejl.message)

    res.status(401).json({ fejl: 'Ugyldigt eller udløbet token' })
  }
}

const app = express()
app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

app.get('/api/me', kraevLogin, (req, res) => {
  res.json(req.bruger)
})

app.listen(3001, () => {
  console.log('Server kører på http://localhost:3001')
})