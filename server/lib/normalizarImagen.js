const sharp = require('sharp')

// ── Normalización de imagen de producto ─────────────────────────────
// 1) Recorta el espacio en blanco sobrante alrededor del producto.
// 2) Quita el fondo blanco (lo hace TRANSPARENTE) con un flood-fill
//    desde los bordes: solo elimina el blanco conectado al borde, así
//    conserva los blancos interiores (reflejos, logos).
// 3) Reencuadra el producto en un lienzo cuadrado transparente de tamaño
//    fijo con margen uniforme → todas las imágenes quedan igual de grandes.
const CANVAS = 800   // lado del lienzo final (px)
const MARGIN = 60    // margen uniforme alrededor del producto (px)
const WHITE  = { r: 255, g: 255, b: 255, alpha: 1 }
const THRESH = 232   // un pixel se considera "fondo" si R,G,B ≥ este valor
const TRANSPARENT = { r: 255, g: 255, b: 255, alpha: 0 }

// Hace transparente el fondo blanco conectado a los bordes (flood-fill 4-dir).
async function quitarFondoBlanco(buffer) {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height, channels: ch } = info
  const visited = new Uint8Array(width * height)
  const stack = []

  const seed = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return
    const p = y * width + x
    if (visited[p]) return
    visited[p] = 1
    const i = p * ch
    if (data[i] >= THRESH && data[i + 1] >= THRESH && data[i + 2] >= THRESH) {
      data[i + 3] = 0            // volver transparente
      stack.push(x, y)
    }
  }

  for (let x = 0; x < width; x++) { seed(x, 0); seed(x, height - 1) }
  for (let y = 0; y < height; y++) { seed(0, y); seed(width - 1, y) }
  while (stack.length) {
    const y = stack.pop(), x = stack.pop()
    seed(x + 1, y); seed(x - 1, y); seed(x, y + 1); seed(x, y - 1)
  }

  // Feather: suaviza el halo blanco del borde (pixeles claros junto a
  // uno transparente se vuelven parcialmente transparentes).
  const isTransp = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return true
    return data[(y * width + x) * ch + 3] === 0
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * ch
      if (data[i + 3] === 0) continue
      const mn = Math.min(data[i], data[i + 1], data[i + 2])
      if (mn > 205 && (isTransp(x + 1, y) || isTransp(x - 1, y) || isTransp(x, y + 1) || isTransp(x, y - 1))) {
        // 205 → opaco, 255 → transparente
        data[i + 3] = Math.round(Math.max(0, (255 - mn) / 50) * 255)
      }
    }
  }

  // ¿Se borró casi todo? entonces el fondo no era blanco → no keying.
  let opacos = 0
  for (let p = 0; p < width * height; p++) if (data[p * ch + 3] > 20) opacos++
  const ok = opacos > width * height * 0.02

  return { buffer: await sharp(data, { raw: { width, height, channels: ch } }).png().toBuffer(), ok }
}

async function normalizarImagen(buffer) {
  const inner = CANVAS - MARGIN * 2

  // 1) fondo transparente → blanco (para poder recortar de forma uniforme)
  const sobreBlanco = await sharp(buffer).flatten({ background: WHITE }).toBuffer()

  // 2) recortar el borde blanco sobrante
  let recortada
  try { recortada = await sharp(sobreBlanco).trim().toBuffer() }
  catch { recortada = sobreBlanco }

  // 3) quitar fondo blanco → transparente
  const { buffer: sinFondo, ok } = await quitarFondoBlanco(recortada)
  const base = ok ? sinFondo : recortada   // si el keying falló, usar la recortada

  // 4) reencuadrar en lienzo cuadrado transparente con margen uniforme
  return sharp(base)
    .resize(inner, inner, { fit: 'contain', background: TRANSPARENT })
    .extend({ top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN, background: TRANSPARENT })
    .png()
    .toBuffer()
}

module.exports = { normalizarImagen }
