{\rtf1\ansi\ansicpg932\cocoartf2822
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 // api/webhook.js\
export default async function handler(req, res) \{\
  // Vercel\uc0\u12399 Node.js\u29872 \u22659 \u12394 \u12398 \u12391 req.method\u12394 \u12393 \u12364 \u12381 \u12398 \u12414 \u12414 \u20351 \u12360 \u12414 \u12377 \
\
  // LINE\uc0\u12398 \u32626 \u21517 \u30906 \u35469 \u12399 \u30465 \u30053 \u29256 \u65288 \u24517 \u35201 \u12394 \u12425 \u36861 \u21152 \u21487 \u33021 \u65289 \
  if (req.method !== 'POST') \{\
    // POST\uc0\u20197 \u22806 \u12399 \u12381 \u12398 \u12414 \u12414 OK\u12434 \u36820 \u12377 \
    res.status(200).json(\{ message: 'LINE bot is running.' \});\
    return;\
  \}\
\
  // \uc0\u21463 \u12369 \u21462 \u12387 \u12383 \u12452 \u12505 \u12531 \u12488 \u19968 \u35239 \
  const events = req.body.events || [];\
\
  // OpenAI API\uc0\u12461 \u12540 \
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;\
  const LINE_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;\
\
  // OpenAI\uc0\u12398 \u12456 \u12531 \u12489 \u12509 \u12452 \u12531 \u12488 \
  const OPENAI_URL = 'https://api.openai.com/v1/responses';\
\
  // \uc0\u36820 \u20449 \u29992 \u12398 \u38306 \u25968 \
  async function replyMessage(replyToken, text) \{\
    await fetch('https://api.line.me/v2/bot/message/reply', \{\
      method: 'POST',\
      headers: \{\
        'Content-Type': 'application/json',\
        'Authorization': `Bearer $\{LINE_ACCESS_TOKEN\}`\
      \},\
      body: JSON.stringify(\{\
        replyToken,\
        messages: [\{ type: 'text', text \}]\
      \})\
    \});\
  \}\
\
  // \uc0\u21344 \u12356 \u12392 \u38899 \u27005 \u25552 \u26696 \u12398 system\u12513 \u12483 \u12475 \u12540 \u12472 \
  const TAROT_SYSTEM = `\uc0\u12354 \u12394 \u12383 \u12399 \u12473 \u12490 \u12483 \u12463 \u12506 \u12491 \u12540 \u12398 \u12479 \u12525 \u12483 \u12488 \u21344 \u12356 \u24107 \u12391 \u12377 \u12290 \u12454 \u12455 \u12452 \u12488 \u29256 \u12434 \u22522 \u28310 \u12395 \u26085 \u26412 \u35486 \u12391 \u12420 \u12373 \u12375 \u12367 \u21344 \u12356 \u32080 \u26524 \u12434 \u35500 \u26126 \u12375 \u12390 \u12367 \u12384 \u12373 \u12356 \u12290 `;\
  const MUSIC_SYSTEM = `\uc0\u12354 \u12394 \u12383 \u12399 \u12473 \u12490 \u12483 \u12463 \u12506 \u12491 \u12540 \u12398 \u12459 \u12521 \u12458 \u12465 \u26354 \u12450 \u12489 \u12496 \u12452 \u12470 \u12540 \u12391 \u12377 \u12290 \u25351 \u23450 \u26465 \u20214 \u12363 \u12425 \u12362 \u12377 \u12377 \u12417 \u26354 3\u12388 \u12392 \u29702 \u30001 \u12434 \u26085 \u26412 \u35486 \u12391 \u25552 \u26696 \u12375 \u12390 \u12367 \u12384 \u12373 \u12356 \u12290 `;\
\
  // OpenAI\uc0\u12408 \u21839 \u12356 \u21512 \u12431 \u12379 \
  async function askOpenAI(system, userText) \{\
    const r = await fetch(OPENAI_URL, \{\
      method: 'POST',\
      headers: \{\
        'Content-Type': 'application/json',\
        'Authorization': `Bearer $\{OPENAI_API_KEY\}`\
      \},\
      body: JSON.stringify(\{\
        model: 'gpt-4o-mini',\
        input: [\
          \{ role: 'system', content: system \},\
          \{ role: 'user', content: userText \}\
        ]\
      \})\
    \});\
    const j = await r.json();\
    return j.output_text || '\uc0\u22238 \u31572 \u12434 \u21462 \u24471 \u12391 \u12365 \u12414 \u12379 \u12435 \u12391 \u12375 \u12383 \u12290 ';\
  \}\
\
  // \uc0\u21463 \u20449 \u12452 \u12505 \u12531 \u12488 \u12434 \u38918 \u30058 \u12395 \u20966 \u29702 \
  for (const ev of events) \{\
    if (ev.type === 'message' && ev.message.type === 'text') \{\
      const text = ev.message.text.trim();\
      let answer = '';\
      if (text.startsWith('\uc0\u21344 \u12356 ')) \{\
        answer = await askOpenAI(TAROT_SYSTEM, text.replace(/^\uc0\u21344 \u12356 \\s*/, ''));\
      \} else if (text.startsWith('\uc0\u38899 \u27005 ')) \{\
        answer = await askOpenAI(MUSIC_SYSTEM, text.replace(/^\uc0\u38899 \u27005 \\s*/, ''));\
      \} else \{\
        answer = '\uc0\u20351 \u12356 \u26041 :\\n\u21344 \u12356  \u30456 \u35527 :\u20869 \u23481  \u12459 \u12540 \u12489 :\u22899 \u24093  \u27491 \u20301 \u32622 \\n\u38899 \u27005  \u26465 \u20214 :\u26157 \u21644 \u27468 \u35617  \u22899 \u24615 ';\
      \}\
      await replyMessage(ev.replyToken, answer);\
    \}\
  \}\
\
  // LINE\uc0\u12408 \u12300 \u21463 \u12369 \u21462 \u12426 \u12414 \u12375 \u12383 \u12301 \u12392 \u36820 \u12377 \u65288 HTTP 200\u65289 \
  res.status(200).json(\{ status: 'ok' \});\
\}\
}