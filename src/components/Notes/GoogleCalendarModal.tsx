import React from 'react';
import { X, CalendarDays, ExternalLink, LogOut } from 'lucide-react';
import { useSession } from 'next-auth/react';
import OrgCalendarView from '../Organization/OrgCalendarView';

interface GoogleCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GoogleCalendarModal: React.FC<GoogleCalendarModalProps> = ({ isOpen, onClose }) => {
  const { data: session } = useSession();
  const accessToken = (session as any)?.accessToken;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[40] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="relative w-full h-full max-w-6xl max-h-[90vh] bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <img 
                src="https://www.gstatic.com/images/branding/product/1x/calendar_2020q4_48dp.png" 
                alt="Google Calendar" 
                className="w-6 h-6"
              />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 leading-tight">Google Calendar</h2>
              <p className="text-xs text-gray-500 font-medium">
                {accessToken ? (
                  <span className="flex items-center gap-1 text-emerald-600">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    Connected
                  </span>
                ) : (
                  <span className="text-amber-500 flex items-center gap-1">
                    <LogOut className="w-3 h-3" />
                    Action Required
                  </span>
                )}
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-all duration-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 bg-gray-50 overflow-hidden relative">
          {!accessToken && (
             <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[2px] flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-amber-100 p-8 text-center animate-in zoom-in-95 duration-500">
                  <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <CalendarDays className="w-8 h-8 text-amber-500" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Connect to Google Calendar</h3>
                  <p className="text-gray-600 mb-8">
                    To securely access and manage your calendar events, please sign out and sign back in to grant permissions.
                  </p>
                  <a 
                    href="/api/auth/signout"
                    className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-lg shadow-slate-200"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out & Reconnect
                  </a>
                </div>
             </div>
          )}
          <OrgCalendarView accessToken={accessToken} />
        </div>
      </div>
    </div>
  );
};

export default GoogleCalendarModal;
