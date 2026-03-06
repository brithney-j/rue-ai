"use client";

import { useState, useRef } from "react";

export default function Home() {

  const [message, setMessage] = useState("");
  const [image, setImage] = useState(null);

  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [monitorMode, setMonitorMode] = useState(false);

  const [session, setSession] = useState({
    dish:"",
    step:0,
    lastAdvice:"",
    lastMonitorNote:""
  });

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);



  function openFilePicker(){
    fileInputRef.current.click();
  }



  function handleUpload(file){

    const reader = new FileReader();

    reader.onloadend = () => {
      setImage(reader.result);
    };

    reader.readAsDataURL(file);
  }



  function handleDrop(e){

    e.preventDefault();

    const file = e.dataTransfer.files[0];

    if(file){
      handleUpload(file);
    }
  }



  function speak(text){

    const speech = new SpeechSynthesisUtterance(text);

    speech.rate = 1;
    speech.pitch = 1;
    speech.lang = "en-US";

    window.speechSynthesis.speak(speech);
  }



  async function askAI(){

    setLoading(true);

    const res = await fetch("/api/cook",{
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        mode:"analyze",
        message,
        image,
        session
      })
    });

    const data = await res.json();

    setReply(data.reply);

    setSession(data.session);

    setLoading(false);

    speak(data.reply);

    startMonitorMode();
  }



  async function startMonitorMode(){

    const stream = await navigator.mediaDevices.getUserMedia({
      video:{ facingMode:"environment" }
    });

    if(videoRef.current){
      videoRef.current.srcObject = stream;
    }

    setMonitorMode(true);

    startMonitoring();
  }



  function captureFrame(){

    const canvas = canvasRef.current;
    const video = videoRef.current;

    const ctx = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.drawImage(video,0,0);

    return canvas.toDataURL("image/png");
  }



  function startMonitoring(){

    setInterval(async ()=>{

      const frame = captureFrame();

      const res = await fetch("/api/cook",{
        method:"POST",
        headers:{
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
          mode:"monitor",
          image:frame,
          session
        })
      });

      const data = await res.json();

      if(data.reply && data.reply !== session.lastMonitorNote){

        speak(data.reply);

        setSession(prev => ({
          ...prev,
          lastMonitorNote:data.reply
        }));

      }

    },6000);
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

        <h1 style={{
          fontSize:28,
          textAlign:"center",
          marginBottom:25
        }}>
          RUE – AI Sous Chef
        </h1>



        {!monitorMode && (

          <>

            <input
              type="text"
              placeholder="What are you cooking?"
              value={message}
              onChange={(e)=>setMessage(e.target.value)}
              style={{
                width:"100%",
                padding:14,
                borderRadius:10,
                border:"1px solid #ddd",
                marginBottom:15
              }}
            />



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
              📷 Upload or Drag Food Photo

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{display:"none"}}
                onChange={(e)=>{

                  const file = e.target.files[0];

                  if(file){
                    handleUpload(file);
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
                background:"black",
                color:"white",
                border:"none",
                borderRadius:10,
                fontSize:16
              }}
            >
              {loading ? "RUE is analyzing..." : "Ask RUE"}
            </button>

          </>

        )}



        {monitorMode && (

          <div style={{textAlign:"center"}}>

            <video
              ref={videoRef}
              autoPlay
              playsInline
              style={{
                width:"100%",
                borderRadius:12
              }}
            />

            <p style={{marginTop:12,color:"#666"}}>
              👨‍🍳 RUE is watching your pan
            </p>

          </div>

        )}



        {reply && (

          <div style={{
            marginTop:25,
            padding:15,
            background:"#fafafa",
            borderRadius:10
          }}>
            {reply}
          </div>

        )}

      </div>

      <canvas ref={canvasRef} style={{display:"none"}} />

    </div>

  );

}