/* Sample-data stand-in for the Express API. The VM instance runs the real server. */
const FIXTURES = {
  temp: new URL('fixtures/temp.json', self.location),
  users: new URL('fixtures/users.json', self.location),
}

let state = null

async function loadState() {
  if (state) return state
  const [temp, users] = await Promise.all([
    fetch(FIXTURES.temp).then((r) => r.json()),
    fetch(FIXTURES.users).then((r) => r.json()),
  ])
  state = {
    temp: structuredClone(temp),
    users,
    fresh: structuredClone(temp),
  }
  return state
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  const path = new URL(event.request.url).pathname
  const name = path.split('/').filter(Boolean).pop()
  const known = ['getTempData', 'getUsers', 'saveData', 'errorData', 'export', 'reset']
  if (!known.includes(name)) return

  event.respondWith((async () => {
    const current = await loadState()
    if (name === 'getUsers') return json(current.users)
    if (name === 'getTempData') return json(current.temp)
    if (name === 'reset') {
      current.temp = structuredClone(current.fresh)
      return json({ type: '设置成功！' })
    }
    if (name === 'saveData') {
      const body = await event.request.json()
      const type = body.type
      const rows = Array.isArray(body.data) ? body.data : []
      const bucket = current.temp.luckyData[type] || []
      current.temp.luckyData[type] = bucket.concat(rows)
      const ids = new Set(rows.map((row) => row && row[0]))
      current.temp.leftUsers = (current.temp.leftUsers || []).filter((row) => !ids.has(row[0]))
      return json({ type: '设置成功！' })
    }
    if (name === 'errorData') return json({ type: '设置成功！' })
    return json({ type: 'success', url: '' })
  })())
})
