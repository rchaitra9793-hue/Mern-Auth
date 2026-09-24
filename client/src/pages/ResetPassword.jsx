import useOtpEmail from '../hooks/useOtpEmail'
import React, { useContext, useRef, useState } from 'react'
import { assets } from '../assets/assets'
import { useNavigate } from 'react-router-dom'
import { AppContext } from '../context/AppContext'
import { toast } from 'react-toastify'
import axios from 'axios'

const ResetPassword = () => {

  const navigate = useNavigate()
  const {backendUrl} = useContext(AppContext)

  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [isEmailSent, setIsEmailSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [isOtpSubmitted, setIsOtpSubmitted] = useState(false)

  const inputRefs = useRef([])
  const { send, sending, cooldown } = useOtpEmail()

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

  // Step 1: send the reset OTP to the email
  const onSubmitEmail = async (e)=>{
    e.preventDefault()
    if (await send(backendUrl + '/api/auth/send-reset-otp', { email })) {
      setIsEmailSent(true)
    }
  }

  const resendOtp = async ()=>{
    if (await send(backendUrl + '/api/auth/send-reset-otp', { email })) {
      setOtp('')
      inputRefs.current.forEach(input => { if (input) input.value = '' })
    }
  }

  // Step 2: keep the OTP; the server checks it together with the new password
  const onSubmitOtp = (e)=>{
    e.preventDefault()
    const otpArray = inputRefs.current.map(input => input.value)
    setOtp(otpArray.join(''))
    setIsOtpSubmitted(true)
  }

  // Step 3: set the new password
  const onSubmitNewPassword = async (e)=>{
    e.preventDefault()
    try {
      const {data} = await axios.post(backendUrl + '/api/auth/reset-password', {email, otp, newPassword})
      data.success ? toast.success(data.message) : toast.error(data.message)
      data.success && navigate('/login')
    } catch (error) {
      const message = error.response?.data?.message || error.message
      toast.error(message)
      // Wrong or expired OTP: let the user enter it again
      if(message === 'Invalid OTP' || message === 'OTP expired'){
        setIsOtpSubmitted(false)
      }
    }
  }

  return (
    <div className='flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-200 to-purple-400'>
      <img onClick={()=>navigate('/')} src={assets.logo} alt="" className='absolute left-5 sm:left-20 top-5 w-28 sm:w-32 cursor-pointer' />

      {/* Step 1: enter email */}
      {!isEmailSent &&
      <form onSubmit={onSubmitEmail} className='bg-slate-900 p-8 rounded-lg shadow-lg w-96 text-sm'>
        <h1 className='text-white text-2xl font-semibold text-center mb-4'>Reset password</h1>
        <p className='text-center mb-6 text-indigo-300'>Enter the email you used to create your account. You do not need your old password or to be logged in.</p>
        <div className='mb-4 flex items-center gap-3 w-full px-5 py-2.5 rounded-full bg-[#333A5C]'>
          <img src={assets.mail_icon} alt="" className='w-3 h-3' />
          <input type="email" placeholder='Email id' className='bg-transparent outline-none text-white w-full'
            value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <button disabled={sending || cooldown > 0} className='w-full py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-900 text-white rounded-full mt-3 disabled:opacity-50'>{sending ? 'Sending…' : cooldown > 0 ? `Wait ${cooldown}s` : 'Send reset code'}</button>
        <p className='text-gray-400 text-center text-xs mt-4'>Don&apos;t have an account?{' '}
          <span onClick={()=> navigate('/login')} className='text-blue-400 cursor-pointer underline'>Sign up</span>
        </p>
      </form>
      }

      {/* Step 2: enter OTP */}
      {isEmailSent && !isOtpSubmitted &&
      <form onSubmit={onSubmitOtp} className='bg-slate-900 p-8 rounded-lg shadow-lg w-96 text-sm'>
        <h1 className='text-white text-2xl font-semibold text-center mb-4'>Reset password OTP</h1>
        <p className='text-center mb-6 text-indigo-300'>Check the inbox and Spam folder for <strong>{email}</strong>. Enter the latest 6-digit code within 10 minutes.</p>
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
        <button className='w-full py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-900 text-white rounded-full'>Continue</button>
        <button type='button' disabled={sending || cooldown > 0} onClick={resendOtp} className='w-full text-indigo-300 mt-4 disabled:opacity-50'>
          {sending ? 'Sending…' : cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
        </button>
        <button type='button' disabled={sending} onClick={()=>{ setIsEmailSent(false); setOtp('') }} className='w-full text-indigo-300 mt-3'>Change email address</button>
      </form>
      }

      {/* Step 3: enter new password */}
      {isEmailSent && isOtpSubmitted &&
      <form onSubmit={onSubmitNewPassword} className='bg-slate-900 p-8 rounded-lg shadow-lg w-96 text-sm'>
        <h1 className='text-white text-2xl font-semibold text-center mb-4'>New password</h1>
        <p className='text-center mb-6 text-indigo-300'>Enter the new password below</p>
        <div className='mb-4 flex items-center gap-3 w-full px-5 py-2.5 rounded-full bg-[#333A5C]'>
          <img src={assets.lock_icon} alt="" className='w-3 h-3' />
          <input type="password" placeholder='Password' className='bg-transparent outline-none text-white w-full'
            value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
        </div>
        <button className='w-full py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-900 text-white rounded-full mt-3'>Submit</button>
      </form>
      }
    </div>
  )
}

export default ResetPassword
