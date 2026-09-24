import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'

export default function useOtpEmail(initialCooldown = 0) {
  const [sending, setSending] = useState(false)
  const [cooldown, setCooldown] = useState(initialCooldown)
  const pending = useRef(false)

  useEffect(() => {
    if (!cooldown) return
    const timer = setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const send = async (url, body = {}) => {
    if (pending.current || cooldown > 0) return false
    pending.current = true
    setSending(true)
    try {
      const { data } = await axios.post(url, body)
      if (!data.success) { toast.error(data.message); return false }
      toast.success(data.message)
      setCooldown(60)
      return true
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
      return false
    } finally {
      pending.current = false
      setSending(false)
    }
  }

  return { send, sending, cooldown }
}
