import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePortalStore } from '../store/portalStore';
import { MessageCircle, Send, ChevronRight, Clock, CheckCircle2, User, FileText } from 'lucide-react';
import { notify } from '../components/AnimatedNotification';
import PortalEmptyState from './components/PortalEmptyState';
import PortalSkeleton from './components/PortalSkeleton';

export default function PortalSupportChat() {
    const { id } = useParams();
    const { t, i18n } = useTranslation('portal');
    const { fetchSupportMessageById, replyToSupportMessage } = usePortalStore();
    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [replyText, setReplyText] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);

    const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';

    useEffect(() => {
        loadTicket();
    }, [id]);

    useEffect(() => {
        scrollToBottom();
    }, [ticket]);

    const loadTicket = async () => {
        setLoading(true);
        const data = await fetchSupportMessageById(id);
        if (data) {
            setTicket(data);
        } else {
            notify.error(t('supportChat.not_found'));
        }
        setLoading(false);
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSendReply = async (e) => {
        e.preventDefault();
        if (!replyText.trim()) return;

        setSending(true);
        const res = await replyToSupportMessage(id, replyText);
        if (res.success) {
            setReplyText('');
            setTicket(res.data);
            notify.success(res.message);
        } else {
            notify.error(res.message);
        }
        setSending(false);
    };

    if (loading) {
        return (
            <div className="pt-10 px-4" dir={i18n.dir()}>
                <PortalSkeleton count={4} type="card" />
            </div>
        );
    }

    if (!ticket) {
        return (
            <div className="pt-10" dir={i18n.dir()}>
                <PortalEmptyState
                    icon={FileText}
                    title={t('supportChat.not_found')}
                    message={t('supportChat.not_found_desc')}
                    actionText={t('supportChat.back_to_support')}
                    onAction={() => window.location.href = '/portal/support-messages'}
                    className="my-8"
                />
            </div>
        );
    }

    const isClosed = ticket.status === 'closed';

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-100px)] lg:h-[calc(100vh-80px)] -mx-4 md:mx-0 overflow-hidden app-text-soft" dir={i18n.dir()}>
            {/* Header */}
            <div className="app-surface border-b border-gray-100/80 dark:border-white/10 px-4 py-3 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
                <Link to="/portal/support-messages" className="p-2 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] rounded-full transition-colors text-gray-500">
                    <ChevronRight className="w-6 h-6" />
                </Link>
                <div className="flex-1 min-w-0">
                    <h2 className="font-bold text-gray-900 dark:text-white truncate">{ticket.subject}</h2>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full ${isClosed ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' : 'bg-primary-50 text-primary-600 dark:bg-primary-900/30'}`}>
                            {isClosed ? t('supportChat.closed') : t('supportChat.open')}
                        </span>
                        <span className="text-xs text-gray-500">#{ticket._id.substring(ticket._id.length - 6)}</span>
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <div className="app-surface-muted flex-1 overflow-y-auto p-4 space-y-6 pb-20">
                {/* Original Message */}
                <div className="flex flex-col gap-1 items-start">
                    <div className="app-surface border border-gray-100/80 dark:border-white/10 rounded-2xl p-4 shadow-sm max-w-[85%] md:max-w-[75%] rtl:rounded-tr-sm ltr:rounded-tl-sm">
                        <p className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200">{ticket.message}</p>
                        <span className="text-[10px] text-gray-400 mt-2 block text-left">
                            {new Date(ticket.createdAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                </div>

                {/* Replies */}
                {ticket.replies?.map((reply, idx) => {
                    const isCustomer = reply.sender === 'customer';
                    return (
                        <div key={idx} className={`flex flex-col gap-1 ${isCustomer ? 'items-start' : 'items-end'}`}>
                            <div className={`max-w-[85%] md:max-w-[75%] p-4 rounded-2xl shadow-sm ${isCustomer
                                ? 'app-surface border border-gray-100/80 dark:border-white/10 rtl:rounded-tr-sm ltr:rounded-tl-sm'
                                : 'bg-primary-500 text-white rtl:rounded-tl-sm ltr:rounded-tr-sm'
                                }`}>
                                <p className={`whitespace-pre-wrap text-sm ${isCustomer ? 'text-gray-800 dark:text-gray-200' : 'text-white'}`}>
                                    {reply.message}
                                </p>
                                <span className={`text-[10px] mt-2 block ${isCustomer ? 'text-gray-400 text-left' : 'text-primary-100 text-right'}`}>
                                    {new Date(reply.createdAt || Date.now()).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            {!isCustomer && (
                                <span className="text-[10px] text-gray-500 px-2 flex items-center gap-1">
                                    <MessageCircle className="w-3 h-3" /> {t('supportChat.support_team')}
                                </span>
                            )}
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            {isClosed ? (
                <div className="app-surface-muted border-t border-gray-200/80 dark:border-white/10 p-4 text-center">
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-5 h-5" />
                        {t('supportChat.closed_message')}
                    </p>
                </div>
            ) : (
                <div className="app-surface border-t border-gray-100/80 dark:border-white/10 p-3 sm:p-4">
                    <form onSubmit={handleSendReply} className="flex items-end gap-2">
                        <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder={t('supportChat.reply_placeholder')}
                            className="app-surface-muted flex-1 max-h-32 min-h-[44px] rounded-2xl border border-transparent px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none transition-colors"
                            rows={1}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendReply(e);
                                }
                            }}
                        />
                        <button
                            type="submit"
                            disabled={sending || !replyText.trim()}
                            className="w-12 h-12 rounded-full bg-primary-500 text-white flex items-center justify-center flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-600 transition"
                        >
                            {sending ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Send className="w-5 h-5" style={{ transform: i18n.dir() === 'rtl' ? 'rotate(180deg)' : 'none' }} />
                            )}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
