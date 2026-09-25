const express = require('express')

const router = express.Router()

router.get('/:z/:x/:y', async (req, res) => {
  const z = Number(req.params.z)
  const x = Number(req.params.x)
  const y = Number(req.params.y)

  if (![z, x, y].every(Number.isInteger) || z < 0 || z > 19 || x < 0 || y < 0) {
    return res.status(400).json({ message: 'Tile inválido' })
  }

  try {
    const upstream = await fetch(`https://tile.openstreetmap.org/${z}/${x}/${y}.png`, {
      headers: {
        'User-Agent': 'Agua-Elite/1.0 (map tile proxy)',
        'Accept': 'image/png,image/*;q=0.8,*/*;q=0.5',
      },
    })

    if (!upstream.ok) {
      return res.sendStatus(upstream.status)
    }

    const buffer = Buffer.from(await upstream.arrayBuffer())
    res.set({
      'Content-Type': upstream.headers.get('content-type') || 'image/png',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    })
    res.send(buffer)
  } catch (err) {
    console.error('map tile proxy error:', err)
    res.status(502).json({ message: 'No se pudo cargar el mapa' })
  }
})

module.exports = router
