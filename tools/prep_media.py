"""RIMEN_WEB 미디어 준비 — 원본은 건드리지 않고 media/ 에 웹용 사본을 만든다.

사진: EXIF 회전 반영 → 긴 변 1800px → webp(q82)
영상: H.264 + faststart, 소리 제거 (HEVC·mp4v 는 크롬에서 안 나오는 경우가 있다)

python tools/prep_media.py
"""
import subprocess
from pathlib import Path
from PIL import Image, ImageOps
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parents[1]
CAP = ROOT.parent
OUT = ROOT / "media"
OUT.mkdir(exist_ok=True)
FF = imageio_ffmpeg.get_ffmpeg_exe()

IMAGES = {
    "studio_grid_a":   CAP / "4주차/KakaoTalk_20260921_014830995.jpg",
    "studio_grid_b":   CAP / "4주차/KakaoTalk_20260921_014830995_01.jpg",
    "studio_sensor":   CAP / "4주차/KakaoTalk_20260921_014830995_02.png",
    "studio_grid_c":   CAP / "4주차/KakaoTalk_20260921_014830995_03.jpg",
    "studio_tablet":   CAP / "4주차/KakaoTalk_20260921_014830995_04.jpg",
    "studio_desk":     CAP / "4주차/KakaoTalk_20260921_014830995_06.jpg",
    "floor_flowers":   CAP / "4주차/인터렉션테스트.jpg",
    "lespace_a":       CAP / "르스페이스/KakaoTalk_20260828_232541475.jpg",
    "lespace_b":       CAP / "르스페이스/KakaoTalk_20260828_232541475_02.jpg",
    "lespace_c":       CAP / "르스페이스/KakaoTalk_20260828_232541475_01 (1).jpg",
    "flower":          CAP / "Blender/render/flower.png",
    "flower3":         CAP / "Blender/render/flower3.png",
    "night_bloom":     CAP / "Blender/preview/night_bloom_open.png",
    "crystal_bloom":   CAP / "Blender/preview/crystal_bloom_open.png",
    "bloom_v1":        CAP / "Blender/render/v1/0120.png",
    "limen_bg":        CAP / "lucid-vivarium-hero/assets/bg/bg.png",
}

VIDEOS = {
    # 이름: (원본, 추가 ffmpeg 필터, 잘라낼 구간)
    "reel":         (Path.home() / "Downloads/_talkv_dJMcbmdHzUc_DxTGvjmkjeqMSkvA1pCXD0_talkv_high.mp4", "scale=1600:-2", None),
    "bloom_v1":     (CAP / "Blender/render/v1_60fps.mp4", "scale=720:-2", None),
    "night_bloom":  (CAP / "Blender/preview/night_bloom_0001-0120.mp4", None, None),
    "crystal_bloom":(CAP / "Blender/preview/crystal_bloom_0001-0120.mp4", None, None),
    "ai_diffusion": (CAP / "녹화/lucid_ai_demo.mp4", "fps=30", ("4", "16")),
}


def images():
    for name, src in IMAGES.items():
        dst = OUT / f"{name}.webp"
        if dst.exists():
            continue
        im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
        im.thumbnail((1800, 1800), Image.LANCZOS)
        im.save(dst, "WEBP", quality=82, method=6)
        print("img", name, im.size, dst.stat().st_size // 1024, "KB")


def videos():
    for name, (src, vf, cut) in VIDEOS.items():
        dst = OUT / f"{name}.mp4"
        if dst.exists():
            continue
        cmd = [FF, "-y", "-v", "error"]
        if cut:
            cmd += ["-ss", cut[0], "-t", cut[1]]
        cmd += ["-i", str(src), "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "25",
                "-pix_fmt", "yuv420p", "-movflags", "+faststart"]
        if vf:
            cmd += ["-vf", vf]
        subprocess.run(cmd + [str(dst)], check=True)
        # 포스터 한 장 (영상이 뜨기 전·WebGL 없을 때)
        subprocess.run([FF, "-y", "-v", "error", "-ss", "0.5", "-i", str(dst), "-frames:v", "1",
                        "-q:v", "3", str(OUT / f"{name}_poster.jpg")], check=True)
        print("vid", name, dst.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    images()
    videos()
