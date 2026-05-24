"""Extract the ValoTrak V mark from the app icon onto a transparent background.

The icon is the red (with a light bevel) V over a dark, low-saturation tactical
tile. We keep pixels that are clearly reddish OR bright (the mark) and drop the
dark/neutral background, then trim to the mark's bounding box.
"""

from PIL import Image

SRC = "icon.png"
OUT = "src/assets/logo-mark.png"
SIZE = 320  # plenty for a ~20px header logo, even at 3x DPI


def clamp01(x: float) -> float:
    return 0.0 if x < 0 else 1.0 if x > 1 else x


def main() -> None:
    img = Image.open(SRC).convert("RGBA").resize((SIZE, SIZE), Image.LANCZOS)
    px = img.load()
    for y in range(SIZE):
        for x in range(SIZE):
            r, g, b, _ = px[x, y]
            redness = r - max(g, b)
            brightness = max(r, g, b)
            red_score = clamp01((redness - 8) / 50)
            bright_score = clamp01((brightness - 140) / 80)
            alpha = round(max(red_score, bright_score) * 255)
            px[x, y] = (r, g, b, alpha)

    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    img.save(OUT)
    print(f"saved {OUT} {img.size[0]}x{img.size[1]}")


if __name__ == "__main__":
    main()
