const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

// Candidate sequence 1: full 36 frames
// Let's create an HTML flipbook to preview any selection in the browser or check frame by frame!
function createPreviewHtml() {
  const inspectDir = path.resolve(__dirname, '../public/sequence/inspection')

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Velar Frame Inspection</title>
  <style>
    body { background: #141414; color: #F4F0E8; font-family: monospace; padding: 20px; text-align: center; }
    .viewer { max-width: 600px; margin: 0 auto; }
    img { width: 100%; border: 1px solid #333; border-radius: 4px; }
    .controls { margin: 20px 0; display: flex; justify-content: center; gap: 10px; align-items: center; }
    button { background: #222; color: #C5AE88; border: 1px solid #C5AE88; padding: 8px 16px; cursor: pointer; }
    input[type=range] { width: 300px; }
    .grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin-top: 40px; }
    .cell { background: #1c1c1c; padding: 4px; border: 1px solid #2a2a2a; border-radius: 4px; }
    .cell.selected { border-color: #C5AE88; background: #26221c; }
    .cell img { width: 100%; }
    .cell label { font-size: 11px; display: block; margin-top: 4px; }
  </style>
</head>
<body>
  <h1>Velar Image Sequence Inspector</h1>
  <div class="viewer">
    <img id="mainView" src="/sequence/raw/frame_00.png" />
    <div class="controls">
      <button id="prevBtn">&larr;</button>
      <input type="range" id="frameSlider" min="0" max="35" value="0" />
      <button id="nextBtn">&rarr;</button>
      <span id="frameLabel">Frame: 00</span>
      <button id="playBtn">Play</button>
    </div>
  </div>

  <h2>All 36 Raw Cells</h2>
  <div class="grid" id="grid">
    ${Array.from({ length: 36 }, (_, i) => {
      const pad = String(i).padStart(2, '0')
      return `<div class="cell" id="c_${pad}">
        <img src="/sequence/raw/frame_${pad}.png" onclick="setFrame(${i})" />
        <label>#${pad}</label>
      </div>`
    }).join('')}
  </div>

  <script>
    let cur = 0;
    let playing = false;
    let timer = null;
    const img = document.getElementById('mainView');
    const slider = document.getElementById('frameSlider');
    const label = document.getElementById('frameLabel');

    function setFrame(idx) {
      cur = idx;
      slider.value = idx;
      const pad = String(idx).padStart(2, '0');
      img.src = '/sequence/raw/frame_' + pad + '.png';
      label.innerText = 'Frame: ' + pad;
    }

    slider.oninput = (e) => setFrame(parseInt(e.target.value));
    document.getElementById('prevBtn').onclick = () => setFrame((cur - 1 + 36) % 36);
    document.getElementById('nextBtn').onclick = () => setFrame((cur + 1) % 36);

    document.getElementById('playBtn').onclick = () => {
      playing = !playing;
      document.getElementById('playBtn').innerText = playing ? 'Pause' : 'Play';
      if (playing) {
        timer = setInterval(() => setFrame((cur + 1) % 36), 120);
      } else {
        clearInterval(timer);
      }
    };
  </script>
</body>
</html>`

  fs.writeFileSync(path.join(inspectDir, 'index.html'), html)
  console.log('Inspection HTML written to', path.join(inspectDir, 'index.html'))
}

createPreviewHtml()
