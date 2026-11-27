"""Arma el PDF descargable de cada muestra a partir de sus páginas .webp.

Uso (requiere Pillow):  python herramientas/muestras-pdf.py [id-del-libro ...]
Sin argumentos regenera todos. Guarda assets/libros/<id>/muestra.pdf.
"""
import io
import re
import sys
from pathlib import Path

from PIL import Image

LIBROS = Path(__file__).resolve().parent.parent / 'assets' / 'libros'
ANCHO_PULGADAS = 8.5  # tamaño carta al imprimir
ANCHO_PX = 1200  # nítido para leer, ligero para WhatsApp


def paginas(carpeta):
    numeradas = [p for p in carpeta.glob('*.webp') if re.fullmatch(r'\d+', p.stem)]
    return sorted(numeradas, key=lambda p: int(p.stem))


def armar(carpeta):
    hojas = []
    for ruta in paginas(carpeta):
        with Image.open(ruta) as im:
            buffer = io.BytesIO()
            im = im.convert('RGB')
            if im.width > ANCHO_PX:
                im = im.resize((ANCHO_PX, round(im.height * ANCHO_PX / im.width)), Image.LANCZOS)
            im.save(buffer, 'JPEG', quality=70, optimize=True, progressive=True)
            hojas.append(Image.open(buffer))
    if not hojas:
        return None
    destino = carpeta / 'muestra.pdf'
    hojas[0].save(destino, 'PDF', save_all=True, append_images=hojas[1:],
                  resolution=hojas[0].width / ANCHO_PULGADAS)
    return destino, len(hojas)


if __name__ == '__main__':
    ids = sys.argv[1:] or sorted(p.name for p in LIBROS.iterdir() if p.is_dir())
    for libro in ids:
        hecho = armar(LIBROS / libro)
        if hecho:
            ruta, n = hecho
            print(f'{libro}: {n} págs., {ruta.stat().st_size / 1e6:.1f} MB')
        else:
            print(f'{libro}: sin páginas')
