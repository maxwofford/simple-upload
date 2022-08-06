const express = require('express')
const fileUpload = require('express-fileupload')
const app = express()
const puppeteer = require('puppeteer-core');

const PORT = 3002;

let browser;

(async () => {
  browser = await puppeteer.launch({
    executablePath: '/run/current-system/sw/bin/google-chrome-stable',
    headless: true,
  });
})();

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

app.get('/png/:id', async (req, res) => {
  res.redirect(`/screenshot?doNotAddStyles=true&waitForAssemble=true&url=https%3A%2F%2Fas.hack.af%2Fcard.html%3Fid%3D${req.params.id}%26scale6x%3Dtrue&height=3600&width=2400`);
})

app.get('/screenshot', async (req, res) => {

  const usage = "https://s.vercel.app/api?url=https://google.com&width=1280&height=720"
  if (!req.query.url) return res.status(400).json({
    "success": false,
    "error": "No url query specified.",
    "usage": usage
  });
  try {
    const file = await getScreenshot(req.query.url, req.query.width, req.query.height, req.query.doNotAddStyles == 'true', req.query.waitForAssemble == 'true');
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

async function getScreenshot(url, width, height, dontAddStyle, waitFor) {
  console.log('opening new page')
  const page = await browser.newPage();
  await page.goto(url);
  console.log('went to url')
  await page.setViewport({ width: Number(width) || 1280, height: Number(height) || 720 });

  if (waitFor) await page.waitForFunction('window.AssembleScrapbookCardView__Ready == true');

  console.log('waiting for assemble')
  if (waitFor) Promise.any([
    page.waitForFunction('window.AssembleScrapbookCardView__Ready == true'),
    new Promise(r => setTimeout(r, 10000))
  ]);
  console.log('getting screenshot')
  const file = await page.screenshot({ fullPage: true, omitBackground: true });
  console.log('closing');
  page.close();
  return file;
}