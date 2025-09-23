{\rtf1\ansi\ansicpg932\cocoartf2822
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fnil\fcharset0 HelveticaNeue;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\paperw11900\paperh16840\margl1440\margr1440\vieww29200\viewh18400\viewkind0
\deftab560
\pard\pardeftab560\slleading20\pardirnatural\partightenfactor0

\f0\fs26 \cf0 import 'dotenv/config'\
import express from 'express'\
import crypto from 'crypto'\
import fetch from 'node-fetch'\
\
const app = express()\
app.use(express.json())\
\
const LINE_REPLY_URL = 'https://api.line.me/v2/bot/message/reply'\
const LINE_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN\
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET\
\
const OPENAI_URL = 'https://api.openai.com/v1/responses'\
const OPENAI_KEY = process.env.OPENAI_API_KEY\
const MODEL = 'gpt-4o-mini'  // \uc0\u12467 \u12473 \u12488 \u12434 \u25233 \u12360 \u12388 \u12388 \u39640 \u36895 \
\
// --- LINE\uc0\u32626 \u21517 \u26908 \u35388 \
function validateLineSignature(req) \{\
  const signature = req.headers['x-line-signature']\
  const body = JSON.stringify(req.body)\
  const hash = crypto.createHmac('sha256', LINE_CHANNEL_SECRET)\
                     .update(body).digest('base64')\
  return signature === hash\
\}\
\
// --- \uc0\u21344 \u12356 \u29992 system\u12513 \u12483 \u12475 \u12540 \u12472 \
const TAROT_SYSTEM = `\
\uc0\u12354 \u12394 \u12383 \u12399 \u12473 \u12490 \u12483 \u12463 \u12506 \u12491 \u12540 \u12398 \u12479 \u12525 \u12483 \u12488 \u21344 \u12356 \u24107 \u12391 \u12377 \u12290 \
\uc0\u12454 \u12455 \u12452 \u12488 \u29256 \u12434 \u22522 \u28310 \u12395 \u12289 \u26085 \u26412 \u35486 \u12391 \u12420 \u12373 \u12375 \u12367 \u32080 \u26524 \u12434 \u12414 \u12392 \u12417 \u12390 \u12367 \u12384 \u12373 \u12356 \u12290 \
`\
// --- \uc0\u38899 \u27005 \u25552 \u26696 system\u12513 \u12483 \u12475 \u12540 \u12472 \
const MUSIC_SYSTEM = `\
\uc0\u12354 \u12394 \u12383 \u12399 \u12473 \u12490 \u12483 \u12463 \u12398 \u12459 \u12521 \u12458 \u12465 \u26354 \u12450 \u12489 \u12496 \u12452 \u12470 \u12540 \u12391 \u12377 \u12290 \
\uc0\u25351 \u23450 \u12373 \u12428 \u12383 \u26465 \u20214 \u12363 \u12425 \u12362 \u12377 \u12377 \u12417 \u26354 3\u12388 \u12392 \u29702 \u30001 \u12434 \u26085 \u26412 \u35486 \u12391 \u25552 \u26696 \u12375 \u12390 \u12367 \u12384 \u12373 \u12356 \u12290 \
`\
\
async function askOpenAI(system, userInput) \{\
  const res = await fetch(OPENAI_URL, \{\
    method: 'POST',\
    headers: \{\
      'Content-Type': 'application/json',\
      'Authorization': `Bearer $\{OPENAI_KEY\}`\
    \},\
    body: JSON.stringify(\{\
      model: MODEL,\
      input: [\
        \{ role: 'system', content: system \},\
        \{ role: 'user', content: userInput \}\
      ]\
    \})\
  \})\
  const json = await res.json()\
  return json.output_text || '\uc0\u22238 \u31572 \u12364 \u24471 \u12425 \u12428 \u12414 \u12379 \u12435 \u12391 \u12375 \u12383 '\
\}\
\
async function replyLine(token, text) \{\
  await fetch(LINE_REPLY_URL, \{\
    method: 'POST',\
    headers: \{\
      'Content-Type': 'application/json',\
      'Authorization': `Bearer $\{LINE_ACCESS_TOKEN\}`\
    \},\
    body: JSON.stringify(\{\
      replyToken: token,\
      messages: [\{ type: 'text', text \}]\
    \})\
  \})\
\}\
\
app.post('/webhook', async (req, res) => \{\
  if (!validateLineSignature(req)) return res.sendStatus(403)\
  const events = req.body.events || []\
\
  for (const ev of events) \{\
    if (ev.type === 'message' && ev.message.type === 'text') \{\
      const text = ev.message.text.trim()\
      let answer = ''\
      if (text.startsWith('\uc0\u21344 \u12356 ')) \{\
        answer = await askOpenAI(TAROT_SYSTEM, text.replace(/^\uc0\u21344 \u12356 \\s*/, ''))\
      \} else if (text.startsWith('\uc0\u38899 \u27005 ')) \{\
        answer = await askOpenAI(MUSIC_SYSTEM, text.replace(/^\uc0\u38899 \u27005 \\s*/, ''))\
      \} else \{\
        answer = '\uc0\u20351 \u12356 \u26041 :\\n\u21344 \u12356  \u30456 \u35527 :\u20869 \u23481  \u12459 \u12540 \u12489 :\u22899 \u24093  \u27491 \u20301 \u32622 \\n\u38899 \u27005  \u26465 \u20214 :\u26157 \u21644 \u27468 \u35617  \u22899 \u24615 '\
      \}\
      await replyLine(ev.replyToken, answer)\
    \}\
  \}\
  res.sendStatus(200)\
\})\
\
app.get('/', (req, res) => res.send('Penny LINE bot is running.'))\
app.listen(3000)\
}