import React, { useMemo, useState } from 'react';
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
    onSelectIcon: (iconName: string) => void;
    selectedIcon: string;
}

export const IconPicker: React.FC<IconPickerProps> = React.memo(({ onSelectIcon, selectedIcon }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredIcons = useMemo(() => {
        return Object.keys(ICON_options).filter(name => name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [searchTerm]);

    const SelectedIconComponent = ICON_options[selectedIcon as keyof typeof ICON_options] || Folder;

    return (
        <div className="relative">
            <button
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                onClick={() => setIsOpen(!isOpen)}
                type="button">
                <SelectedIconComponent className="h-4 w-4" />
                <span>{selectedIcon}</span>
            </button>

            {isOpen && (
                <div className="animate-in fade-in zoom-in-95 data-[side=bottom]:slide-in-from-top-2 z-50 absolute left-0 top-full mt-2 w-64 rounded-xl border border-gray-200 bg-white p-3 shadow-xl duration-200">
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
                                    className={`flex items-center justify-center rounded-lg p-2 transition-all hover:bg-gray-100 ${selectedIcon === iconName ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200' : 'text-gray-500'
                                        }`}
                                    key={iconName}
                                    onClick={() => {
                                        onSelectIcon(iconName);
                                        setIsOpen(false);
                                    }}
                                    title={iconName}
                                    type="button">
                                    <IconComponent className="h-4 w-4" />
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
});

IconPicker.displayName = 'IconPicker';
