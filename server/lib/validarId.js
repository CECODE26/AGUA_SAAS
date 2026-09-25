function validarId(str) {
  const n = parseInt(str)
  return (isNaN(n) || n <= 0) ? null : n
}

module.exports = validarId
