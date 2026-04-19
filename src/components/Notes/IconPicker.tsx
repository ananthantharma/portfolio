import {
  Activity,
  AlertCircle,
  Archive,
  ArrowRight,
  Award,
  BarChart,
  Battery,
  Bell,
  Book,
  Bookmark,
  Box,
  Briefcase,
  Calculator,
  Calendar,
  Camera,
  CheckCircle,
  ChevronRight,
  Circle,
  Clipboard,
  Clock,
  Cloud,
  Code,
  Command,
  Compass,
  Copy,
  Cpu,
  CreditCard,
  Database,
  Disc,
  DollarSign,
  Download,
  Droplet,
  Edit,
  Eye,
  File,
  FileText,
  Film,
  Filter,
  Flag,
  Folder,
  FolderOpen,
  Gift,
  Globe,
  Grid,
  HardDrive,
  Hash,
  Headphones,
  Heart,
  Home,
  Image,
  Inbox,
  Info,
  Key,
  Layers,
  Layout,
  LifeBuoy,
  Lightbulb,
  Link,
  List,
  Loader,
  Lock,
  Mail,
  Map,
  MapPin,
  Maximize,
  Menu,
  MessageCircle,
  MessageSquare,
  Mic,
  Minimize,
  Monitor,
  Moon,
  MoreHorizontal,
  Music,
  Package,
  Paperclip,
  Pause,
  PenTool,
  Phone,
  PieChart,
  Play,
  Plus,
  Power,
  Printer,
  Radio,
  RefreshCw,
  Save,
  Search,
  Send,
  Server,
  Settings,
  Share,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Sidebar,
  Smartphone,
  Smile,
  Speaker,
  Star,
  Sun,
  Tablet,
  Tag,
  Target,
  Terminal,
  Thermometer,
  ThumbsDown,
  ThumbsUp,
  ToggleLeft,
  Trash,
  Trash2,
  TrendingUp,
  Truck,
  Tv,
  Type,
  Umbrella,
  Unlock,
  Upload,
  User,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  Video,
  Voicemail,
  Volume,
  Volume2,
  Watch,
  Wifi,
  Wind,
  X,
  Zap,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import * as IconoirIcons from 'iconoir-react';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {createPortal} from 'react-dom';

const LucideIcons = {
  Activity,
  AlertCircle,
  Archive,
  ArrowRight,
  Award,
  BarChart,
  Battery,
  Bell,
  Book,
  Bookmark,
  Box,
  Briefcase,
  Calculator,
  Calendar,
  Camera,
  CheckCircle,
  ChevronRight,
  Circle,
  Clipboard,
  Clock,
  Cloud,
  Code,
  Command,
  Compass,
  Copy,
  Cpu,
  CreditCard,
  Database,
  Disc,
  DollarSign,
  Download,
  Droplet,
  Edit,
  Eye,
  File,
  FileText,
  Film,
  Filter,
  Flag,
  Folder,
  FolderOpen,
  Gift,
  Globe,
  Grid,
  HardDrive,
  Hash,
  Headphones,
  Heart,
  Home,
  Image,
  Inbox,
  Info,
  Key,
  Layers,
  Layout,
  LifeBuoy,
  Lightbulb,
  Link,
  List,
  Loader,
  Lock,
  Mail,
  Map,
  MapPin,
  Maximize,
  Menu,
  MessageCircle,
  MessageSquare,
  Mic,
  Minimize,
  Monitor,
  Moon,
  MoreHorizontal,
  Music,
  Package,
  Paperclip,
  Pause,
  PenTool,
  Phone,
  PieChart,
  Play,
  Plus,
  Power,
  Printer,
  Radio,
  RefreshCw,
  Save,
  Search,
  Send,
  Server,
  Settings,
  Share,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Sidebar,
  Smartphone,
  Smile,
  Speaker,
  Star,
  Sun,
  Tablet,
  Tag,
  Target,
  Terminal,
  Thermometer,
  ThumbsDown,
  ThumbsUp,
  ToggleLeft,
  Trash,
  Trash2,
  TrendingUp,
  Truck,
  Tv,
  Type,
  Umbrella,
  Unlock,
  Upload,
  User,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  Video,
  Voicemail,
  Volume,
  Volume2,
  Watch,
  Wifi,
  Wind,
  X,
  Zap,
  ZoomIn,
  ZoomOut,
};

// Filter and Prefix Iconoir exports
const PrefixedIconoirIcons = Object.fromEntries(
  Object.entries(IconoirIcons)
    .filter(
      ([key, val]) =>
        /^[A-Z]/.test(key) && key !== 'IconoirProvider' && key !== 'IconoirContext' && typeof val === 'function',
    )
    .map(([key, val]) => [`Iconoir_${key}`, val]),
);

export const ICON_options = {
  ...LucideIcons,
  ...PrefixedIconoirIcons,
};

interface IconPickerProps {
  onSelectIcon: (iconName: string, image?: string | null) => void;
  selectedIcon: string;
  selectedImage?: string | null;
}

export const IconPicker: React.FC<IconPickerProps> = React.memo(({onSelectIcon, selectedIcon, selectedImage}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'icons' | 'brand'>('icons');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({top: 0, left: 0});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Brand Logo State
  const [brandDomain, setBrandDomain] = useState(selectedImage || '');
  const [previewError, setPreviewError] = useState(false);

  const filteredIcons = useMemo(() => {
    const all = Object.keys(ICON_options).filter(name => name.toLowerCase().includes(searchTerm.toLowerCase()));
    // Optimization: Limit to 200 items if search is short to improve render perf
    if (searchTerm.length < 2) return all.slice(0, 200);
    return all;
  }, [searchTerm]);

  const SelectedIconComponent = ICON_options[selectedIcon as keyof typeof ICON_options] || Folder;

  // Handle click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Calculate position on open
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const dropdownHeight = 350; // Approximated max height

      let top = rect.bottom + window.scrollY + 8;
      // Flip if not enough space below
      if (rect.bottom + dropdownHeight > windowHeight) {
        top = rect.top + window.scrollY - 8 - dropdownHeight;
      }

      setDropdownPosition({
        top,
        left: rect.left + window.scrollX,
      });
    }
  }, [isOpen]);

  const handleSelectBrand = () => {
    if (brandDomain && !previewError) {
      onSelectIcon('Globe', brandDomain);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
        onClick={() => setIsOpen(!isOpen)}
        ref={buttonRef}
        type="button">
        {selectedImage ? (
          <img
            alt="Brand Logo"
            className="h-4 w-4 object-contain"
            onError={e => {
              e.currentTarget.style.display = 'none';
            }}
            src={`https://logo.clearbit.com/${selectedImage}`}
          />
        ) : (
          <SelectedIconComponent className="h-4 w-4" />
        )}

        <span className="truncate max-w-[100px]">{selectedImage ? selectedImage : selectedIcon}</span>
      </button>

      {mounted &&
        isOpen &&
        (createPortal(
          <div
            className="animate-in fade-in zoom-in-95 w-72 rounded-xl border border-gray-200 bg-white p-3 shadow-xl duration-200"
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              zIndex: 9999,
            }}>
            {/* Tabs */}
            <div className="flex mb-3 border-b border-gray-100">
              <button
                className={`flex-1 pb-2 text-sm font-medium ${
                  activeTab === 'icons'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('icons')}>
                Icons
              </button>
              <button
                className={`flex-1 pb-2 text-sm font-medium ${
                  activeTab === 'brand'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('brand')}>
                Brand Logo
              </button>
            </div>

            {activeTab === 'icons' ? (
              <>
                <input
                  autoFocus
                  className="mb-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder-gray-400"
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search icons..."
                  type="text"
                  value={searchTerm}
                />
                <div className="custom-scrollbar grid max-h-48 grid-cols-5 gap-2 overflow-y-auto">
                  {filteredIcons.map(iconName => {
                    const IconComponent = ICON_options[iconName as keyof typeof ICON_options];
                    return (
                      <button
                        className={`flex items-center justify-center rounded-lg p-2 transition-all hover:bg-gray-100 ${
                          selectedIcon === iconName && !selectedImage
                            ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200'
                            : 'text-gray-500'
                        }`}
                        key={iconName}
                        onClick={() => {
                          onSelectIcon(iconName, null); // Clear image
                          setIsOpen(false);
                          setPreviewImage(null);
                          setBrandSearchTerm('');
                        }}
                        title={iconName}
                        type="button">
                        <IconComponent className="h-4 w-4" />
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="text-xs text-gray-500">Enter a domain to use its logo.</div>
                <input
                  autoFocus
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder-gray-400"
                  onChange={e => { setBrandDomain(e.target.value.trim()); setPreviewError(false); }}
                  placeholder="e.g. google.com"
                  type="text"
                  value={brandDomain}
                />

                {brandDomain && (
                  <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-center border border-gray-100 min-h-[80px]">
                    {!previewError ? (
                      <img
                        alt="Preview"
                        className="h-10 w-10 object-contain"
                        onError={() => setPreviewError(true)}
                        src={`https://logo.clearbit.com/${brandDomain}`}
                      />
                    ) : (
                      <div className="text-xs text-red-500 flex flex-col items-center gap-1">
                        <AlertCircle className="h-5 w-5" />
                        <span>Logo not found</span>
                      </div>
                    )}
                  </div>
                )}

                <button
                  className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                    brandDomain && !previewError
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                  disabled={!brandDomain || previewError}
                  onClick={handleSelectBrand}>
                  Use Logo
                </button>
              </div>
            )}
          </div>,
          document.body,
        ) as React.ReactNode)}
    </div>
  );
});

IconPicker.displayName = 'IconPicker';
