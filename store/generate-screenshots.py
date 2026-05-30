#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFont
import os

BG = (13, 13, 13)
ACCENT = (59, 130, 246)
WHITE = (255, 255, 255)
GRAY = (156, 163, 175)

APP_STORE = (1290, 2796)
PLAY_STORE = (1080, 1920)

TABS = [
    ("01-home", "Home", "Track your baby's daily activities at a glance"),
    ("02-tracking", "Tracking", "Log feeding, diaper changes, sleep& more"),
    ("03-schedule", "Schedule", "Manage routines and set reminders"),
    ("04-products", "Products", "Discover baby products and reviews"),
    ("05-growth", "Growth", "Monitor growth charts and milestones"),
    ("06-allergens", "Allergens", "Track allergies and sensitivities"),
    ("07-profile", "Profile", "Manage baby profile and settings"),
]


def make_screenshot(size, name, desc, out):
    w, h = size
    img = Image.new("RGB", size, BG)
    draw = ImageDraw.Draw(img)

    try:
        title_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 80)
        desc_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 40)
        app_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 36)
    except Exception:
        title_font = ImageFont.load_default()
        desc_font = ImageFont.load_default()
        app_font = ImageFont.load_default()

    draw.rectangle([(0, 0), (w, 8)], fill=ACCENT)

    tb = draw.textbbox((0, 0), name, font=title_font)
    tw = tb[2] - tb[0]
    draw.text(((w - tw) // 2, h // 2 - 150), name, font=title_font, fill=WHITE)

    db = draw.textbbox((0, 0), desc, font=desc_font)
    dw = db[2] - db[0]
    draw.text(((w - dw) // 2, h // 2 - 30), desc, font=desc_font, fill=GRAY)

    lw = 200
    lx = (w - lw) // 2
    draw.rectangle([(lx, h // 2 + 50), (lx + lw, h // 2 + 56)], fill=ACCENT)

    ab = draw.textbbox((0, 0), "Jobble Baby", font=app_font)
    aw = ab[2] - ab[0]
    draw.text(((w - aw) // 2, h - 150), "Jobble Baby", font=app_font, fill=GRAY)

    img.save(out, "PNG")
    print(f"Created: {out}")


def main():
    base = os.path.dirname(os.path.abspath(__file__))

    app_dir = os.path.join(base, "app-store-screenshots")
    os.makedirs(app_dir, exist_ok=True)
    print("Generating App Store screenshots (1290x2796)...")
    for fname, name, desc in TABS:
        make_screenshot(APP_STORE, name, desc, os.path.join(app_dir, f"{fname}.png"))

    play_dir = os.path.join(base, "play-store-screenshots")
    os.makedirs(play_dir, exist_ok=True)
    print("\nGenerating Play Store screenshots (1080x1920)...")
    for fname, name, desc in TABS:
        make_screenshot(PLAY_STORE, name, desc, os.path.join(play_dir, f"{fname}.png"))

    print("\nDone! All screenshots generated.")


if __name__ == "__main__":
    main()
