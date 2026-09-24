import useOtpEmail from '../hooks/useOtpEmail'
import React, { useContext, useEffect, useRef } from 'react'
import { assets } from '../assets/assets'
import { useNavigate } from 'react-router-dom'
import { AppContext } from '../context/AppContext'
import { toast } from 'react-toastify'
import axios from 'axios'

const EmailVerify = () => {

  const navigate = useNavigate()
  const {backendUrl, isLoggedIn, userData, getUserData} = useContext(AppContext)
  const inputRefs = useRef([])
  const { send, sending, cooldown } = useOtpEmail(60)

  const resendOtp = async ()=>{
    if (await send(backendUrl + '/api/auth/send-verify-otp')) {
      inputRefs.current.forEach(input => { if (input) input.value = '' })
    }
  }

  const handleInput = (e, index)=>{
    if(e.target.value.length > 0 && index < inputRefs.current.length - 1){
      inputRefs.current[index + 1].focus()
    }
  }

  const handleKeyDown = (e, index)=>{
    if(e.key === 'Backspace' && e.target.value === '' && index > 0){
      inputRefs.current[index - 1].focus()
    }
  }

  const handlePaste = (e)=>{
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    paste.split('').forEach((char, index)=>{
      if(inputRefs.current[index]){
        inputRefs.current[index].value = char
      }
    })
    e.preventDefault()
  }

  const onSubmitHandler = async (e)=>{
    try {
      e.preventDefault()
      const otp = inputRefs.current.map(input => input.value).join('')

      const {data} = await axios.post(backendUrl + '/api/auth/verify-account', {otp})

      if(data.success){
        toast.success(data.message)
        getUserData()
        navigate('/')
      }else{
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    }
  }

  // Already verified users have nothing to do here
  useEffect(()=>{
    if(isLoggedIn && userData && userData.isAccountVerified){
      navigate('/')
    }
  }, [isLoggedIn, userData, navigate])

  return (
    <div className='flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-200 to-purple-400'>
      <img onClick={()=>navigate('/')} src={assets.logo} alt="" className='absolute left-5 sm:left-20 top-5 w-28 sm:w-32 cursor-pointer' />

      <form onSubmit={onSubmitHandler} className='bg-slate-900 p-8 rounded-lg shadow-lg w-96 text-sm'>
        <h1 className='text-white text-2xl font-semibold text-center mb-4'>Email Verify OTP</h1>
        <p className='text-center mb-6 text-indigo-300'>Check your email inbox and Spam folder. Enter the latest 6-digit code within 10 minutes.</p>

        <div className='flex justify-between mb-8' onPaste={handlePaste}>
          {Array(6).fill(0).map((_, index)=>(
            <input type="text" maxLength='1' key={index} required inputMode='numeric'
              className='w-12 h-12 bg-[#333A5C] text-white text-center text-xl rounded-md'
              ref={el => inputRefs.current[index] = el}
              onInput={(e)=> handleInput(e, index)}
              onKeyDown={(e)=> handleKeyDown(e, index)}
            />
          ))}
        </div>

        <button className='w-full py-3 bg-gradient-to-r from-indigo-500 to-indigo-900 text-white rounded-full'>Verify email</button>
        <button type='button' disabled={sending || cooldown > 0} onClick={resendOtp} className='w-full text-indigo-300 mt-4 disabled:opacity-50'>
          {sending ? 'Sending…' : cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
        </button>
      </form>
    </div>
  )
}

export default EmailVerify
