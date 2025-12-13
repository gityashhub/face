// src/pages/Employee/EmployeeDashboard.js
import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import EmployeeLayout from '../../components/Employee/EmployeeLayout/EmployeeLayout';
import { 
  User, Clock, Calendar, DollarSign, CheckCircle, AlertCircle, MapPin, Bell, Award, Target, TrendingUp, FileText, MessageCircle, X, Send, Bot
} from 'lucide-react';
import toast from 'react-hot-toast';
import { employeeAPI, authAPI, attendanceAPI } from '../../utils/api';
import API from '../../utils/api';
import { geolocationUtils } from '../../utils/geolocationUtils';
import io from 'socket.io-client';

const EmployeeDashboard = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [location, setLocation] = useState(null);
  const [employeeData, setEmployeeData] = useState(null);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [hasCheckedOut, setHasCheckedOut] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [workingTime, setWorkingTime] = useState(null);
  const [realTimeWorkingTime, setRealTimeWorkingTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showBotModal, setShowBotModal] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [botMessages, setBotMessages] = useState([]);
  const [selectedPeer, setSelectedPeer] = useState(null);
  const [peers, setPeers] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [newBotMessage, setNewBotMessage] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);
  const [loadingBot, setLoadingBot] = useState(false);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const botMessagesEndRef = useRef(null);
  const botMessagesContainerRef = useRef(null);
  const botTimeoutRef = useRef(null);
  const isUserScrolledUp = useRef(false);

  const handleBotMessageChange = useCallback((e) => {
    setNewBotMessage(e.target.value);
  }, []);

  const handleChatMessageChange = useCallback((e) => {
    setNewMessage(e.target.value);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToBottomBot = () => {
    if (!isUserScrolledUp.current) {
      botMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  useLayoutEffect(() => {
    scrollToBottomBot();
  }, [botMessages]);

  useEffect(() => {
    const fetchEmployeeData = async () => {
      try {
        setLoading(true);
        let profileResponse;
        try {
          profileResponse = await authAPI.getMyProfile();
        } catch (error) {
          console.warn('authAPI.getMyProfile() failed, trying employeeAPI.getMyProfile()');
          profileResponse = await employeeAPI.getMyProfile();
        }

        if (profileResponse.data && profileResponse.data.success) {
          const employee = profileResponse.data.data;
          // Ensure we have the user ID as id, and employee ID as employeeId
          setEmployeeData({
            ...employee,
            id: employee.id || employee.user?._id || employee._id,
            employeeId: employee.employeeId || employee._id
          });

          const stats = [
            { title: 'Days Present', value: '22', subtitle: 'This Month', icon: CheckCircle, color: 'from-green-500 to-green-600', change: '+2 from last month' },
            { title: 'Leave Balance', value: employee.leaveBalance?.remaining?.toString() || '30', subtitle: 'Days Remaining', icon: Calendar, color: 'from-blue-500 to-blue-600', change: `${employee.leaveBalance?.total || 30} total allocated` },
            { title: 'Current Salary', value: `₹${employee.salaryInfo?.basicSalary?.toLocaleString() || '60,000'}`, subtitle: 'Basic Salary', icon: DollarSign, color: 'from-purple-500 to-purple-600', change: 'Monthly' },
            { title: 'Years of Service', value: employee.yearsOfService?.toString() || '0', subtitle: 'Years', icon: Target, color: 'from-pink-500 to-pink-600', change: `Since ${employee.workInfo?.joiningDate ? new Date(employee.workInfo.joiningDate).getFullYear() : 'N/A'}` }
          ];
          setDashboardStats(stats);
        } else {
          console.error('Failed to fetch employee profile:', profileResponse);
          toast.error('Unable to load your profile data');
          setDefaultStats();
        }

        try {
          const attendanceResponse = await attendanceAPI.getTodayAttendance();
          if (attendanceResponse.data.success) {
            const data = attendanceResponse.data;
            setTodayAttendance(data.data);
            setHasCheckedIn(data.hasCheckedIn);
            setHasCheckedOut(data.hasCheckedOut);
          }
        } catch (error) {
          if (error.response?.status !== 404) {
            console.error('Error fetching today attendance:', error);
          }
        }
      } catch (error) {
        console.error('Error fetching employee ', error);
        if (error.response?.status === 401) {
          toast.error('Session expired. Please login again.');
        } else if (error.response?.status === 403) {
          toast.error('Access denied. Please contact HR.');
        } else if (error.response?.status === 404) {
          toast.error('Employee profile not found. Please contact HR.');
        } else {
          toast.error('Unable to load dashboard data.');
        }
        setDefaultStats();
      } finally {
        setLoading(false);
      }
    };
    fetchEmployeeData();
  }, []);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const position = await geolocationUtils.getCurrentPosition();
      const addressData = await geolocationUtils.getAddressFromCoords(position.latitude, position.longitude);
      // Format address as string for display
      const addressString = typeof addressData === 'object' ? addressData.address : addressData;
      setLocation({ ...position, address: addressString });
    } catch (error) {
      console.error('Location error:', error);
    }
  };

  const setDefaultStats = () => {
    setDashboardStats([
      { title: 'Days Present', value: '22', subtitle: 'This Month', icon: CheckCircle, color: 'from-green-500 to-green-600', change: '+2 from last month' },
      { title: 'Leave Balance', value: '30', subtitle: 'Days Remaining', icon: Calendar, color: 'from-blue-500 to-blue-600', change: '30 total allocated' },
      { title: 'Current Salary', value: '₹60,000', subtitle: 'Basic Salary', icon: DollarSign, color: 'from-purple-500 to-purple-600', change: 'Monthly' },
      { title: 'Years of Service', value: '0', subtitle: 'Years', icon: Target, color: 'from-pink-500 to-pink-600', change: 'New Employee' }
    ]);
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Real-time working time counter
  useEffect(() => {
    let interval;
    if (hasCheckedIn && !hasCheckedOut && todayAttendance?.checkInTime) {
      interval = setInterval(() => {
        const checkInTime = new Date(todayAttendance.checkInTime);
        const now = new Date();
        const diffMs = now - checkInTime;
        const minutes = Math.floor(diffMs / (1000 * 60));
        setRealTimeWorkingTime(minutes);
      }, 1000);
    } else {
      setRealTimeWorkingTime(0);
    }
    return () => clearInterval(interval);
  }, [hasCheckedIn, hasCheckedOut, todayAttendance]);

  useEffect(() => {
    if (!showBotModal) {
      setBotMessages([]);
      setNewBotMessage('');
      setLoadingBot(false);
      if (botTimeoutRef.current) {
        clearTimeout(botTimeoutRef.current);
        botTimeoutRef.current = null;
      }
    }
  }, [showBotModal]);

  useEffect(() => {
    if (showBotModal && employeeData && botMessages.length === 0) {
      setBotMessages([
        {
          _id: 'welcome',
          from: null,
          to: employeeData.id,
          text: 'Hello! I am your HR Assistant. How can I help you today? You can ask for salary slip, leave status, or any HR related query.',
          timestamp: new Date(),
          self: false,
          fromBot: true
        }
      ]);
    }
  }, [showBotModal, employeeData]);

  const handlePdfDownload = async (url) => {
    try {
      const filename = url.split('/').pop();
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      toast.success('Document downloaded successfully!');
    } catch (error) {
      console.error('PDF download error:', error);
      toast.error('Failed to download document. Please try again.');
    }
  };

  const renderMessageText = (text) => {
    const urlRegex = /(\/api\/bot\/download\/[a-zA-Z0-9_-]+\.pdf)/g;
    const parts = text.split(urlRegex);
    
    return parts.map((part, i) => {
      if (urlRegex.test(part)) {
        return (
          <button
            key={i}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handlePdfDownload(part);
            }}
            className="text-blue-400 underline hover:text-blue-300 break-all bg-transparent border-0 cursor-pointer text-left p-0 font-medium"
          >
            📄 Download Document
          </button>
        );
      }
      return part;
    });
  };

  // ✅ FIXED: Connect to /employee namespace
  useEffect(() => {
    if ((showChatModal || showBotModal) && employeeData && !socketRef.current) {
      const fetchPeers = async () => {
        if (showChatModal) {
          try {
            const res = await employeeAPI.getEmployees();
            if (res.data.success) {
              const others = res.data.data.employees.filter(emp => emp._id !== employeeData._id);
              setPeers(others);
              if (others.length > 0 && !selectedPeer) {
                setSelectedPeer(others[0]);
              }
            }
          } catch (err) {
            console.error('Failed to load peers:', err);
            toast.error('Could not load employee list for chat');
          }
        }
      };
      fetchPeers();

      // Connect via relative path - Vite will proxy this
      const socket = io('/employee', {
        auth: { token: localStorage.getItem('token') },
        transports: ['websocket']
      });

      socket.emit('join', {
        userId: employeeData.id,
        name: `${employeeData.personalInfo.firstName} ${employeeData.personalInfo.lastName}`
      });

      const handleMessage = (msg) => {
        if (!msg.self && msg.to === employeeData.id) {
          if (msg.fromBot) {
            setBotMessages(prev => {
              if (prev.some(m => m._id === msg._id)) return prev;
              return [...prev, msg];
            });
            setLoadingBot(false);
            if (botTimeoutRef.current) {
              clearTimeout(botTimeoutRef.current);
              botTimeoutRef.current = null;
            }
          } else {
            setChatMessages(prev => {
              if (prev.some(m => m._id === msg._id)) return prev;
              return [...prev, msg];
            });
          }
        }
      };

      socket.on('message', handleMessage);
      socketRef.current = socket;

      return () => {
        socket.off('message', handleMessage);
        socket.disconnect();
        socketRef.current = null;
      };
    }
  }, [showChatModal, showBotModal, employeeData]);

  useEffect(() => {
    if (selectedPeer && employeeData) {
      const loadChatHistory = async () => {
        setLoadingChat(true);
        try {
          const response = await employeeAPI.get(`/messages/history/${selectedPeer.user._id}`);
          if (response.data.success) {
            const normalized = response.data.data.map(msg => ({
              _id: msg._id,
              from: msg.from._id,
              fromName: msg.from.fullName || `${msg.from.personalInfo?.firstName} ${msg.from.personalInfo?.lastName}`,
              to: msg.to._id,
              text: msg.text,
              timestamp: msg.timestamp,
              self: msg.from._id === employeeData.id
            }));
            setChatMessages(normalized);
          }
        } catch (err) {
          console.error('Failed to load chat history:', err);
          toast.error('Could not load chat history');
        } finally {
          setLoadingChat(false);
        }
      };
      loadChatHistory();
    } else {
      setChatMessages([]);
    }
  }, [selectedPeer, employeeData]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedPeer) return;

    const message = {
      from: employeeData.id,
      fromName: `${employeeData.personalInfo.firstName} ${employeeData.personalInfo.lastName}`,
      to: selectedPeer.user._id,
      text: newMessage.trim(),
      timestamp: new Date().toISOString()
    };

    const tempId = 'temp-' + Date.now();
    setChatMessages(prev => [...prev, { ...message, _id: tempId, self: true }]);

    try {
      if (socketRef.current) {
        socketRef.current.emit('message', message);
      } else {
        await employeeAPI.post('/messages', { to: selectedPeer.user._id, text: message.text });
      }
    } catch (err) {
      setChatMessages(prev => prev.filter(m => m._id !== tempId));
      toast.error('Failed to send message');
    }
    setNewMessage('');
  };

  const sendBotMessage = async () => {
    if (!newBotMessage.trim()) return;

    const userMessage = {
      from: employeeData.id,
      to: employeeData.id,
      text: newBotMessage.trim(),
      timestamp: new Date().toISOString(),
      self: true
    };

    const tempId = 'temp-' + Date.now();
    setBotMessages(prev => [...prev, { ...userMessage, _id: tempId }]);
    setLoadingBot(true);

    botTimeoutRef.current = setTimeout(() => {
      setLoadingBot(false);
      botTimeoutRef.current = null;
      toast.error('Bot is taking longer than expected. Please try again.');
    }, 10000);

    try {
      const response = await API.post('/bot/message', {
        text: newBotMessage.trim(),
        userId: employeeData.id
      });

      if (response.data.success) {
        const botMessage = {
          _id: 'bot-' + Date.now(),
          from: null,
          to: employeeData.id,
          text: response.data.response,
          timestamp: new Date().toISOString(),
          self: false,
          fromBot: true
        };
        setBotMessages(prev => [...prev, botMessage]);
      } else {
        toast.error('Failed to get bot response');
      }
    } catch (err) {
      console.error('Bot message error:', err);
      toast.error('Failed to send message to bot');
    } finally {
      setLoadingBot(false);
      if (botTimeoutRef.current) {
        clearTimeout(botTimeoutRef.current);
        botTimeoutRef.current = null;
      }
    }
    setNewBotMessage('');
  };

  const markAttendance = async () => {
    if (!location) {
      toast.error('Location is required for attendance. Please enable location services.');
      getCurrentLocation();
      return;
    }

    try {
      setAttendanceLoading(true);
      const deviceInfo = geolocationUtils.getDeviceInfo();
      // Format location with address as string (not object)
      const formattedLocation = {
        ...location,
        address: typeof location.address === 'object' ? location.address.address : location.address
      };
      const attendanceData = { location: formattedLocation, deviceInfo, notes: 'Check-in via employee dashboard' };
      const response = await attendanceAPI.checkIn(attendanceData);
      if (response.data.success) {
        toast.success('Attendance marked successfully!');
        setTodayAttendance(response.data.data);
        setHasCheckedIn(true);
      }
    } catch (error) {
      console.error('Attendance marking error:', error);
      toast.error(error.response?.data?.message || 'Failed to mark attendance');
    } finally {
      setAttendanceLoading(false);
    }
  };

  const recentNotices = [
    { id: 1, title: "Company Holiday Announcement", message: "Office will be closed on October 15th for Diwali festival.", date: "2024-10-10", priority: "High" },
    { id: 2, title: "New HR Policy Update", message: "Please review the updated attendance policy.", date: "2024-10-08", priority: "Medium" },
    { id: 3, title: "Team Meeting Scheduled", message: "Monthly team sync meeting scheduled for tomorrow at 2 PM.", date: "2024-10-09", priority: "Medium" }
  ];

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'completed': case 'on track': return 'text-green-400 bg-green-400/20';
      case 'in progress': case 'nearly complete': return 'text-yellow-400 bg-yellow-400/20';
      case 'pending': case 'not started': return 'text-red-400 bg-red-400/20';
      default: return 'text-secondary-400 bg-secondary-400/20';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'text-red-400 bg-red-400/20';
      case 'medium': return 'text-yellow-400 bg-yellow-400/20';
      case 'low': return 'text-green-400 bg-green-400/20';
      default: return 'text-secondary-400 bg-secondary-400/20';
    }
  };

  if (loading) {
    return (
      <EmployeeLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-white">Loading your dashboard...</div>
        </div>
      </EmployeeLayout>
    );
  }

  const displayName = employeeData?.personalInfo ? 
    `${employeeData.personalInfo.firstName} ${employeeData.personalInfo.lastName}` : 
    employeeData?.fullName || 'Employee';
  const displayPosition = employeeData?.workInfo?.position || 'Employee';
  const displayDepartment = employeeData?.workInfo?.department || 'General';
  const displayEmployeeId = employeeData?.employeeId || employeeData?.user?.employeeId || 'N/A';

  const ChatModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[1000] p-4">
      <div className="bg-gray-900 neon-border rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-secondary-700">
          <h2 className="text-xl font-bold text-white flex items-center">
            <MessageCircle className="w-5 h-5 mr-2 text-neon-pink" />
            Employee Chat
          </h2>
          <button onClick={() => setShowChatModal(false)} className="text-secondary-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-1/3 border-r border-secondary-700 overflow-y-auto">
            <div className="p-3 text-sm text-secondary-400 font-medium">Colleagues</div>
            {peers.map(peer => (
              <div
                key={peer._id}
                onClick={() => setSelectedPeer(peer)}
                className={`p-3 border-l-4 cursor-pointer transition-colors ${
                  selectedPeer?._id === peer._id
                    ? 'border-neon-pink bg-secondary-800/50 text-white'
                    : 'border-transparent text-secondary-400 hover:bg-secondary-800/30'
                }`}
              >
                <div className="font-medium">{peer.fullName || `${peer.personalInfo?.firstName} ${peer.personalInfo?.lastName}`}</div>
                <div className="text-xs text-secondary-500">{peer.workInfo?.position || 'Employee'}</div>
              </div>
            ))}
          </div>

          <div className="flex-1 flex flex-col">
            {selectedPeer ? (
              <>
                <div className="p-3 border-b border-secondary-700 bg-secondary-800/30">
                  <div className="font-bold text-white">{selectedPeer.fullName || `${selectedPeer.personalInfo?.firstName} ${selectedPeer.personalInfo?.lastName}`}</div>
                  <div className="text-sm text-secondary-400">{selectedPeer.workInfo?.position}</div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-secondary-900/30 relative">
                  {loadingChat ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-secondary-500">Loading chat history...</div>
                    </div>
                  ) : (
                    <>
                      {chatMessages
                        .filter(msg =>
                          (msg.from === employeeData.id && msg.to === selectedPeer.user._id) ||
                          (msg.to === employeeData.id && msg.from === selectedPeer.user._id)
                        )
                        .map((msg, idx) => (
                          <div
                            key={msg._id || idx}
                            className={`max-w-xs md:max-w-md p-3 rounded-lg ${
                              msg.self
                                ? 'ml-auto bg-gradient-to-r from-neon-pink to-neon-purple text-white'
                                : 'mr-auto bg-secondary-800 text-white'
                            }`}
                          >
                            <div className="text-sm">{msg.text}</div>
                            <div className={`text-xs mt-1 ${msg.self ? 'text-pink-200' : 'text-secondary-400'}`}>
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        ))}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>
                <div className="p-3 border-t border-secondary-700">
                  <div className="flex">
                    <input
                      key="chat-input"
                      type="text"
                      value={newMessage}
                      onChange={handleChatMessageChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      placeholder="Type a message..."
                      className="flex-1 px-4 py-2 bg-secondary-800 border border-secondary-600 rounded-l-lg text-white focus:outline-none focus:ring-1 focus:ring-neon-pink"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!newMessage.trim()}
                      className="px-4 bg-gradient-to-r from-neon-pink to-neon-purple text-white rounded-r-lg disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-secondary-500">
                Select a colleague to start chatting
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const BotModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[1000] p-4">
      <div className="bg-gray-900 neon-border rounded-2xl w-full max-w-md h-[70vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-secondary-700">
          <h2 className="text-xl font-bold text-white flex items-center">
            <Bot className="w-5 h-5 mr-2 text-blue-400" />
            HR Assistant
          </h2>
          <button onClick={() => setShowBotModal(false)} className="text-secondary-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div
          ref={botMessagesContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-3 bg-secondary-900/30 relative"
          onScroll={(e) => {
            const { scrollTop, clientHeight, scrollHeight } = botMessagesContainerRef.current;
            isUserScrolledUp.current = scrollTop + clientHeight < scrollHeight - 50;
          }}
        >
          {loadingBot ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-secondary-500 flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400 mr-2"></div>
                Bot is thinking...
              </div>
            </div>
          ) : (
            <>
              {botMessages.map((msg, idx) => (
                <div
                  key={msg._id || idx}
                  className={`max-w-xs p-3 rounded-lg ${
                    msg.self
                      ? 'ml-auto bg-gradient-to-r from-neon-pink to-neon-purple text-white'
                      : msg.fromBot
                        ? 'mr-auto bg-blue-600/20 border border-blue-500/30 text-white'
                        : 'mr-auto bg-secondary-800 text-white'
                  }`}
                >
                  <div className="text-sm">
                    {renderMessageText(msg.text)}
                  </div>
                  <div className={`text-xs mt-1 ${msg.self ? 'text-pink-200' : 'text-blue-200'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
              <div ref={botMessagesEndRef} />
            </>
          )}
        </div>
        <div className="p-3 border-t border-secondary-700">
          <div className="flex">
            <input
              key="bot-input"
              type="text"
              value={newBotMessage}
              onChange={handleBotMessageChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendBotMessage();
                }
              }}
              placeholder="Ask HR Assistant..."
              className="flex-1 px-4 py-2 bg-secondary-800 border border-secondary-600 rounded-l-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-400"
              disabled={loadingBot}
              autoFocus
            />
            <button
              onClick={sendBotMessage}
              disabled={!newBotMessage.trim() || loadingBot}
              className="px-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-r-lg disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <EmployeeLayout employeeData={employeeData}>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="glass-morphism neon-border rounded-2xl p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-r from-neon-pink to-neon-purple rounded-2xl flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">
                  Welcome, <span className="neon-text">{displayName}!</span>
                </h1>
                <p className="text-secondary-400">{displayPosition} • {displayDepartment}</p>
                <p className="text-sm text-neon-pink">Employee ID: {displayEmployeeId}</p>
              </div>
            </div>
            <div className="mt-4 md:mt-0 text-right">
              <p className="text-lg font-semibold text-white">{currentTime.toLocaleTimeString()}</p>
              <p className="text-secondary-400">
                {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        {dashboardStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {dashboardStats.map((stat, index) => (
              <div key={index} className="glass-morphism neon-border rounded-2xl p-6 hover-glow">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 bg-gradient-to-r ${stat.color} rounded-lg flex items-center justify-center`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-1">{stat.value}</h3>
                  <p className="text-secondary-400 text-sm mb-2">{stat.title}</p>
                  <p className="text-xs text-neon-pink">{stat.change}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Attendance Section */}
        <div className="glass-morphism neon-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Today's Attendance</h2>
            <Clock className="w-5 h-5 text-neon-pink" />
          </div>
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div className="flex items-center space-x-4 mb-4 md:mb-0">
              <div className={`w-4 h-4 rounded-full ${hasCheckedIn ? 'bg-green-400' : 'bg-red-400'} animate-pulse`}></div>
              <div>
                <p className="text-white font-medium">
                  Status: <span className={hasCheckedIn ? 'text-green-400' : 'text-red-400'}>
                    {hasCheckedIn ? (hasCheckedOut ? 'Completed for today' : 'Checked In') : 'Not Marked'}
                  </span>
                </p>
                {todayAttendance && (
                  <div className="text-sm text-secondary-400 space-y-1">
                    {todayAttendance.checkInTime && <p>Check-in: {new Date(todayAttendance.checkInTime).toLocaleTimeString()}</p>}
                    {hasCheckedIn && !hasCheckedOut && realTimeWorkingTime > 0 && (
                      <p className="text-green-400">Working Time: {Math.floor(realTimeWorkingTime / 60)}h {realTimeWorkingTime % 60}m</p>
                    )}
                    {todayAttendance.checkOutTime && <p>Check-out: {new Date(todayAttendance.checkOutTime).toLocaleTimeString()}</p>}
                  </div>
                )}
                {location && (
                  <p className="text-xs text-secondary-400 flex items-center mt-1">
                    <MapPin className="w-3 h-3 mr-1" /> Location ready
                  </p>
                )}
              </div>
            </div>
            {!hasCheckedIn && (
              <div className="flex flex-col space-y-2">
                {!location && (
                  <button onClick={getCurrentLocation} className="px-4 py-2 bg-secondary-700 hover:bg-secondary-600 text-white text-sm rounded-lg">
                    Get Location
                  </button>
                )}
                <button
                  onClick={markAttendance}
                  disabled={!location || attendanceLoading}
                  className="px-6 py-3 bg-gradient-to-r from-neon-pink to-neon-purple text-white font-semibold rounded-lg hover-glow transition-all duration-300 flex items-center disabled:opacity-50"
                >
                  <MapPin className="w-4 h-4 mr-2" /> {attendanceLoading ? 'Marking...' : 'Mark Attendance'}
                </button>
              </div>
            )}
            {hasCheckedIn && !hasCheckedOut && (
              <button
                onClick={() => window.location.href = '/employee/attendance'}
                className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-lg hover-glow"
              >
                <Clock className="w-4 h-4 mr-2" /> Check Out
              </button>
            )}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-morphism neon-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Profile Summary</h2>
              <User className="w-5 h-5 text-neon-pink" />
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-secondary-800/30 rounded-lg">
                <span className="text-secondary-400">Employee ID</span>
                <span className="text-white font-medium">{displayEmployeeId}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-secondary-800/30 rounded-lg">
                <span className="text-secondary-400">Department</span>
                <span className="text-white font-medium">{displayDepartment}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-secondary-800/30 rounded-lg">
                <span className="text-secondary-400">Join Date</span>
                <span className="text-white font-medium">
                  {employeeData?.workInfo?.joiningDate ? new Date(employeeData.workInfo.joiningDate).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-secondary-800/30 rounded-lg">
                <span className="text-secondary-400">Email</span>
                <span className="text-white font-medium">{employeeData?.contactInfo?.personalEmail || employeeData?.user?.email || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-secondary-800/30 rounded-lg">
                <span className="text-secondary-400">Phone</span>
                <span className="text-white font-medium">{employeeData?.contactInfo?.phone || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="glass-morphism neon-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Latest Notices</h2>
              <Bell className="w-5 h-5 text-neon-purple" />
            </div>
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {recentNotices.map((notice) => (
                <div key={notice.id} className="p-4 border border-secondary-600 rounded-lg hover:border-neon-pink/30">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-white font-medium">{notice.title}</h4>
                    <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(notice.priority)}`}>
                      {notice.priority}
                    </span>
                  </div>
                  <p className="text-secondary-400 text-sm mb-2">{notice.message}</p>
                  <p className="text-xs text-neon-pink">{new Date(notice.date).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="glass-morphism neon-border rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-6">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <button 
              onClick={() => window.location.href = '/employee/attendance'}
              className="p-4 rounded-lg border-2 border-dashed border-secondary-600 hover:border-neon-pink/50 hover:bg-neon-pink/5 group"
            >
              <Clock className="w-8 h-8 text-secondary-400 group-hover:text-neon-pink mx-auto mb-2" />
              <p className="text-sm text-secondary-400 group-hover:text-white">My Attendance</p>
            </button>
            <button 
              onClick={() => window.location.href = '/employee/leaves'}
              className="p-4 rounded-lg border-2 border-dashed border-secondary-600 hover:border-neon-purple/50 hover:bg-neon-purple/5 group"
            >
              <Calendar className="w-8 h-8 text-secondary-400 group-hover:text-neon-purple mx-auto mb-2" />
              <p className="text-sm text-secondary-400 group-hover:text-white">Apply Leave</p>
            </button>
            <button className="p-4 rounded-lg border-2 border-dashed border-secondary-600 hover:border-neon-pink/50 hover:bg-neon-pink/5 group">
              <FileText className="w-8 h-8 text-secondary-400 group-hover:text-neon-pink mx-auto mb-2" />
              <p className="text-sm text-secondary-400 group-hover:text-white">View Payslip</p>
            </button>
            <button 
              onClick={() => setShowChatModal(true)}
              className="p-4 rounded-lg border-2 border-dashed border-secondary-600 hover:border-neon-purple/50 hover:bg-neon-purple/5 group"
            >
              <MessageCircle className="w-8 h-8 text-secondary-400 group-hover:text-neon-purple mx-auto mb-2" />
              <p className="text-sm text-secondary-400 group-hover:text-white">Chat with Team</p>
            </button>
            <button 
              onClick={() => setShowBotModal(true)}
              className="p-4 rounded-lg border-2 border-dashed border-secondary-600 hover:border-blue-500/50 hover:bg-blue-500/5 group"
            >
              <Bot className="w-8 h-8 text-secondary-400 group-hover:text-blue-400 mx-auto mb-2" />
              <p className="text-sm text-secondary-400 group-hover:text-white">HR Bot</p>
            </button>
          </div>
        </div>

        {showChatModal && <ChatModal />}
        {showBotModal && <BotModal />}
      </div>
    </EmployeeLayout>
  );
};

export default EmployeeDashboard;