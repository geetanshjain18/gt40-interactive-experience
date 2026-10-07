import json
import subprocess
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, r"C:\Users\geeta\AppData\Local\Temp\gt40-audio-tools")
import imageio_ffmpeg

root = Path(__file__).resolve().parents[1]
audio = root / "public" / "audio"
artifacts = root / "artifacts" / "gt40-audio"
artifacts.mkdir(parents=True, exist_ok=True)
ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
source = audio / "gt40-engine-start.mp3"
decoded = subprocess.run(
    [ffmpeg, "-hide_banner", "-loglevel", "error", "-i", str(source), "-f", "f32le", "-acodec", "pcm_f32le", "-ar", "44100", "-ac", "2", "pipe:1"],
    check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
).stdout
pcm = np.frombuffer(decoded, dtype="<f4").reshape(-1, 2)
sample_rate = 44100
start = round(2.0 * sample_rate)
end = round(8.4 * sample_rate)
segment = pcm[start:end].copy()
fade = round(.5 * sample_rate)
theta = np.linspace(0, np.pi / 2, fade, endpoint=True, dtype=np.float32)[:, None]
crossfade = segment[-fade:] * np.cos(theta) + segment[:fade] * np.sin(theta)
# Put the circular crossfade at the file end. Both sides of the playback seam
# then meet at the same source sample (the end of the head segment).
loop = np.concatenate((segment[fade:-fade], crossfade), axis=0)
target_rms = 10 ** (-23 / 20)
gain = target_rms / float(np.sqrt(np.mean(loop ** 2)))
loop = np.clip(loop * gain, -0.99, 0.99).astype("<f4")

# Preserve a full-fidelity working master and encode only the delivery MP3.
wav = artifacts / "gt40-engine-idle-loop-master.wav"
subprocess.run(
    [ffmpeg, "-hide_banner", "-loglevel", "error", "-f", "f32le", "-ar", str(sample_rate), "-ac", "2", "-i", "pipe:0", "-c:a", "pcm_f32le", "-y", str(wav)],
    input=loop.tobytes(), check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
)
mp3 = audio / "gt40-engine-idle-loop.mp3"
subprocess.run(
    [ffmpeg, "-hide_banner", "-loglevel", "error", "-f", "f32le", "-ar", str(sample_rate), "-ac", "2", "-i", "pipe:0", "-c:a", "libmp3lame", "-b:a", "192k", "-write_xing", "1", "-y", str(mp3)],
    input=loop.tobytes(), check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
)
report = {
    "source": source.name,
    "source_duration_seconds": len(pcm) / sample_rate,
    "idle_segment_seconds": [start / sample_rate, end / sample_rate],
    "loop_crossfade_seconds": fade / sample_rate,
    "loop_duration_seconds": len(loop) / sample_rate,
    "normalization_target_dbfs_rms": -23,
    "applied_gain_db": round(20 * np.log10(gain), 3),
    "output_peak": float(np.max(np.abs(loop))),
    "output_rms": float(np.sqrt(np.mean(loop ** 2))),
    "source_files_preserved": True,
    "lossless_working_master": str(wav.relative_to(root)),
    "delivery_mp3": str(mp3.relative_to(root)),
}
(artifacts / "idle-loop-build.json").write_text(json.dumps(report, indent=2))
print(json.dumps(report, indent=2))
