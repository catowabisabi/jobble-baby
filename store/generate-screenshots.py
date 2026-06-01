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
    ("02-tracking", "Tracking", "Log feeding, diaper changes, sleep & more"),
    ("03-schedule", "Schedule", "Manage routines and set smart reminders"),
    ("04-products", "Products", "Discover baby products and honest reviews"),
    ("05-growth", "Growth", "Monitor growth charts and milestones"),
    ("06-milestones", "Milestones", "Neurodevelopmental brain builder alerts"),
    ("07-allergens", "Allergens", "Track allergies and sensitivities"),
    ("08-sleep-training", "Sleep Training", "Build healthy sleep habits early"),
    ("09-circadian", "Circadian", "Align baby rhythm with natural light cues"),
    ("10-milk-prep", "Milk Prep", "Streamlined formula and breast prep"),
    ("11-monitor-correlation", "Monitor", "Correlate stats with parent fatigue"),
    ("12-shift-handoff", "Shift Handoff", "Seamless caregiver shift transitions"),
    ("13-stress-cascade", "Stress Cascade", "Track stress patterns across caregivers"),
    ("14-teething", "Teething", "Monitor teething pain and remedies"),
    ("15-doctor-visit", "Doctor Visit", "Prep questions and track medical visits"),
    ("16-profile", "Profile", "Manage baby profile and settings"),
    ("17-hero", "Jobble Baby", "Your all-in-one parenting companion"),
]

APP_NAME = "Jobble Baby"


def make_screenshot(size, name, desc, out):
    w, h = size
    img = Image.new("RGB", size, BG)
    draw = ImageDraw.Draw(img)

    try:
        title_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 80)
        desc_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 40)
        app_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 36)
        label_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 28)
    except Exception:
        title_font = ImageFont.load_default()
        desc_font = ImageFont.load_default()
        app_font = ImageFont.load_default()
        label_font = ImageFont.load_default()

    # Top accent bar
    draw.rectangle([(0, 0), (w, 8)], fill=ACCENT)

    # Title text centered
    tb = draw.textbbox((0, 0), name, font=title_font)
    tw = tb[2] - tb[0]
    draw.text(((w - tw) // 2, h // 2 - 180), name, font=title_font, fill=WHITE)

    # Description text centered
    db = draw.textbbox((0, 0), desc, font=desc_font)
    dw = db[2] - db[0]
    # Truncate if too long
    if dw > w - 100:
        desc = desc[:40] + "..."
        db = draw.textbbox((0, 0), desc, font=desc_font)
        dw = db[2] - db[0]
    draw.text(((w - dw) // 2, h // 2 - 50), desc, font=desc_font, fill=GRAY)

    # Center accent line
    lw = 200
    lx = (w - lw) // 2
    draw.rectangle([(lx, h // 2 + 30), (lx + lw, h // 2 + 36)], fill=ACCENT)

    # App label at bottom
    ab = draw.textbbox((0, 0), APP_NAME, font=app_font)
    aw = ab[2] - ab[0]
    draw.text(((w - aw) // 2, h - 150), APP_NAME, font=app_font, fill=GRAY)

    img.save(out, "PNG")
    size_kb = os.path.getsize(out) // 1024
    print(f"Created: {out} ({size_kb}KB)")


def main():
    base = os.path.dirname(os.path.abspath(__file__))
    print(f"Base: {base}")

    app_dir = os.path.join(base, "app-store-screenshots")
    os.makedirs(app_dir, exist_ok=True)
    print(f"\nGenerating App Store screenshots ({APP_STORE[0]}x{APP_STORE[1]})...")
    for fname, name, desc in TABS:
        out = os.path.join(app_dir, f"{fname}.png")
        make_screenshot(APP_STORE, name, desc, out)

    play_dir = os.path.join(base, "play-store-screenshots")
    os.makedirs(play_dir, exist_ok=True)
    print(f"\nGenerating Play Store screenshots ({PLAY_STORE[0]}x{PLAY_STORE[1]})...")
    for fname, name, desc in TABS:
        out = os.path.join(play_dir, f"{fname}.png")
        make_screenshot(PLAY_STORE, name, desc, out)

    print(f"\nDone! All {len(TABS)*2} screenshots generated.")


if __name__ == "__main__":
    main()