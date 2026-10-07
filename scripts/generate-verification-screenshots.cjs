const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

async function generateScreenshots() {
  const inspectDir = path.resolve(__dirname, '../public/sequence/inspection')
  const optDir = path.resolve(__dirname, '../public/sequence/optimized')
  fs.mkdirSync(inspectDir, { recursive: true })

  const vw = 1440
  const vh = 900
  const bg = { r: 0x14, g: 0x14, b: 0x14 }

  // Renders a simulated browser viewport screenshot
  async function renderViewport({ frameFile, chapterNum, chapterSubtitle, chapterTitle, caption, progress, isLast, filename }) {
    const framePath = path.join(optDir, frameFile)
    const frameMeta = await sharp(framePath).metadata()

    // Contain-style scale: dw, dh
    const scale = Math.min((vw * 0.88) / frameMeta.width, (vh * 0.72) / frameMeta.height)
    const dw = Math.round(frameMeta.width * scale)
    const dh = Math.round(frameMeta.height * scale)
    const dx = Math.round((vw - dw) / 2)
    const dy = Math.round((vh - dh) / 2 - vh * 0.02)

    const resizedFrame = await sharp(framePath)
      .resize(dw, dh)
      .toBuffer()

    const progressBarW = Math.round(progress * 88)

    // SVG Overlay UI
    const overlaySvg = Buffer.from(`
      <svg width="${vw}" height="${vh}" xmlns="http://www.w3.org/2000/svg">
        <style>
          .wordmark { font-family: 'Outfit', sans-serif; font-size: 11px; font-weight: 500; letter-spacing: 0.22em; fill: #F4F0E8; }
          .slash { fill: #C5AE88; }
          .nav-num { font-family: monospace; font-size: 12px; fill: #736E65; }
          .nav-active { font-family: monospace; font-size: 12px; fill: #F4F0E8; font-weight: bold; }
          .subtitle { font-family: 'Outfit', sans-serif; font-size: 11px; font-weight: 500; letter-spacing: 0.24em; fill: #C5AE88; }
          .title { font-family: 'Outfit', sans-serif; font-size: 46px; font-weight: 300; letter-spacing: -0.02em; fill: #F4F0E8; }
          .caption { font-family: 'Outfit', sans-serif; font-size: 14px; fill: #B8B2A8; }
          .counter { font-family: monospace; font-size: 22px; font-weight: 300; fill: #F4F0E8; }
          .counter-total { font-family: monospace; font-size: 12px; fill: #736E65; }
          .legal { font-family: 'Outfit', sans-serif; font-size: 10px; fill: #6B6760; letter-spacing: 0.02em; }
          .scroll-cue { font-family: 'Outfit', sans-serif; font-size: 9px; letter-spacing: 0.28em; fill: #C5AE88; }
          .btn-text { font-family: 'Outfit', sans-serif; font-size: 11px; letter-spacing: 0.14em; fill: #F4F0E8; font-weight: 500; }
        </style>

        <!-- Top Header -->
        <text x="48" y="48" class="wordmark">VELAR <tspan class="slash">/</tspan> EXTERIOR STUDY</text>
        
        <!-- Nav -->
        <g transform="translate(${vw - 220}, 46)">
          <text x="0" y="0" class="${chapterNum === '01' ? 'nav-active' : 'nav-num'}">01</text>
          ${chapterNum === '01' ? '<rect x="0" y="4" width="18" height="1.5" fill="#C5AE88"/>' : ''}
          <text x="36" y="0" class="${chapterNum === '02' ? 'nav-active' : 'nav-num'}">02</text>
          ${chapterNum === '02' ? '<rect x="36" y="4" width="18" height="1.5" fill="#C5AE88"/>' : ''}
          <text x="72" y="0" class="${chapterNum === '03' ? 'nav-active' : 'nav-num'}">03</text>
          ${chapterNum === '03' ? '<rect x="72" y="4" width="18" height="1.5" fill="#C5AE88"/>' : ''}
          <text x="108" y="0" class="${chapterNum === '04' ? 'nav-active' : 'nav-num'}">04</text>
          ${chapterNum === '04' ? '<rect x="108" y="4" width="18" height="1.5" fill="#C5AE88"/>' : ''}
        </g>

        <!-- Chapter Title Area -->
        <text x="48" y="140" class="subtitle">${chapterNum} — ${chapterSubtitle}</text>
        <text x="48" y="195" class="title">${chapterTitle}</text>

        <!-- Bottom Left Caption -->
        <text x="48" y="${vh - 100}" class="caption">${caption}</text>
        ${isLast ? `
          <g transform="translate(48, ${vh - 80})">
            <rect width="145" height="32" rx="2" fill="#C5AE88" fill-opacity="0.14" stroke="#C5AE88" stroke-width="1"/>
            <text x="72" y="20" text-anchor="middle" class="btn-text">↑ BACK TO START</text>
          </g>
        ` : ''}

        <!-- Bottom Right Counter & Progress -->
        <text x="${vw - 48}" y="${vh - 105}" text-anchor="end" class="counter">${chapterNum}<tspan class="counter-total"> / 04</tspan></text>
        <rect x="${vw - 136}" y="${vh - 92}" width="88" height="1.5" rx="1" fill="#262422"/>
        <rect x="${vw - 136}" y="${vh - 92}" width="${progressBarW}" height="1.5" rx="1" fill="#C5AE88"/>

        <!-- Footer Divider & Legal -->
        <line x1="48" y1="${vh - 40}" x2="${vw - 48}" y2="${vh - 40}" stroke="#363430" stroke-width="0.8"/>
        <text x="48" y="${vh - 22}" class="legal">Independent design study. Not affiliated with Range Rover.</text>
        <text x="${vw - 48}" y="${vh - 22}" text-anchor="end" class="legal" font-family="monospace">EXTERIOR STUDY</text>

        <!-- Scroll Cue on Chapter 1 -->
        ${progress < 0.05 ? `
          <g transform="translate(${vw - 38}, ${vh / 2 - 25})">
            <text x="0" y="0" class="scroll-cue" transform="rotate(90)">SCROLL TO EXPLORE</text>
            <line x1="0" y1="120" x2="0" y2="155" stroke="#C5AE88" stroke-width="1"/>
          </g>
        ` : ''}
      </svg>
    `)

    await sharp({
      create: {
        width: vw,
        height: vh,
        channels: 3,
        background: bg
      }
    })
    .composite([
      { input: resizedFrame, left: dx, top: dy },
      { input: overlaySvg, left: 0, top: 0 }
    ])
    .png()
    .toFile(path.join(inspectDir, filename))

    console.log(`Saved screenshot: ${filename}`)
  }

  // 1. Chapter 01: Front perspective (seq_00)
  await renderViewport({
    frameFile: 'seq_00.webp',
    chapterNum: '01',
    chapterSubtitle: 'FRONT PERSPECTIVE',
    chapterTitle: 'Front perspective',
    caption: 'Explore its sculpted form, signature grille, and purposeful stance.',
    progress: 0.0,
    isLast: false,
    filename: 'screenshot_01_front.png'
  })

  // 2. Chapter 02: The silhouette (seq_07)
  await renderViewport({
    frameFile: 'seq_07.webp',
    chapterNum: '02',
    chapterSubtitle: 'THE SILHOUETTE',
    chapterTitle: 'The silhouette',
    caption: 'A taut, unbroken roofline flows into flush waistline glazing and an aerodynamic taper.',
    progress: 7 / 22,
    isLast: false,
    filename: 'screenshot_02_side.png'
  })

  // 3. Chapter 03: Rear perspective (seq_12)
  await renderViewport({
    frameFile: 'seq_12.webp',
    chapterNum: '03',
    chapterSubtitle: 'REAR PERSPECTIVE',
    chapterTitle: 'Rear perspective',
    caption: 'Broad athletic rear haunches resolve into a clean, reductionist tailgate graphic.',
    progress: 12 / 22,
    isLast: false,
    filename: 'screenshot_03_rear.png'
  })

  // 4. Chapter 04: Complete view (seq_22)
  await renderViewport({
    frameFile: 'seq_22.webp',
    chapterNum: '04',
    chapterSubtitle: 'COMPLETE VIEW',
    chapterTitle: 'Complete view',
    caption: 'The continuous reductionist profile completes a balanced 360-degree exterior study.',
    progress: 1.0,
    isLast: true,
    filename: 'screenshot_04_complete.png'
  })

  // 5. Mobile Viewport: 390 x 844 (iPhone 14 / modern narrow viewport)
  const mw = 390
  const mh = 844
  const mFramePath = path.join(optDir, 'seq_03.webp') // Front 3/4
  const mMeta = await sharp(mFramePath).metadata()

  const mScale = Math.min((mw * 0.92) / mMeta.width, (mh * 0.50) / mMeta.height)
  const mdw = Math.round(mMeta.width * mScale)
  const mdh = Math.round(mMeta.height * mScale)
  const mdx = Math.round((mw - mdw) / 2)
  const mdy = Math.round((mh - mdh) / 2 - 20)

  const mResized = await sharp(mFramePath).resize(mdw, mdh).toBuffer()

  const mobileSvg = Buffer.from(`
    <svg width="${mw}" height="${mh}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .m-wordmark { font-family: 'Outfit', sans-serif; font-size: 10px; font-weight: 500; letter-spacing: 0.2em; fill: #F4F0E8; }
        .m-slash { fill: #C5AE88; }
        .m-nav { font-family: monospace; font-size: 11px; fill: #736E65; }
        .m-nav-act { font-family: monospace; font-size: 11px; fill: #F4F0E8; font-weight: bold; }
        .m-sub { font-family: 'Outfit', sans-serif; font-size: 9px; font-weight: 500; letter-spacing: 0.2em; fill: #C5AE88; }
        .m-title { font-family: 'Outfit', sans-serif; font-size: 28px; font-weight: 300; letter-spacing: -0.02em; fill: #F4F0E8; }
        .m-cap { font-family: 'Outfit', sans-serif; font-size: 12px; fill: #B8B2A8; line-height: 1.5; }
        .m-counter { font-family: monospace; font-size: 18px; font-weight: 300; fill: #F4F0E8; }
        .m-legal { font-family: 'Outfit', sans-serif; font-size: 8.5px; fill: #6B6760; }
      </style>

      <!-- Header -->
      <text x="24" y="44" class="m-wordmark">VELAR <tspan class="m-slash">/</tspan> STUDY</text>
      <text x="${mw - 100}" y="44" class="m-nav-act">01</text>
      <text x="${mw - 75}" y="44" class="m-nav">02</text>
      <text x="${mw - 50}" y="44" class="m-nav">03</text>
      <text x="${mw - 25}" y="44" class="m-nav">04</text>

      <!-- Title Area -->
      <text x="24" y="110" class="m-sub">01 — FRONT PERSPECTIVE</text>
      <text x="24" y="148" class="m-title">Front perspective</text>

      <!-- Bottom Caption -->
      <text x="24" y="${mh - 110}" class="m-cap">Explore its sculpted form, signature</text>
      <text x="24" y="${mh - 92}" class="m-cap">grille, and purposeful stance.</text>

      <!-- Counter -->
      <text x="${mw - 24}" y="${mh - 100}" text-anchor="end" class="m-counter">01<tspan font-size="10" fill="#736E65"> / 04</tspan></text>
      <rect x="${mw - 84}" y="${mh - 90}" width="60" height="1.5" fill="#262422"/>
      <rect x="${mw - 84}" y="${mh - 90}" width="15" height="1.5" fill="#C5AE88"/>

      <!-- Legal -->
      <line x1="24" y1="${mh - 50}" x2="${mw - 24}" y2="${mh - 50}" stroke="#363430" stroke-width="0.8"/>
      <text x="24" y="${mh - 30}" class="m-legal">Independent design study. Not affiliated with Range Rover.</text>
    </svg>
  `)

  await sharp({
    create: {
      width: mw,
      height: mh,
      channels: 3,
      background: bg
    }
  })
  .composite([
    { input: mResized, left: mdx, top: mdy },
    { input: mobileSvg, left: 0, top: 0 }
  ])
  .png()
  .toFile(path.join(inspectDir, 'screenshot_05_mobile.png'))

  console.log('Saved mobile screenshot: screenshot_05_mobile.png')
}

generateScreenshots().catch(console.error)
