import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, Check, Inbox, ChevronRight } from 'lucide-react';
import { StudentRecord } from '../../types/student';
import {
  subscribeToStudents,
  markEnquiryAsRead,
  markAllEnquiriesAsRead,
} from '../../services/studentService';

// Human-readable relative time helper (e.g. "2 minutes ago", "15 minutes ago", "Just now")
function getRelativeTime(isoString?: string): string {
  if (!isoString) return 'Just now';
  const timestamp = new Date(isoString).getTime();
  if (isNaN(timestamp)) return 'Just now';
  const diffInSeconds = Math.floor((Date.now() - timestamp) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  const minutes = Math.floor(diffInSeconds / 60);
  if (minutes === 1) return '1 minute ago';
  if (minutes < 60) return `${minutes} minutes ago`;

  const hours = Math.floor(minutes / 60);
  if (hours === 1) return '1 hour ago';
  if (hours < 24) return `${hours} hours ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;

  return new Date(timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

export interface NotificationBellProps {
  students?: StudentRecord[];
  onSelectStudent?: (student: StudentRecord) => void;
  onViewAllApplications?: () => void;
  theme?: 'dark' | 'light';
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  students: externalStudents,
  onSelectStudent,
  onViewAllApplications,
  theme = 'light',
}) => {
  const [internalStudents, setInternalStudents] = useState<StudentRecord[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // If external students list is not provided, subscribe directly to Firestore /students in real time
  useEffect(() => {
    if (externalStudents !== undefined) return;
    const unsubscribe = subscribeToStudents(
      (records) => setInternalStudents(records),
      (err) => console.warn('NotificationBell Firestore listener:', err)
    );
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [externalStudents]);

  const activeStudents = externalStudents ?? internalStudents;

  // Count ONLY student documents where unread === true
  // Historical applications without unread or where unread !== true are NOT counted.
  const unreadStudents = activeStudents.filter((s) => s.unread === true);
  const unreadCount = unreadStudents.length;

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleOpenStudent = async (student: StudentRecord) => {
    setIsOpen(false);
    if (student.id && student.unread === true) {
      await markEnquiryAsRead(student.id, true);
    }
    onSelectStudent?.(student);
  };

  const handleMarkAllAsRead = async () => {
    const unreadIds = unreadStudents.map((s) => s.id).filter(Boolean) as string[];
    if (unreadIds.length === 0) return;
    await markAllEnquiriesAsRead(unreadIds);
    setIsOpen(false);
  };

  const handleQuickMarkAsRead = async (e: React.MouseEvent, studentId: string) => {
    e.stopPropagation();
    await markEnquiryAsRead(studentId, true);
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* 🔔 Notification Bell Button */}
      <button
        type="button"
        id="btn-staff-notification-bell"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`relative p-2 rounded-lg transition-all flex items-center justify-center cursor-pointer ${
          theme === 'dark'
            ? unreadCount > 0
              ? 'bg-amber-500/20 text-[#F5821F] hover:bg-amber-500/30 border border-amber-500/40 ring-1 ring-amber-500/30'
              : 'text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/60'
            : unreadCount > 0
            ? 'bg-amber-50 text-[#F5821F] hover:bg-amber-100 border border-amber-300 shadow-2xs ring-1 ring-amber-400/40'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
        }`}
        title={unreadCount > 0 ? `${unreadCount} unread student applications` : 'Notifications (All caught up)'}
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
      >
        <Bell className={`w-4 h-4 ${unreadCount > 0 ? 'text-[#F5821F]' : ''}`} />
        
        {/* Small Numeric Badge when unreadCount > 0; Disappears when 0 */}
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black bg-[#F5821F] text-white flex items-center justify-center shadow-xs border-2 border-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown with High z-index (z-50) */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-w-[92vw] bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden text-slate-900 animate-fadeIn">
          {/* Dropdown Header */}
          <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#F5821F]" />
              <span className="font-bold text-xs uppercase tracking-wider">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="bg-[#F5821F] text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                id="btn-mark-all-as-read"
                onClick={handleMarkAllAsRead}
                className="text-[11px] text-slate-300 hover:text-white flex items-center gap-1 font-semibold hover:underline transition-colors cursor-pointer"
                title="Mark all notifications as read"
              >
                <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                Mark all as read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            {unreadStudents.length > 0 ? (
              unreadStudents.slice(0, 15).map((student) => {
                const relativeTime = getRelativeTime(student.submittedAt);
                const destination = student.interestedCountry
                  ? `Interested in ${student.interestedCountry}`
                  : student.choiceOfProgram
                  ? `Program: ${student.choiceOfProgram}`
                  : 'New Enquiry';

                return (
                  <div
                    key={student.id || student.leadId}
                    onClick={() => handleOpenStudent(student)}
                    className="p-3.5 hover:bg-blue-50/60 cursor-pointer transition-colors flex items-start gap-3 group bg-amber-50/30"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F5821F] mt-1 shrink-0 animate-pulse" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#F5821F]">
                          NEW APPLICATION
                        </span>
                        <span className="text-[11px] text-slate-400 shrink-0 font-medium">
                          {relativeTime}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 truncate group-hover:text-[#0066A6] mt-0.5">
                        {student.fullName}
                      </h4>
                      <p className="text-[11px] text-slate-600 truncate mt-0.5">
                        {destination}
                      </p>
                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100/80">
                        <span className="font-mono text-[#0066A6] font-semibold text-[10px]">
                          {student.leadId}
                        </span>
                        {student.id && (
                          <button
                            type="button"
                            onClick={(e) => handleQuickMarkAsRead(e, student.id!)}
                            className="text-[10px] text-slate-500 hover:text-emerald-700 flex items-center gap-1 font-semibold px-2 py-0.5 rounded hover:bg-white border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
                            title="Mark as read"
                          >
                            <Check className="w-3 h-3 text-emerald-500" />
                            Mark read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-slate-500">
                <Inbox className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-700">All caught up!</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  There are no unread student applications right now.
                </p>
              </div>
            )}
          </div>

          {/* Dropdown Footer: View All Applications */}
          <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-200 text-center">
            <button
              type="button"
              id="btn-view-all-applications"
              onClick={() => {
                setIsOpen(false);
                onViewAllApplications?.();
              }}
              className="w-full text-center text-xs font-bold text-[#0066A6] hover:text-[#004F82] py-1 transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>View All Applications</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
