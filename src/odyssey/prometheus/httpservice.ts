import axios from 'axios'

export default axios.create({
  baseURL: process.env.ODYSSEY_URL,
  headers: {
    'X-Authorization': `Bearer ${process.env.ODYSSEY_TOKEN}`,
    'X-Refresh-Token': process.env.ODYSSEY_REFRESH_TOKEN,
  },
})
