const express = require('express')
const fileUpload = require('express-fileupload')
const app = express()

// CORS allow all
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*")
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
  next()
})

app.use('/storage', express.static('storage'))

app.use(fileUpload({
  createParentPath: true,
  useTempFiles: true,
  safeFileNames: true,
  // Limits are being set by nginx
  // limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
}))

app.post('/upload', function(req, res) {

  let file = req.files?.file
  if (!file) {
    return res.status(400).send('No files were uploaded.')
  }

  let md5 = file.md5
  let uploadPath = `/storage/${md5}/${file.name}`
  file.mv(__dirname + uploadPath, function(err) {
    if (err) {
      return res.status(500).send(err)
    }

    res.send(uploadPath)
  })
})

app.listen(3000, () => {
  console.log('running server...')
})