import React from 'react';
import { X } from 'lucide-react';

interface GoogleCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GoogleCalendarModal: React.FC<GoogleCalendarModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
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
              <p className="text-xs text-gray-500 font-medium">Manage your schedule</p>
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
        <div className="flex-1 bg-gray-50">
          <iframe
            src="https://calendar.google.com/calendar/u/0/embed?wkst=1&bgcolor=%23ffffff&ctz=America%2FNew_York"
            className="w-full h-full border-none"
            title="Google Calendar"
          />
        </div>
      </div>
    </div>
  );
};

export default GoogleCalendarModal;
