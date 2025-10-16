import React, { useContext, useEffect, useRef, useState } from 'react'
import assets  from '../assets/assets'
import { formatMessageTime, formatLastSeen } from '../lib/util'
import { ChatContext } from '../context/ChatContext'
import { AuthContext } from '../context/AuthContext'
import toast from 'react-hot-toast'

const ChatContainer = () => {
  const { messages, selectedUser, setSelectedUser, sendMessage, getMessages, typingUsers, reactToMessage, editMessage, deleteMessage } = useContext(ChatContext)
  const { authUser, onlineUsers, socket } = useContext(AuthContext)

  const scrollEnd = useRef()

  const [input, setInput] = useState('');
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [showMessageActions, setShowMessageActions] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState('');
  const [lastMessageCount, setLastMessageCount] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const recordingTimerRef = useRef(null);

  // handle send messages
  const handleSendMessages = async (e) => {
    console.log("Sending message:", input);
    e.preventDefault();
    if (input.trim() === "") return null;
    await sendMessage({ text: input.trim() });
    setInput("")
  }

  // handle sending an image
  const handleSendImage = async (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith("image/")) {
      toast.error("select an image file")
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      await sendMessage({ image: reader.result });
      e.target.value = ""
    }
    reader.readAsDataURL(file);
  }

  // handle voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      const chunks = [];

      mediaRecorderRef.current.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          await sendMessage({ 
            audio: reader.result, 
            messageType: 'audio',
            duration: recordingTime 
          });
        };
        reader.readAsDataURL(blob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      // Emit recording status
      if (selectedUser && socket) {
        socket.emit('recording', { receiverId: selectedUser._id, isRecording: true });
      }
    } catch (error) {
      toast.error('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingTimerRef.current);
      
      // Emit recording status
      if (selectedUser && socket) {
        socket.emit('recording', { receiverId: selectedUser._id, isRecording: false });
      }
    }
  };

  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (selectedUser) {
      getMessages(selectedUser._id)
    }
  }, [selectedUser])

  useEffect(() => {
    if (scrollEnd.current) {
      scrollEnd.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, selectedUser])

  useEffect(() => {
    return () => {
      if (typingTimeout) clearTimeout(typingTimeout);
    };
  }, [typingTimeout])

  // rely on ChatContext's `newMessage` listener; no local socket listener required
  // ...existing code...

  // Only request online status when the selected user's id changes.
  // Also, only update the selected user if the online flag actually changed to avoid
  // a setState -> re-render -> effect loop.
  useEffect(() => {
    const id = selectedUser?._id;
    if (!id) return;

    console.log("Emitting getOnlineStatus for user:", id);
    socket?.emit("getOnlineStatus", id, (isOnline) => {
      console.log("Received online status:", isOnline);
      setSelectedUser((prevUser) => {
        if (!prevUser) return prevUser;
        if (prevUser.isOnline === isOnline) return prevUser; // no change -> avoid re-render
        return { ...prevUser, isOnline };
      });
    });
  }, [selectedUser?._id, socket]);

  return selectedUser ? (
    <div className='h-full overflow-scroll relative backdrop-blur-lg'>
      <div className='flex items-center gap-3 py-3 px-4 border-b border-stone-500'>
        <img src={selectedUser.profilePic || assets.avatar_icon} alt="" className=" w-8 rounded-full" />
        <div className='flex-1'>
          <p className='text-lg text-white flex items-center gap-2'>
            {selectedUser.fullName}
            {Array.isArray(onlineUsers) && onlineUsers.includes(selectedUser._id) ? (
              <span className='w-2 h-2 rounded-full bg-green-500' title="online"></span>
            ) : (
              <span className='w-2 h-2 rounded-full bg-gray-500' title="offline"></span>
            )}
          </p>
          {typingUsers[selectedUser._id] ? (
            <p className='text-sm text-green-400'>Typing...</p>
          ) : !onlineUsers.includes(selectedUser._id) && selectedUser.lastSeen ? (
            <p className='text-sm text-gray-400'>Last seen at {formatLastSeen(selectedUser.lastSeen)}</p>
          ) : null}
        </div>

        <img onClick={() => setSelectedUser(null)} src={assets.arrow_icon} alt=""
          className='md:hidden max-w-7' />
        <img src={assets.help_icon} alt="" className='max-md:hidden max-w-5' />
      </div>

      {/* chat area */}
      <div className='flex flex-col h-[calc(100%-120px)] overflow-y-scroll p-3 pb-6'>
        {messages.map((msg) => {
          const senderId = msg.sendrId || msg.senderId;
          const isMine = senderId === authUser?._id;
          const avatarSrc = isMine
            ? authUser?.profilePic || assets.avatar_icon
            : selectedUser?.profilePic || assets.avatar_icon;

          return (
            <div key={msg._id || Math.random()} className='mb-4'>
              <div className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
                {!isMine && (
                  <img src={avatarSrc} alt="avatar" className="w-7 rounded-full" />
                )}

                {/* message bubble */}
                <div className='relative group'>
                  <div 
                    onClick={() => setShowMessageActions(msg)}
                    className='cursor-pointer'
                  >
                    {msg.image ? (
                      <img
                        src={msg.image}
                        alt="message-image"
                        className={`max-w-[230px] border rounded-lg overflow-hidden`}
                      />
                    ) : msg.messageType === 'audio' || msg.audio ? (
                      <div className={`p-3 rounded-lg ${isMine ? 'bg-blue-500' : 'bg-gray-200'} min-w-[200px]`}>
                        <div className='flex items-center gap-2'>
                          <span className='text-lg'>🎤</span>
                          <audio controls className='flex-1 h-8'>
                            <source src={msg.audio} type="audio/webm" />
                            <source src={msg.audio} type="audio/mp3" />
                          </audio>
                        </div>
                        {msg.duration && (
                          <p className={`text-xs mt-1 ${isMine ? 'text-blue-100' : 'text-gray-600'}`}>
                            {formatRecordingTime(msg.duration)}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className={`p-2 max-w-[200px] md:text-sm font-normal rounded-lg break-all ${
                        isMine ? 'bg-blue-500 text-white rounded-br-none' : 'bg-gray-200 text-black rounded-bl-none'
                      }`}>
                        {msg.text}
                        {msg.edited && <span className='text-xs opacity-70 ml-2'>(edited)</span>}
                      </div>
                    )}
                  </div>
                  
                  {/* Message reactions */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className='flex gap-1 mt-1'>
                      {msg.reactions.map((reaction, idx) => (
                        <span key={idx} className='text-xs bg-gray-600 px-1 rounded text-white'>
                          {reaction.emoji}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {/* Quick actions on hover */}
                  <div className='absolute -top-8 right-0 hidden group-hover:flex bg-gray-700 rounded px-2 py-1 gap-2 z-10'>
                    <button 
                      onClick={() => setShowMessageActions(msg)} 
                      className='text-xs hover:text-blue-400 p-1 text-white'
                      title='More actions'
                    >
                      ⋯
                    </button>
                  </div>
                </div>

                {isMine && (
                  <img src={avatarSrc} alt="avatar" className="w-7 rounded-full" />
                )}

                <div className="text-center text-xs flex flex-col">
                  <p className='text-gray-500'>
                    {formatMessageTime(msg.createdAt)}
                  </p>
                  {/* Message status ticks */}
                  {isMine && (
                    <div className='text-xs mt-1'>
                      {msg.seen ? (
                        <span className='text-blue-400'>✓✓</span>
                      ) : msg.delivered ? (
                        <span className='text-gray-400'>✓✓</span>
                      ) : (
                        <span className='text-gray-500'>✓</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={scrollEnd}></div>
      </div>

      {/* Recording indicator */}
      {isRecording && (
        <div className='absolute top-16 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-full flex items-center gap-2 z-10'>
          <div className='w-3 h-3 bg-white rounded-full animate-pulse'></div>
          <span className='text-sm'>Recording... {formatRecordingTime(recordingTime)}</span>
        </div>
      )}

      {/* bottom area */}
      <div className='absolute bottom-0 left-0 right-0 flex items-center gap-3 p-3'>
        <div className='flex-1 flex items-center bg-gray-100/12 rounded-full'>
          <input 
            onChange={(e) => {
              setInput(e.target.value);
              if (selectedUser && socket) {
                socket.emit('typing', { receiverId: selectedUser._id, isTyping: true });
                if (typingTimeout) clearTimeout(typingTimeout);
                setTypingTimeout(setTimeout(() => {
                  socket.emit('typing', { receiverId: selectedUser._id, isTyping: false });
                }, 1000));
              }
            }} 
            value={input}
            onKeyDown={(e) => e.key === "Enter" ? handleSendMessages(e) : null}
            type="text" 
            placeholder='Send a message'
            className='flex-1 text-sm p-3 border-none outline-none bg-transparent text-white placeholder-gray-400'
            disabled={isRecording}
          />
          
          <input onChange={handleSendImage} type="file" id='image' accept='image/*' hidden />
          <label htmlFor="image" className={`${isRecording ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}>
            <img src={assets.gallery_icon} alt="" className="w-5 mx-2" />
          </label>
          
          {/* Mic button */}
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              startRecording();
            }}
            onMouseUp={(e) => {
              e.preventDefault();
              stopRecording();
            }}
            onMouseLeave={(e) => {
              e.preventDefault();
              stopRecording();
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              startRecording();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              stopRecording();
            }}
            onTouchCancel={(e) => {
              e.preventDefault();
              stopRecording();
            }}
            className={`p-3 rounded-full transition-colors select-none ${
              isRecording 
                ? 'bg-red-600 text-white' 
                : 'hover:bg-gray-700 text-gray-400'
            }`}
            title={isRecording ? 'Release to send' : 'Hold to record'}
            type="button"
          >
            🎤
          </button>
        </div>
        
        {!isRecording && (
          <img 
            onClick={(e) => handleSendMessages(e)} 
            src={assets.send_button} 
            alt="" 
            className='w-7 cursor-pointer' 
          />
        )}
      </div>
      
      {/* Message Actions Modal */}
      {showMessageActions && (
        <div className='fixed inset-0 z-40 bg-black/20' onClick={() => setShowMessageActions(null)}>
          <div className='absolute bg-gray-800 rounded-lg p-4 shadow-lg z-50 min-w-64' 
               style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
            <h3 className='text-white mb-3 font-medium'>Message Actions</h3>
            
            {/* Reactions */}
            <div className="flex flex-wrap gap-1 mb-4 border-b border-gray-600 pb-3">
              {['❤️', '😂', '👍', '🔥', '😀', '😃', '😄', '😁', '🥹', '😋', '☹️', '🥺', '🤬', '🤗', '🫰🏽', '👀', '👁️', '👄'].map(emoji => {
                const hasReacted = showMessageActions.reactions?.some(r => r.userId === authUser?._id && r.emoji === emoji);
                return (
                  <button 
                    key={emoji}
                    onClick={async () => { 
                      await reactToMessage(showMessageActions._id, emoji); 
                      setShowMessageActions(null); 
                    }} 
                    className={`text-lg hover:bg-gray-700 p-1 rounded transition-colors ${
                      hasReacted ? 'bg-blue-600' : ''
                    }`}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>

            {/* Actions */}
            <div className='space-y-2'>
              {showMessageActions.sendrId === authUser?._id && (
                <button 
                  onClick={() => {
                    setEditingMessage(showMessageActions);
                    setEditText(showMessageActions.text);
                    setShowMessageActions(null);
                  }}
                  className="block w-full text-left px-3 py-2 hover:bg-gray-700 rounded text-sm text-white"
                >
                  Edit
                </button>
              )}
              {showMessageActions.sendrId === authUser?._id && (
                <button 
                  onClick={async () => {
                    await deleteMessage(showMessageActions._id, 'everyone');
                    setShowMessageActions(null);
                  }}
                  className="block w-full text-left px-3 py-2 hover:bg-gray-700 rounded text-sm text-red-400"
                >
                  Delete for Everyone
                </button>
              )}
              <button 
                onClick={async () => {
                  await deleteMessage(showMessageActions._id, 'me');
                  setShowMessageActions(null);
                }}
                className="block w-full text-left px-3 py-2 hover:bg-gray-700 rounded text-sm text-red-400"
              >
                Delete for Me
              </button>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(showMessageActions.text || '');
                  setShowMessageActions(null);
                  toast.success('Message copied!');
                }}
                className="block w-full text-left px-3 py-2 hover:bg-gray-700 rounded text-sm text-white"
              >
                Copy
              </button>
            </div>
            
            <button 
              onClick={() => setShowMessageActions(null)}
              className='mt-4 w-full bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded text-white'
            >
              Close
            </button>
          </div>
        </div>
      )}
      
      {/* Edit Message Modal */}
      {editingMessage && (
        <div className='fixed inset-0 z-50 bg-black/20 flex items-center justify-center'>
          <div className='bg-gray-800 rounded-lg p-4 w-96'>
            <h3 className='text-white mb-3'>Edit Message</h3>
            <input
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className='w-full bg-gray-700 text-white p-2 rounded mb-3'
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  editMessage(editingMessage._id, editText);
                  setEditingMessage(null);
                }
              }}
            />
            <div className='flex gap-2'>
              <button
                onClick={() => {
                  editMessage(editingMessage._id, editText);
                  setEditingMessage(null);
                }}
                className='bg-blue-600 text-white px-4 py-2 rounded'
              >
                Save
              </button>
              <button
                onClick={() => setEditingMessage(null)}
                className='bg-gray-600 text-white px-4 py-2 rounded'
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  ) : (
    <div className='flex flex-col items-center justify-center gap-2 text-gray-500
    bg-white/10 max-md:hidden'>
      <img src={assets.logo_icon} className='max-w-16' alt="" />
      <p className='text-lg font-medium text-white'> chat anytime, anywhere</p>
    </div>
  )
}

export default ChatContainer
