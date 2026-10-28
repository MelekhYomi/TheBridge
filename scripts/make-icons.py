"""Rasterise the TheBridge mark into PNG icons and favicon.ico.

Pure standard library (no Pillow): shapes are tested per pixel with 4x4
supersampling, then written as PNG. Run from the project root:

    python scripts/make-icons.py
"""
import math
import os
import struct
import zlib

YELLOW = (0xFF, 0xD6, 0x0A)
BLUE = (0x1D, 0x4E, 0xD8)
RED = (0xD6, 0x28, 0x28)
BLACK = (0x11, 0x11, 0x11)
WHITE = (0xFF, 0xFF, 0xFF)

# Mark geometry in the 64x64 space of public/brand/mark.svg.
# The mark's shapes occupy x 3..61, y 6..58 of that space (58 x 52).
def mark_color(x, y, deck):
    if 38 <= y < 45 and 3 <= x < 61:
        return deck
    if 30 <= y < 58 and 8 <= x < 19:
        return BLUE
    if 30 <= y < 58 and 45 <= x < 56:
        return RED
    if y < 30:
        d = math.hypot(x - 32, y - 30)
        if 13 <= d <= 24:
            return YELLOW
    return None


# Where the mark sits inside a 64x64 canvas: 42 wide, centred (matches favicon.svg).
MARK_SCALE = 42 / 58
MARK_X = (64 - 58 * MARK_SCALE) / 2 - 3 * MARK_SCALE
MARK_Y = (64 - 52 * MARK_SCALE) / 2 - 6 * MARK_SCALE


def placed_mark(x, y, deck):
    return mark_color((x - MARK_X) / MARK_SCALE, (y - MARK_Y) / MARK_SCALE, deck)


def in_rounded_square(x, y, r=14):
    cx = min(max(x, r), 64 - r)
    cy = min(max(y, r), 64 - r)
    return math.hypot(x - cx, y - cy) <= r


def app_icon_color(x, y):
    """Mark on a rounded black tile, same layout as public/favicon.svg."""
    if not in_rounded_square(x, y):
        return None
    return placed_mark(x, y, WHITE) or BLACK


def render(size, color_at, ss=4):
    rows = []
    for py in range(size):
        row = bytearray([0])  # PNG filter: none
        for px in range(size):
            acc = [0, 0, 0, 0]
            for sy in range(ss):
                for sx in range(ss):
                    x = (px + (sx + 0.5) / ss) * 64 / size
                    y = (py + (sy + 0.5) / ss) * 64 / size
                    c = color_at(x, y)
                    if c:
                        acc[0] += c[0]
                        acc[1] += c[1]
                        acc[2] += c[2]
                        acc[3] += 1
            n = acc[3]
            if n:
                row += bytes([acc[0] // n, acc[1] // n, acc[2] // n, 255 * n // (ss * ss)])
            else:
                row += bytes(4)
        rows.append(bytes(row))
    return png(size, size, b"".join(rows))


def png(w, h, raw):
    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )


def ico(images):
    header = struct.pack("<HHH", 0, 1, len(images))
    offset = 6 + 16 * len(images)
    entries, blobs = b"", b""
    for size, data in images:
        entries += struct.pack("<BBBBHHII", size % 256, size % 256, 0, 0, 1, 32, len(data), offset)
        offset += len(data)
        blobs += data
    return header + entries + blobs


def main():
    root = os.path.join(os.path.dirname(__file__), "..", "public")
    out = lambda *p: os.path.join(root, *p)

    for size, name in [(180, "apple-touch-icon.png"), (192, "icon-192.png"), (512, "icon-512.png")]:
        with open(out(name), "wb") as f:
            f.write(render(size, app_icon_color, ss=2 if size > 200 else 4))

    with open(out("brand", "mark-512.png"), "wb") as f:
        f.write(render(512, lambda x, y: placed_mark(x, y, BLACK), ss=2))

    with open(out("favicon.ico"), "wb") as f:
        f.write(ico([(s, render(s, app_icon_color)) for s in (16, 32, 48)]))
    print("icons written to", os.path.abspath(root))


if __name__ == "__main__":
    main()
