const express = require('express')
const fileUpload = require('express-fileupload')
const app = express()
const puppeteer = require('puppeteer-core')

const PORT = 3000

// CORS allow all
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*")
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
  next()
})

app.use('/storage', express.static('storage'))

app.use(fileUpload({
  createParentPath: true,
  useTempFiles: true,
  safeFileNames: true,
  preserveExtension: true,
  // Limits are being set by nginx
  // limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
}))

app.post('/upload', function (req, res) {

  let file = req.files?.file
  if (!file) {
    return res.status(400).send('No files were uploaded.')
  }

  let md5 = file.md5
  let uploadPath = `/storage/${md5}/${file.name}`
  file.mv(__dirname + uploadPath, function (err) {
    if (err) {
      return res.status(500).send(err)
    }

    res.send(uploadPath)
  })
})

app.get('/screenshot', async (req, res) => {
  const { id } = req.query

  const usage = "https://s.vercel.app/api?url=https://google.com&width=1280&height=720"
  try {
    const file = await getScreenshot(id)
    res.setHeader('Content-Type', `image/png`);
    res.setHeader('Cache-Control', `public, immutable, no-transform, s-maxage=31536000, max-age=31536000`);
    res.status(200).end(file);
  } catch (error) {
    console.error(error)
    res.setHeader('Content-Type', 'application/json');
    res.status(400).json({
      "success": false,
      "error": "The server encountered an error. You may have inputted an invalid query.",
      //"dev": error,
      "usage": usage
    });
  }
})

app.listen(PORT || 3000, () => {
  console.log('running server...')
})

async function getScreenshot(id) {
  const browser = await puppeteer.launch({
    executablePath: '/run/current-system/sw/bin/google-chrome-stable',
    headless: true,
  })

  let file

  try {
    console.log('opening new page')
    const page = await browser.newPage()
    await page.goto(`https://as.hack.af/card.html?id=${id}`)
    console.log('went to url')
    await page.setViewport({ width: 2400, height: 3600 })

    await page.waitForFunction('window.AssembleScrapbookCardView__Ready == true')

    console.log('waiting for assemble')
    await page.waitForFunction('window.AssembleScrapbookCardView__Ready == true')

    console.log('getting screenshot')
    file = await page.screenshot({ fullPage: true, omitBackground: true })
    console.log('closing')
  } catch (e) {
    console.log(e)
  } finally {
    await browser.close()
  }
  return file
}