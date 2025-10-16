import { createContext, useContext, useEffect, useState } from "react";
import { AuthContext } from "./AuthContext";
import toast from "react-hot-toast";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [Users, SetUsers] = useState([]);
  const [selectedUser, setSelectUser] = useState(null);
  const [unseenMessages, setUnseenMessages] = useState({});
  const [typingUsers, setTypingUsers] = useState({});
  const [lastMessages, setLastMessages] = useState({});

  const { socket, axios } = useContext(AuthContext);

  // function to get all users for sidebar
  const getUsers = async () => {
    try {
      const { data } = await axios.get("/api/messages/users");
      if (data.success) {
        SetUsers(data.users);
        setUnseenMessages(data.unseenMessages);
        setLastMessages(data.lastMessages || {});
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // function to fetch messages for selected user
  const getMessages = async (userId) => {
    try {
      const { data } = await axios.get(`/api/messages/${userId}`);
      if (data.success) {
        setMessages(data.messages);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // function to send message to selected user
  const sendMessage = async (messageData) => {
    if (!selectedUser) return;

    try {
      const { data } = await axios.post(
        `/api/messages/send/${selectedUser._id}`,
        messageData
      );
      if (data.success) {
        setMessages((prevMessages) => [...prevMessages, data.newMessage]);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  useEffect(() => {
    if (socket) {
      const handleNewMessage = (newMessage) => {
        console.log("Received newMessage event:", newMessage);
        console.log("Current selected user:", selectedUser);
        // normalize property names from server (some messages use sendrId)
        const senderId = newMessage.sendrId || newMessage.senderId;
        const recvrId = newMessage.recvrId || newMessage.recvrId;

        console.log("Normalized ids - senderId:", senderId, "recvrId:", recvrId);

        // If the incoming message belongs to the currently selected conversation, append it
        if (
          selectedUser &&
          (senderId === selectedUser._id || recvrId === selectedUser._id)
        ) {
          setMessages((prevMessages) => {
            console.log("Previous messages state:", prevMessages);
            return [...prevMessages, newMessage];
          });
          // mark message as seen on server
          axios.put(`/api/messages/mark/${newMessage._id}`).catch((e) => console.log(e.message));
        } else {
          // increment unseen count for the sender
          setUnseenMessages((prevUnseen) => ({
            ...prevUnseen,
            [senderId]: prevUnseen[senderId] ? prevUnseen[senderId] + 1 : 1,
          }));
        }
      };

      const handleUserTyping = ({ userId, isTyping }) => {
        setTypingUsers(prev => ({
          ...prev,
          [userId]: isTyping
        }));
      };

      const handleMessageReaction = ({ messageId, reactions }) => {
        console.log('Received reaction update:', { messageId, reactions });
        setMessages(prev => {
          const updated = prev.map(msg => 
            msg._id === messageId ? { ...msg, reactions } : msg
          );
          console.log('Updated messages with reactions:', updated);
          return updated;
        });
      };

      const handleMessagesSeen = ({ messageId }) => {
        setMessages(prev => prev.map(msg => 
          msg._id === messageId ? { ...msg, seen: true } : msg
        ));
      };

      const handleMessageEdited = (editedMessage) => {
        setMessages(prev => prev.map(msg => 
          msg._id === editedMessage._id ? editedMessage : msg
        ));
      };

      const handleMessageDeleted = ({ messageId }) => {
        setMessages(prev => prev.filter(msg => msg._id !== messageId));
      };

      socket.on("newMessage", handleNewMessage);
      socket.on("userTyping", handleUserTyping);
      socket.on("messageReaction", handleMessageReaction);
      socket.on("messagesSeen", handleMessagesSeen);
      socket.on("messageEdited", handleMessageEdited);
      socket.on("messageDeleted", handleMessageDeleted);

      return () => {
        socket.off("newMessage", handleNewMessage);
        socket.off("userTyping", handleUserTyping);
        socket.off("messageReaction", handleMessageReaction);
        socket.off("messagesSeen", handleMessagesSeen);
        socket.off("messageEdited", handleMessageEdited);
        socket.off("messageDeleted", handleMessageDeleted);
      };
    }
  }, [socket, selectedUser, setMessages, setUnseenMessages, axios]);

  // Enhanced message operations
  const reactToMessage = async (messageId, emoji) => {
    try {
      console.log('Sending reaction:', { messageId, emoji });
      const { data } = await axios.put(`/api/messages/react/${messageId}`, { emoji });
      if (data.success) {
        console.log('Reaction response:', data);
        // Update local state immediately for better UX
        setMessages(prev => prev.map(msg => 
          msg._id === messageId ? { ...msg, reactions: data.reactions } : msg
        ));
      }
    } catch (error) {
      console.error('Reaction error:', error);
      toast.error(error.response?.data?.message || 'Failed to react');
    }
  };

  const value = {
    messages,
    Users,
    selectedUser,
    getUsers,
    getMessages,
    sendMessage,
    setSelectUser: setSelectUser,
    setSelectedUser: setSelectUser,
    unseenMessages,
    setUnseenMessages,
    typingUsers,
    lastMessages,
    recordingUsers: {},
    reactToMessage,
    editMessage: async (messageId, text) => {
      try {
        const { data } = await axios.put(`/api/messages/edit/${messageId}`, { text });
        if (data.success) {
          setMessages(prev => prev.map(msg => 
            msg._id === messageId ? { ...msg, text, edited: true } : msg
          ));
          toast.success('Message edited');
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to edit');
      }
    },
    deleteMessage: async (messageId, deleteFor) => {
      try {
        const { data } = await axios.delete(`/api/messages/delete/${messageId}`, { data: { deleteFor } });
        if (data.success) {
          setMessages(prev => prev.filter(msg => msg._id !== messageId));
          toast.success('Message deleted');
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to delete');
      }
    },
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
