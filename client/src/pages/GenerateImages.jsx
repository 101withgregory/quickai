import { Image, Sparkles } from 'lucide-react'
import React, { useState } from 'react'
import axios from 'axios'
import { useAuth } from '@clerk/clerk-react'
import Markdown from 'react-markdown'
import toast from 'react-hot-toast'

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL
function GenerateImages() {
   const imageStyle = [
        'Realistic' , 'Ghibli style', 'Anime Style' , 'Cartoon style', 'Fantasy style', 'Realistic style', '3D style','Portrait syle'
      ]
    
      const [selectedStyle, setSelectedStyle] = useState('3D style')
      const [input, setInput] = useState('')
      const [publish, setPublish] = useState(false)
        const [loading, setLoading] = useState(false);
           const [content, setContent] = useState('');
           const {getToken} = useAuth()
      const onSubmitHandler = async (e)=>{
        e.preventDefault();
        try {
          setLoading(true);
          const prompt = `Generate an image of ${input} in the style ${selectedStyle}`

          const response = await axios.post('/api/ai/generate-image', {prompt, publish}, {headers: {
                    Authorization: `Bearer ${await getToken()}`
                  }})
                  const data = response.data
                  if(data.success){
                    setContent(data.content)
                  }else{
                    toast.error(data.message)
                  }
        } catch (error) {
          // This catch block handles network errors or non-2xx HTTP status codes
        // (like 402, 401, 500 etc.) returned by your backend.
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            if (error.response.status === 402) {
                // Specific message for HTTP 402 "Payment Required"
                toast.error("Subscribe to premium to use this feature!");
            } else if (error.response.data && error.response.data.message) {
                // If the server sent a specific error message in the response body
                toast.error(error.response.data.message);
            } else {
                // Generic message for other HTTP error status codes (e.g., 400, 401, 500)
                toast.error(`Request failed with status code ${error.response.status}`);
            }
        } else if (error.request) {
            // The request was made but no response was received (e.g., network error, server down)
            toast.error("No response from server. Please check your network connection.");
        } else {
            // Something happened in setting up the request that triggered an Error
            toast.error(`Error: ${error.message}`);
        }
        }
        setLoading(false)
      }
  return (
     <div className='flex h-full overflow-y-scroll p-6 items-start flex-wrap gap-4 text-slate-700'>
     {/* Left col */}
      <form onSubmit={onSubmitHandler} action="" className='w-full max-w-lg p-4 bg-white rounded-lg border border-gray-200'>
        <div className='flex items-center gap-3'>
          <Sparkles className='w-6 text-[#00AD25]'/>
          <h1>AI Image Generator</h1>
        </div>
        <p className='mt-6 text-sm font-medium'>Describe Your Image</p>

        <textarea onChange={(e)=> setInput(e.target.value)} value={input}  className='w-full p-2 px-3 mt-2 outline-none text-sm rounded-md border border-gray-300' placeholder='Describe what you want to see in the image...'
        required rows={4}/>
        <p className='mt-4 font-medium text-sm'>Style</p>

        <div className='mt-3 flex gap-3 flex-wrap sm:max-w-9/11'>
          {imageStyle.map((item)=> (
            <span onClick={()=> setSelectedStyle(item)} className={`cursor-pointer text-xs px-4 py-1 border rounded-full ${selectedStyle === item ? 'bg-green-50 text-green-700' : 'text-gray-500 border-gray-300'}`} key={item}>{item}</span>
          ))}
        </div>
        <div className='my-6 flex items-center gap-2'>
          <label className='relative cursor-pointer'>
            <input type="checkbox" onChange={(e)=>setPublish(e.target.checked)} checked={publish} className='sr-only peer'/>
            <div className='w-9 h-5 bg-slate-300 rounded-full peer-checked:bg-green-500 transition'></div>
            <span className='absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition peer-checked:translate-x-4'></span>
          </label>
          <p className='text-sm'>Make this image Public</p>
        </div>
        <br />
        <button disabled={loading} className='w-full flex justify-center items-center gap-2 bg-gradient-to-r from-[#00AD25] to-[#04FF50] text-white px-4 py-2 mt-6 text-sm rounded-lg cursor-pointer'> {
            loading ? <span className='w-4 h-4 my-1 rounded-full border-2 border-t-transparent animate-spin'></span> : <Image className='w-5'/>
          }Generate Image </button>
      </form>
      {/* right col */}
      <div className='w-full max-w-lg p-4 bg-white rounded-lg flex flex-col border border-gray-200 min-h-96'>
          <div className='flex items-center gap-3'>
            <Image className='w-5 h-5 text-[#00AD25]'/>
            <h1 className='text-xl font-semibold'>Generated image</h1> 
          </div>
          {
            !content ? (
<div className='flex-1 flex justify-center items-center'>
               <div className='text-sm flex flex-col items-center gap-5 text-gray-400'>
           <Image className='w-9 h-9'/>
           <p>Enter a topic and click "Generate image" to get started</p>
               </div>
          </div>

            ):(
              <div className='mt-3 h-full overflow-y-scroll text-sm text-slate-600'>
                                          <div className='reset-tw '>
                                             <Markdown>{content}</Markdown>
                                          </div>                                                 </div>
            )
          }
          
      </div>
      
      </div>
  )
}

export default GenerateImages