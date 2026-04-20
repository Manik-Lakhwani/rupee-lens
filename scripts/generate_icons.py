import os
import zlib
import struct

os.makedirs('public', exist_ok=True)


def make_png(path, width, height, color=(48, 133, 89)):
    r, g, b = color
    buf = bytearray()
    for _ in range(height):
        buf.append(0)
        buf += bytes((r, g, b, 255)) * width
    comp = zlib.compress(bytes(buf), level=9)

    def chunk(type_, data):
        chunk_data = type_.encode('ascii') + data
        return struct.pack('>I', len(data)) + chunk_data + struct.pack('>I', zlib.crc32(chunk_data) & 0xFFFFFFFF)

    png = b'\x89PNG\r\n\x1a\n'
    png += chunk('IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))
    png += chunk('IDAT', comp)
    png += chunk('IEND', b'')
    with open(path, 'wb') as f:
        f.write(png)


make_png('public/icon-192.png', 192, 192)
make_png('public/icon-512.png', 512, 512)
print('icons generated')
