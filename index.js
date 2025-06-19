const express = require('express')
const path = require('path')
const speakeasy = require('speakeasy')
const qr = require('qr-image');
const bodyParser = require('body-parser')

const port = process.env.PORT || 5006

const app = express()

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

app.use(express.static(path.join(__dirname, 'public')))
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

app.get('/', (req, res) => {
  console.log(`Rendering 'pages/index' for route '/'`)
  var locals = {}
  var secret = speakeasy.generateSecret({length: 20})
  const otpauthURL = speakeasy.otpauthURL({
    secret: secret.base32,
    label: 'OTP for Agentforce'
  })
  secret.otpauth_url = otpauthURL
  locals.secret = secret
  locals.qrPath = '/qrcode?qrurl=' + encodeURIComponent(otpauthURL)
  locals.token = getToken(locals.secret.base32)
  console.log('locals',locals)
  res.render('pages/index',locals)
})

app.post('/generate', async (req, res) => {
  const usrNew = 'Custom OTP' + (req.body.user==undefined?'':' '+req.body.user)
  const secret = speakeasy.generateSecret({length: 20})
  const otpauthURL = speakeasy.otpauthURL({
    secret: secret.base32,
    label: usrNew
  })
  secret.otpauth_url = otpauthURL;
  console.log(secret)
  try {
    const qrPath = '/qrcode?qrurl=' + encodeURIComponent(otpauthURL);
    res.send({
      'secret': secret, 
      'qrPath': qrPath
    })
  } catch (error) {
    res.status(500).send('Error generating QR code')
  }
})

app.get('/token', function (req, res) {
  res.send({'token': getToken(req.query.secret)})
})

app.post('/verify', (req, res) => {
  const { secret, token } = req.body
  console.log(secret, token)
  if (verifyToken(secret, token)) {
    res.send('Verified')
  } else {
    res.send('Failed to verify')
  }
})



app.get('/qrcode', function(req, res) {
  var code = qr.image(req.query.qrurl, { type: 'png' })
  res.type('png')
  code.pipe(res)
})

function getToken(secret) {
  return speakeasy.time({secret: secret, encoding: 'base32'})
}

function verifyToken(secret, token) {
  return speakeasy.time.verify({secret: secret, encoding: 'base32', token: token})
}

const server = app.listen(port, () => {
  console.log(`Listening on ${port}`)
})

process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: gracefully shutting down')
  if (server) {
    server.close(() => {
      console.log('HTTP server closed')
    })
  }
})
