import React, { useState, useEffect, useRef } from "react";
import { appClient } from "@/api/appClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, MessageSquare, Send, AlertCircle, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function CollaborationPanel({ sessionId, currentUser }) {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  // Fetch active session
  const { data: session } = useQuery({
    queryKey: ['triageSession', sessionId],
    queryFn: () => appClient.entities.TriageSession.filter({ session_id: sessionId }, '-created_date', 1)
      .then(sessions => sessions[0]),
    enabled: !!sessionId,
    refetchInterval: 3000, // Poll every 3 seconds as fallback
  });

  // Fetch chat messages
  const { data: messages = [] } = useQuery({
    queryKey: ['triageChatMessages', sessionId],
    queryFn: () => appClient.entities.TriageChatMessage.filter({ session_id: sessionId }, 'created_date'),
    enabled: !!sessionId,
    refetchInterval: 2000,
  });

  // Subscribe to real-time updates
  useEffect(() => {
    if (!sessionId) return;

    const unsubscribeMessages = appClient.entities.TriageChatMessage.subscribe((event) => {
      if (event.data.session_id === sessionId) {
        queryClient.invalidateQueries({ queryKey: ['triageChatMessages', sessionId] });
      }
    });

    const unsubscribeSession = appClient.entities.TriageSession.subscribe((event) => {
      if (event.data.session_id === sessionId) {
        queryClient.invalidateQueries({ queryKey: ['triageSession', sessionId] });
      }
    });

    return () => {
      unsubscribeMessages();
      unsubscribeSession();
    };
  }, [sessionId, queryClient]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Update viewer presence
  useEffect(() => {
    if (!session || !currentUser) return;

    const updatePresence = async () => {
      const viewers = session.active_viewers || [];
      const existingViewer = viewers.find(v => v.email === currentUser.email);
      
      if (!existingViewer) {
        const updatedViewers = [
          ...viewers,
          {
            email: currentUser.email,
            name: currentUser.full_name,
            role: currentUser.role,
            joined_at: new Date().toISOString()
          }
        ];

        try {
          await appClient.entities.TriageSession.update(session.id, {
            active_viewers: updatedViewers
          });
        } catch (error) {
          console.error('Failed to update presence:', error);
        }
      }
    };

    updatePresence();
  }, [session, currentUser]);

  const sendMessageMutation = useMutation({
    mutationFn: (messageData) => appClient.entities.TriageChatMessage.create(messageData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['triageChatMessages', sessionId] });
      setMessage("");
      setIsTyping(false);
    },
  });

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message.trim() || !currentUser) return;

    const isUrgent = message.includes('URGENT') || message.includes('!!!');
    const mentions = message.match(/@(\S+)/g)?.map(m => m.substring(1)) || [];

    sendMessageMutation.mutate({
      session_id: sessionId,
      sender_email: currentUser.email,
      sender_name: currentUser.full_name,
      message: message.trim(),
      message_type: isUrgent ? 'alert' : 'text',
      mentions: mentions,
      is_urgent: isUrgent
    });
  };

  if (!sessionId || !session) return null;

  const activeViewers = session.active_viewers || [];
  const otherViewers = activeViewers.filter(v => v.email !== currentUser?.email);

  return (
    <Card className="border h-full flex flex-col" style={{ borderColor: '#60A5FA', backgroundColor: '#374151', maxHeight: '600px' }}>
      <CardHeader className="border-b pb-3" style={{ borderColor: '#60A5FA' }}>
        <CardTitle className="flex items-center justify-between" style={{ color: '#60A5FA' }}>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            <span>Team Collaboration</span>
          </div>
          <Badge style={{ backgroundColor: '#10B981', color: '#FFF' }}>
            <Eye className="w-3 h-3 mr-1" />
            {activeViewers.length} viewing
          </Badge>
        </CardTitle>
        
        {/* Active Viewers */}
        <div className="flex flex-wrap gap-2 mt-2">
          {activeViewers.map((viewer) => (
            <Badge
              key={viewer.email}
              variant="outline"
              className="flex items-center gap-1"
              style={{
                borderColor: viewer.email === session.coordinator_email ? '#F59E0B' : '#60A5FA',
                color: '#60A5FA'
              }}
            >
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              {viewer.name}
              {viewer.email === session.coordinator_email && ' (Lead)'}
            </Badge>
          ))}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-4 overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-3" style={{ minHeight: '200px', maxHeight: '400px' }}>
          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`p-3 rounded-lg ${msg.sender_email === currentUser?.email ? 'ml-8' : 'mr-8'}`}
                style={{
                  backgroundColor: msg.message_type === 'alert' ? '#7F1D1D' :
                                 msg.message_type === 'system' ? '#1E3A8A' :
                                 msg.sender_email === currentUser?.email ? '#4B5563' : '#374151',
                  borderLeft: msg.is_urgent ? '4px solid #EF4444' : 'none'
                }}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="font-semibold text-sm" style={{ color: '#60A5FA' }}>
                    {msg.sender_name}
                  </span>
                  <span className="text-xs" style={{ color: '#9CA3AF' }}>
                    {new Date(msg.created_date).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm" style={{ color: '#D1D5DB' }}>
                  {msg.is_urgent && <AlertCircle className="w-4 h-4 inline mr-1 text-red-500" />}
                  {msg.message}
                </p>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              setIsTyping(e.target.value.length > 0);
            }}
            placeholder="Type a message... (use @name to mention, URGENT for alerts)"
            className="flex-1"
            style={{ borderColor: '#60A5FA', backgroundColor: '#4B5563', color: '#60A5FA' }}
          />
          <Button
            type="submit"
            disabled={!message.trim() || sendMessageMutation.isPending}
            style={{ backgroundColor: '#60A5FA', color: '#000000' }}
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>

        {/* Typing Indicator */}
        {isTyping && otherViewers.length > 0 && (
          <p className="text-xs mt-2" style={{ color: '#9CA3AF' }}>
            <MessageSquare className="w-3 h-3 inline mr-1" />
            You're composing a message...
          </p>
        )}
      </CardContent>
    </Card>
  );
}