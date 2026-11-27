"""Arma el PDF descargable de cada muestra a partir de sus páginas .webp.

Uso (requiere Pillow):  python herramientas/muestras-pdf.py [id-del-libro ...]
Sin argumentos regenera todos. Guarda assets/libros/<id>/muestra.pdf.
"""
import io
import re
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

LIBROS = Path(__file__).resolve().parent.parent / 'assets' / 'libros'
ANCHO_PULGADAS = 8.5  # tamaño carta al imprimir
ANCHO_PX = 900  # nítido en pantalla y ligero para WhatsApp; borrador si se imprime
MARCA_LINEAS = ('MUESTRA EDITORIAL DT5', 'PROHIBIDA SU REPRODUCCIÓN')
MARCA_ANGULO = 33
MARCA_COLOR = (27, 47, 107, 42)  # azul DT5 ~16 % de opacidad
MARCA_BORDE = (255, 255, 255, 36)  # halo claro para páginas o portadas oscuras
FUENTES = (
    'C:/Windows/Fonts/segoeuib.ttf',
    'C:/Windows/Fonts/arialbd.ttf',
    '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
)


def cargar_fuente(tamano):
    for ruta in FUENTES:
        if Path(ruta).exists():
            return ImageFont.truetype(ruta, tamano)
    return ImageFont.load_default(size=tamano)


def capa_marca(tamano):
    ancho, alto = tamano
    grande = cargar_fuente(max(24, round(ancho * 0.056)))
    chica = cargar_fuente(max(15, round(ancho * 0.031)))

    # Dibuja el bloque de dos líneas centrado sobre un lienzo temporal antes de rotarlo.
    medidor = ImageDraw.Draw(Image.new('RGBA', (1, 1)))
    b1 = medidor.textbbox((0, 0), MARCA_LINEAS[0], font=grande, stroke_width=2)
    b2 = medidor.textbbox((0, 0), MARCA_LINEAS[1], font=chica, stroke_width=1)
    w1, h1 = b1[2] - b1[0], b1[3] - b1[1]
    w2, h2 = b2[2] - b2[0], b2[3] - b2[1]
    espacio = max(6, round(ancho * 0.012))
    pad = 16
    sello_w = max(w1, w2) + pad * 2
    sello_h = h1 + espacio + h2 + pad * 2

    sello = Image.new('RGBA', (sello_w, sello_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(sello)
    draw.text(
        ((sello_w - w1) / 2 - b1[0], pad - b1[1]),
        MARCA_LINEAS[0],
        font=grande,
        fill=MARCA_COLOR,
        stroke_width=2,
        stroke_fill=MARCA_BORDE,
    )
    draw.text(
        ((sello_w - w2) / 2 - b2[0], pad + h1 + espacio - b2[1]),
        MARCA_LINEAS[1],
        font=chica,
        fill=MARCA_COLOR,
        stroke_width=1,
        stroke_fill=MARCA_BORDE,
    )
    rotado = sello.rotate(MARCA_ANGULO, resample=Image.BICUBIC, expand=True)

    capa = Image.new('RGBA', (ancho, alto), (0, 0, 0, 0))
    for fraccion_y in (0.30, 0.70):
        x = round((ancho - rotado.width) / 2)
        y = round(alto * fraccion_y - rotado.height / 2)
        capa.alpha_composite(rotado, (x, y))
    return capa


def paginas(carpeta):
    numeradas = [p for p in carpeta.glob('*.webp') if re.fullmatch(r'\d+', p.stem)]
    return sorted(numeradas, key=lambda p: int(p.stem))


def armar(carpeta):
    hojas = []
    capas = {}
    for ruta in paginas(carpeta):
        with Image.open(ruta) as im:
            im = im.convert('RGBA')
            if im.width > ANCHO_PX:
                im = im.resize((ANCHO_PX, round(im.height * ANCHO_PX / im.width)), Image.LANCZOS)
            capa = capas.get(im.size)
            if capa is None:
                capa = capa_marca(im.size)
                capas[im.size] = capa
            im = Image.alpha_composite(im, capa).convert('RGB')
            buffer = io.BytesIO()
            im.save(buffer, 'JPEG', quality=72, optimize=True, progressive=True)
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
