const BASE_URL = '/api/v1'

async function request(url, options = {}) {
  const response = await fetch(`${BASE_URL}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  })
  
  const data = await response.json()
  
  if (data.code !== 200) {
    throw new Error(data.msg || '请求失败')
  }
  
  return data.data
}

export const api = {
  health: () => request('/health'),
  
  graph: {
    getFull: (limit) => request(`/graph/?${limit ? `limit=${limit}` : ''}`)
  },
  
  notes: {
    create: (note) => request('/notes/', { method: 'POST', body: JSON.stringify(note) }),
    get: (id) => request(`/notes/${id}`),
    update: (id, note) => request(`/notes/${id}`, { method: 'PUT', body: JSON.stringify(note) }),
    delete: (id) => request(`/notes/${id}`, { method: 'DELETE' }),
    list: () => request('/notes/')
  },
  
  links: {
    create: (link) => request('/links/', { method: 'POST', body: JSON.stringify(link) }),
    get: (id) => request(`/links/${id}`),
    update: (id, link) => request(`/links/${id}`, { method: 'PUT', body: JSON.stringify(link) }),
    delete: (id) => request(`/links/${id}`, { method: 'DELETE' }),
    list: () => request('/links/')
  },
  
  expand: {
    neighborhood: (nodeId, depth, typeFilter) => {
      const params = new URLSearchParams({ node_id: nodeId, depth })
      if (typeFilter) params.append('type_filter', typeFilter)
      return request(`/expand/neighborhood?${params.toString()}`)
    },
    path: (sourceId, targetId) => {
      return request(`/expand/path?source_id=${sourceId}&target_id=${targetId}`)
    }
  },
  
  search: {
    fulltext: (keyword, limit) => {
      return request(`/search/fulltext?keyword=${encodeURIComponent(keyword)}&limit=${limit || 20}`)
    },
    filter: (params) => {
      const query = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value) query.append(key, value)
      })
      return request(`/search/filter?${query.toString()}`)
    },
    review: {
      errors: () => request('/search/review/errors'),
      highWeight: (minWeight) => request(`/search/review/high-weight?min_weight=${minWeight || 2.0}`),
      recent: (days) => request(`/search/review/recent?days=${days || 7}`)
    }
  },
  
  cluster: {
    louvain: () => request('/cluster/louvain', { method: 'POST' }),
    statistics: () => request('/cluster/statistics')
  },
  
  import: {
    markdown: (filePaths) => request('/import/markdown', { method: 'POST', body: JSON.stringify({ file_paths: filePaths }) })
  }
}
