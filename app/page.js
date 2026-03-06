"use client"

import { useState, useRef } from "react"

export default function Home(){

const [image,setImage] = useState(null)
const [reply,setReply] = useState("")
const [loading,setLoading] = useState(false)
const [monitorMode,setMonitorMode] = useState(false)
const [cookTime,setCookTime] = useState(0)

const videoRef = useRef(null)
const canvasRef = useRef(null)
const fileInputRef = useRef(null)

const monitorIntervalRef = useRef(null)
const timerIntervalRef = useRef(null)



/*
-------------------------
MOBILE SPEECH UNLOCK FIX
-------------------------
*/

const unlockSpeech = () => {
  const msg = new SpeechSynthesisUtterance("")
  msg.volume = 0
  speechSynthesis.speak(msg)
}



function speak(text){

if(!text) return

window.speechSynthesis.cancel()

const speech = new SpeechSynthesisUtterance(text)

speech.rate = 1
speech.pitch = 1
speech.lang = "en-US"

window.speechSynthesis.speak(speech)

}



function openFilePicker(){
fileInputRef.current.click()
}



function handleUpload(file){

const reader = new FileReader()

reader.onloadend = ()=>{
setImage(reader.result)
}

reader.readAsDataURL(file)

}



function handleDrop(e){

e.preventDefault()

const file = e.dataTransfer.files[0]

if(file){
handleUpload(file)
}

}



async function askAI(){

unlockSpeech()

setLoading(true)

const res = await fetch("/api/cook",{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
image
})
})

const data = await res.json()

setReply(data.reply)

setLoading(false)

setTimeout(()=>{
speak(data.reply)
},300)

startMonitorMode()

}



async function startMonitorMode(){

if(monitorMode) return

const stream = await navigator.mediaDevices.getUserMedia({
video:{facingMode:"environment"}
})

if(videoRef.current){
videoRef.current.srcObject = stream
}

setMonitorMode(true)



/*
-------------------------
SAFE TIMER (ONLY STARTS ONCE)
-------------------------
*/

if(!timerIntervalRef.current){

timerIntervalRef.current = setInterval(()=>{
setCookTime(prev=>prev+1)
},1000)

}



startMonitoring()

}



function captureFrame(){

const canvas = canvasRef.current
const video = videoRef.current

if(!video) return null

const ctx = canvas.getContext("2d")

canvas.width = video.videoWidth
canvas.height = video.videoHeight

ctx.drawImage(video,0,0)

return canvas.toDataURL("image/png")

}



function startMonitoring(){

if(monitorIntervalRef.current) return



/*
-------------------------
MONITOR LOOP (SAFEGUARD)
-------------------------
*/

monitorIntervalRef.current = setInterval(async()=>{

const frame = captureFrame()

if(!frame) return

const res = await fetch("/api/cook",{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
mode:"monitor",
image:frame
})
})

const data = await res.json()

if(data.reply){

speak(data.reply)

}

},6000)

}



return(

<div style={{
minHeight:"100vh",
background:"#f5f5f5",
display:"flex",
justifyContent:"center",
alignItems:"center",
fontFamily:"system-ui"
}}>

<div style={{
background:"white",
padding:40,
borderRadius:16,
width:420,
boxShadow:"0 15px 40px rgba(0,0,0,0.08)"
}}>

<div style={{textAlign:"center",marginBottom:25}}>

<div style={{fontSize:34,fontWeight:700}}>
🔊 RUE
</div>

<div style={{fontSize:14,color:"#666"}}>
AI Sous Chef • Beta
</div>

</div>



{!monitorMode && (

<>

<div
onClick={openFilePicker}
onDragOver={(e)=>e.preventDefault()}
onDrop={handleDrop}
style={{
border:"2px dashed #ddd",
padding:30,
borderRadius:12,
textAlign:"center",
cursor:"pointer",
marginBottom:20
}}
>

📸 Upload or Drag Food Photo

<input
ref={fileInputRef}
type="file"
accept="image/*"
style={{display:"none"}}
onChange={(e)=>{

const file = e.target.files[0]

if(file){
handleUpload(file)
}

}}
/>

</div>



{image && (

<img
src={image}
alt="food"
style={{
width:"100%",
borderRadius:12,
marginBottom:20
}}
/>

)}



<button
onClick={askAI}
disabled={loading}
style={{
width:"100%",
padding:16,
background:"#FF6B3D",
color:"white",
border:"none",
borderRadius:12,
fontSize:16,
fontWeight:600
}}
>

{loading ? "RUE is analyzing..." : "Ask RUE"}

</button>

</>

)}



{monitorMode && (

<div style={{textAlign:"center"}}>

<div style={{
fontWeight:700,
fontSize:18,
marginBottom:8
}}>
🔊 RUE Cooking Mode
</div>

<video
ref={videoRef}
autoPlay
playsInline
style={{
width:"100%",
borderRadius:12
}}
/>

<div style={{
marginTop:12,
fontSize:14,
color:"#22A06B",
fontWeight:600
}}>
Monitoring Active
</div>

<div style={{
marginTop:6,
fontSize:13,
color:"#666"
}}>
Cook time: {Math.floor(cookTime/60)}:{String(cookTime%60).padStart(2,'0')}
</div>

</div>

)}



{reply && (

<div style={{
marginTop:20,
padding:18,
background:"#FFF7F2",
borderRadius:12,
fontSize:16,
fontWeight:500,
whiteSpace:"pre-line"
}}>

👨‍🍳 RUE says:

<div style={{marginTop:8}}>
{reply}
</div>

</div>

)}

</div>

<canvas ref={canvasRef} style={{display:"none"}} />

</div>

)

}