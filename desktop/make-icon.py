"""Tworzy prostą ikonę app-icon.png (1024x1024), jeśli nie masz własnej. Podmień plik, żeby zmienić ikonę."""
import struct, zlib
N = 1024
def px(x, y):
    bg = (14, 12, 26)
    # bursztynowa teczka: zaokrąglony prostokąt z zakładką
    in_body = 170 <= x <= 854 and 330 <= y <= 800
    in_tab = 170 <= x <= 480 and 230 <= y < 330
    return (255, 182, 92) if in_body or in_tab else bg
rows = b"".join(b"\x00" + b"".join(bytes(px(x, y)) for x in range(N)) for y in range(N))
def chunk(t, d): return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
open("app-icon.png", "wb").write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", N, N, 8, 2, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(rows, 9)) + chunk(b"IEND", b""))
print("app-icon.png gotowe")
