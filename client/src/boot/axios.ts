import axios from 'axios'
import { LocalStorage } from 'quasar'
import { API_URL } from '@/config'
import { ref, computed } from 'vue'

const pendingRequests = ref(0)
export const isLoading = computed(() => pendingRequests.value > 0)
const incrementPending = () => {
  pendingRequests.value++
}
const decrementPending = () => {
  pendingRequests.value = Math.max(0, pendingRequests.value - 1)
}

export const axiosInstance = axios.create({ baseURL: API_URL })

// Request interceptor
axiosInstance.interceptors.request.use((config) => {
  const token = LocalStorage.getItem('token') as string
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Token update interceptor
axiosInstance.interceptors.response.use((response) => {
  const newToken = response.headers['authorization']
  if (newToken && newToken.startsWith('Bearer ')) {
    const token = newToken.slice(7) // Remove 'Bearer ' prefix
    LocalStorage.set('token', token)
  }
  return response
})

axiosInstance.interceptors.request.use(
  (config) => {
    incrementPending()
    return config
  },
  (error) => {
    decrementPending()
    return Promise.reject(error as Error)
  },
)

axiosInstance.interceptors.response.use(
  (response) => {
    decrementPending()
    return response
  },
  (error) => {
    decrementPending()
    return Promise.reject(error as Error)
  },
)
