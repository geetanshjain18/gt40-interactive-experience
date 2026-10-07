const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

async function generateSageScreenshots() {
  const outDir = path.resolve(__dirname, '../public/reference/verification')
  const optDir = path.resolve(__dirname, '../public/sequence/optimized')
  fs.mkdirSync(outDir, { recursive: true })

  const bgRgb = { r: 0xDC, g: 0xE2, b: 0xDA } // #DCE2DA

  // Helper to render high-fidelity viewport simulation
  async function renderViewport({
    vw,
    vh,
    frameFile,
    chapterNum,
    chapterSubtitle,
    chapterTitle,
    caption,
    progress,
    isLast,
    hoveredPart,
    isMobile = false,
    filename,
  }) {
    const framePath = path.join(optDir, frameFile)
    const frameMeta = await sharp(framePath).metadata()

    // Framing: lowered car (~46-47% visual center down)
    const maxW = isMobile ? vw * 0.94 : vw * 0.82
    const maxH = isMobile ? vh * 0.48 : vh * 0.65
    const scale = Math.min(maxW / frameMeta.width, maxH / frameMeta.height)
    const dw = Math.round(frameMeta.width * scale)
    const dh = Math.round(frameMeta.height * scale)
    const dx = Math.round((vw - dw) / 2)
    // dy shifts car lower on screen (down ~8-10% VH)
    const dy = Math.round((vh - dh) / 2 + (isMobile ? vh * 0.04 : vh * 0.05))

    const resizedFrame = await sharp(framePath)
      .resize(dw, dh)
      .toBuffer()

    const progressBarW = Math.round(progress * 88)

    const overlaySvg = Buffer.from(`
      <svg width="${vw}" height="${vh}" xmlns="http://www.w3.org/2000/svg">
        <style>
          .wordmark { font-family: 'Outfit', sans-serif; font-size: ${isMobile ? '11px' : '12px'}; font-weight: 600; letter-spacing: 0.22em; fill: #202923; }
          .slash { fill: #506B58; }
          .nav-btn { font-family: monospace; font-size: ${isMobile ? '12px' : '13px'}; fill: #59655C; }
          .nav-active { font-family: monospace; font-size: ${isMobile ? '12px' : '13px'}; fill: #202923; font-weight: 600; }
          .subtitle { font-family: 'Outfit', sans-serif; font-size: ${isMobile ? '10px' : '11px'}; font-weight: 600; letter-spacing: 0.24em; fill: #506B58; }
          .title { font-family: 'Outfit', sans-serif; font-size: ${isMobile ? '30px' : (vw >= 1920 ? '54px' : '44px')}; font-weight: 400; letter-spacing: -0.02em; fill: #202923; }
          .caption { font-family: 'Outfit', sans-serif; font-size: ${isMobile ? '13px' : '14.5px'}; fill: #59655C; line-height: 1.6; }
          .counter { font-family: monospace; font-size: ${isMobile ? '18px' : '22px'}; font-weight: 500; fill: #202923; }
          .counter-total { font-family: monospace; font-size: 12px; fill: #59655C; }
          .legal { font-family: 'Outfit', sans-serif; font-size: 10px; fill: #59655C; letter-spacing: 0.02em; }
          .parts-btn { font-family: 'Outfit', sans-serif; font-size: 11px; font-weight: 500; letter-spacing: 0.08em; fill: #202923; }
          .tooltip-text { font-family: 'Outfit', sans-serif; font-size: 11.5px; font-weight: 500; letter-spacing: 0.04em; fill: #FFFFFF; }
        </style>

        <!-- Header -->
        <text x="${isMobile ? 20 : 40}" y="${isMobile ? 38 : 44}" class="wordmark">VELAR <tspan class="slash">/</tspan> EXTERIOR STUDY</text>
        
        <!-- Parts explorer toggle pill -->
        ${!isMobile ? `
          <g transform="translate(245, 28)">
            <rect width="112" height="24" rx="4" fill="#CBD3C8" stroke="rgba(32,41,35,0.15)" stroke-width="1"/>
            <text x="10" y="16" class="parts-btn">EXPLORE PARTS <tspan font-size="8">▼</tspan></text>
          </g>
        ` : ''}

        <!-- Nav -->
        <g transform="translate(${vw - (isMobile ? 120 : 200)}, ${isMobile ? 38 : 44})">
          <text x="0" y="0" class="${chapterNum === '01' ? 'nav-active' : 'nav-btn'}">01</text>
          ${chapterNum === '01' ? '<rect x="0" y="4" width="18" height="2" fill="#506B58"/>' : ''}
          <text x="32" y="0" class="${chapterNum === '02' ? 'nav-active' : 'nav-btn'}">02</text>
          ${chapterNum === '02' ? '<rect x="32" y="4" width="18" height="2" fill="#506B58"/>' : ''}
          <text x="64" y="0" class="${chapterNum === '03' ? 'nav-active' : 'nav-btn'}">03</text>
          ${chapterNum === '03' ? '<rect x="64" y="4" width="18" height="2" fill="#506B58"/>' : ''}
          <text x="96" y="0" class="${chapterNum === '04' ? 'nav-active' : 'nav-btn'}">04</text>
          ${chapterNum === '04' ? '<rect x="96" y="4" width="18" height="2" fill="#506B58"/>' : ''}
        </g>

        <!-- Chapter Title Area -->
        <text x="${isMobile ? 20 : 40}" y="${isMobile ? 95 : 125}" class="subtitle">${chapterNum} — ${chapterSubtitle}</text>
        <text x="${isMobile ? 20 : 40}" y="${isMobile ? 135 : 180}" class="title">${chapterTitle}</text>

        <!-- Hover Tooltip Demo if present -->
        ${hoveredPart ? `
          <g transform="translate(${hoveredPart.x}, ${hoveredPart.y})">
            <rect width="128" height="26" rx="4" fill="rgba(32,41,35,0.92)"/>
            <circle cx="12" cy="13" r="2.5" fill="#CBD3C8"/>
            <text x="22" y="17" class="tooltip-text">${hoveredPart.name.replace(/&/g, '&amp;')}</text>
          </g>
        ` : ''}

        <!-- Bottom Left Caption -->
        <text x="${isMobile ? 20 : 40}" y="${vh - (isMobile ? 115 : 95)}" class="caption">${caption}</text>
        ${isLast ? `
          <g transform="translate(${isMobile ? 20 : 40}, ${vh - (isMobile ? 95 : 75)})">
            <rect width="145" height="32" rx="4" fill="#CBD3C8" stroke="#506B58" stroke-width="1"/>
            <text x="72" y="20" text-anchor="middle" font-family="Outfit, sans-serif" font-size="11px" font-weight="600" letter-spacing="0.14em" fill="#202923">↑ BACK TO START</text>
          </g>
        ` : ''}

        <!-- Bottom Right Counter & Progress -->
        <text x="${vw - (isMobile ? 20 : 40)}" y="${vh - (isMobile ? 105 : 95)}" text-anchor="end" class="counter">${chapterNum}<tspan class="counter-total"> / 04</tspan></text>
        <rect x="${vw - (isMobile ? 108 : 128)}" y="${vh - (isMobile ? 90 : 82)}" width="88" height="2" rx="1" fill="rgba(32,41,35,0.15)"/>
        <rect x="${vw - (isMobile ? 108 : 128)}" y="${vh - (isMobile ? 90 : 82)}" width="${progressBarW}" height="2" rx="1" fill="#506B58"/>

        <!-- Footer Divider & Legal -->
        <line x1="${isMobile ? 20 : 40}" y1="${vh - 38}" x2="${vw - (isMobile ? 20 : 40)}" y2="${vh - 38}" stroke="rgba(32,41,35,0.15)" stroke-width="0.8"/>
        <text x="${isMobile ? 20 : 40}" y="${vh - 20}" class="legal">Independent design study. Not affiliated with Range Rover.</text>
        <text x="${vw - (isMobile ? 20 : 40)}" y="${vh - 20}" text-anchor="end" class="legal" font-family="monospace">EXTERIOR STUDY</text>
      </svg>
    `)

    await sharp({
      create: {
        width: vw,
        height: vh,
        channels: 3,
        background: bgRgb,
      },
    })
      .composite([
        { input: resizedFrame, left: dx, top: dy },
        { input: overlaySvg, left: 0, top: 0 },
      ])
      .png()
      .toFile(path.join(outDir, filename))

    console.log(`Generated verification screenshot: ${filename} (${vw}x${vh})`)
  }

  // 1. 1920x1080 Desktop - Chapter 01 (Front Three-Quarter with "Wheel & tyre" tooltip)
  await renderViewport({
    vw: 1920,
    vh: 1080,
    frameFile: 'seq_00.webp',
    chapterNum: '01',
    chapterSubtitle: 'FIRST IMPRESSION',
    chapterTitle: 'Range Rover Velar',
    caption: 'Explore its sculpted form and balanced proportions from every perspective.',
    progress: 0.0,
    isLast: false,
    hoveredPart: { x: 740, y: 640, name: 'Wheel & tyre' },
    filename: 'verification_1920x1080_ch01.png',
  })

  // 2. 1920x1080 Desktop - Chapter 02 (The Silhouette side profile)
  await renderViewport({
    vw: 1920,
    vh: 1080,
    frameFile: 'seq_07.webp',
    chapterNum: '02',
    chapterSubtitle: 'THE SILHOUETTE',
    chapterTitle: 'The silhouette',
    caption: 'A taut, continuous roofline flows into flush waistline glazing and an aerodynamic rear taper.',
    progress: 0.33,
    isLast: false,
    hoveredPart: { x: 880, y: 440, name: 'Contrast roof' },
    filename: 'verification_1920x1080_ch02.png',
  })

  // 3. 1366x768 Standard Desktop - Chapter 03 (Rear Perspective)
  await renderViewport({
    vw: 1366,
    vh: 768,
    frameFile: 'seq_12.webp',
    chapterNum: '03',
    chapterSubtitle: 'REAR PERSPECTIVE',
    chapterTitle: 'A different perspective',
    caption: 'Broad athletic rear haunches resolve into a clean, reductionist tailgate graphic.',
    progress: 0.67,
    isLast: false,
    hoveredPart: { x: 620, y: 430, name: 'Silver body' },
    filename: 'verification_1366x768_ch03.png',
  })

  // 4. 1366x768 Standard Desktop - Chapter 04 (Details in focus with "Front grille" tooltip)
  await renderViewport({
    vw: 1366,
    vh: 768,
    frameFile: 'seq_22.webp',
    chapterNum: '04',
    chapterSubtitle: 'EXTERIOR DETAILS',
    chapterTitle: 'Details in focus',
    caption: 'Slender horizontal LED headlamp clusters flank a signature flush-mesh front aperture.',
    progress: 1.0,
    isLast: true,
    hoveredPart: { x: 710, y: 450, name: 'Front grille' },
    filename: 'verification_1366x768_ch04.png',
  })

  // 5. 390x844 Mobile (iPhone 14)
  await renderViewport({
    vw: 390,
    vh: 844,
    frameFile: 'seq_03.webp',
    chapterNum: '01',
    chapterSubtitle: 'FIRST IMPRESSION',
    chapterTitle: 'Range Rover Velar',
    caption: 'Explore its sculpted form and balanced proportions from every perspective.',
    progress: 0.0,
    isLast: false,
    isMobile: true,
    filename: 'verification_390x844_mobile.png',
  })

  console.log('All verification screenshots generated successfully!')
}

generateSageScreenshots().catch(console.error)
