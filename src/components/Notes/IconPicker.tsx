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
import React, {useMemo, useState} from 'react';

export const ICON_options = {
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

interface IconPickerProps {
  onSelectIcon: (iconName: string, image?: string | null) => void;
  selectedIcon: string;
  selectedImage?: string | null;
}

export const IconPicker: React.FC<IconPickerProps> = React.memo(({onSelectIcon, selectedIcon, selectedImage}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'icons' | 'brand'>('icons');

  // Brandfetch State
  const [brandDomain, setBrandDomain] = useState(selectedImage || '');
  const [previewImage, setPreviewImage] = useState<string | null>(selectedImage || null);

  const filteredIcons = useMemo(() => {
    return Object.keys(ICON_options).filter(name => name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [searchTerm]);

  const SelectedIconComponent = ICON_options[selectedIcon as keyof typeof ICON_options] || Folder;

  const handleBrandChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const domain = e.target.value;
    setBrandDomain(domain);
    if (domain.includes('.')) {
      setPreviewImage(domain);
    } else {
      setPreviewImage(null);
    }
  };

  const handleSelectBrand = () => {
    if (previewImage) {
      onSelectIcon('Globe', previewImage); // 'Globe' as fallback icon
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
        onClick={() => setIsOpen(!isOpen)}
        type="button">
        {selectedImage ? (
          <img
            alt="Brand Logo"
            className="h-4 w-4 object-contain"
            onError={e => {
              e.currentTarget.style.display = 'none';
            }}
            src={`/api/notes/brandfetch?domain=${selectedImage}`}
          />
        ) : (
          <SelectedIconComponent className="h-4 w-4" />
        )}

        <span>{selectedImage ? selectedImage : selectedIcon}</span>
      </button>

      {isOpen && (
        <div className="animate-in fade-in zoom-in-95 data-[side=bottom]:slide-in-from-top-2 z-50 absolute left-0 top-full mt-2 w-72 rounded-xl border border-gray-200 bg-white p-3 shadow-xl duration-200">
          {/* Tabs */}
          <div className="flex mb-3 border-b border-gray-100">
            <button
              className={`flex-1 pb-2 text-sm font-medium ${
                activeTab === 'icons' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('icons')}>
              Icons
            </button>
            <button
              className={`flex-1 pb-2 text-sm font-medium ${
                activeTab === 'brand' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('brand')}>
              Brand Logo
            </button>
          </div>

          {activeTab === 'icons' ? (
            <>
              <input
                autoFocus
                className="mb-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
                        setBrandDomain('');
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
              <div className="text-xs text-gray-500">Enter a domain name to fetch its official brand logo.</div>
              <input
                autoFocus
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                onChange={handleBrandChange}
                placeholder="e.g. google.com"
                type="text"
                value={brandDomain}
              />

              {previewImage && (
                <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-center border border-gray-100">
                  <img
                    alt="Preview"
                    className="h-10 w-10 object-contain"
                    src={`/api/notes/brandfetch?domain=${previewImage}`}
                  />
                </div>
              )}

              <button
                className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                  previewImage
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
                disabled={!previewImage}
                onClick={handleSelectBrand}>
                Use Logo
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

IconPicker.displayName = 'IconPicker';
