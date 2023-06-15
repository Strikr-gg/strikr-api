import axios from 'axios'
import tokens from 'src/../tokens'

console.log('TOKEN:', tokens.ODYSSEY_TOKEN)

export default axios.create({
  baseURL: process.env.ODYSSEY_URL,
  headers: {
    'X-Authorization': `Bearer ${tokens.ODYSSEY_TOKEN}`,
    'X-Refresh-Token': tokens.ODYSSEY_REFRESH_TOKEN,
  },
})
