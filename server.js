const express = require('express')
const fileUpload = require('express-fileupload')
const app = express()
const puppeteer = require('puppeteer-core');

let browser;

(async () => {
  browser = await puppeteer.launch();
})();

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
  preserveExtension: true,
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

app.listen(3000, () => {
  console.log('running server...')
})

async function getScreenshot(url, width, height, dontAddStyle, waitFor) {
  const page = await browser.newPage();
  await page.goto(url);
  await page.setViewport({ width: Number(width) || 1280, height: Number(height) || 720 });
  if (!dontAddStyle) await page.addStyleTag({ content: `
@import url('https://fonts.googleapis.com/css2?family=Albert+Sans:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap');
body, div {
  font-family: 'Albert Sans', sans-serif;
}
html, body {
  background-image: none!important;
  background-color: none!important;
  background: none!important;
}
.graph_instruction, .check, #check_answer_button, #sharing_box, #feedback_box, .footer_desktop, .footer_div, #inline_choices, div.push, .oops_title, .footer_inner_table, #native_ad_div {
  display: none!important;
}
#steps_div {
  border-radius: 12px;
  box-shadow: none;
  border: 3px solid #2ecc71;
}
.banner_ad {
filter: opacity(0%);
}
div.done::after {
  content: '!';
}
  ` });
  if (waitFor) await page.waitForFunction('window.AssembleScrapbookCardView__Ready == true');
  const file = await page.screenshot({ fullPage: true, omitBackground: true });
  page.close();
  return file;
}