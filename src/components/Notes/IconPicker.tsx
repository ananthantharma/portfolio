import {
    Archive,
    Book,
    Bookmark,
    Briefcase,
    Calculator,
    Calendar,
    Camera,
    CheckCircle,
    Clipboard,
    Cloud,
    Code,
    CreditCard,
    Database,
    FileText,
    Flag,
    Folder,
    Globe,
    Heart,
    Home,
    Image,
    Layers,
    Layout,
    Lightbulb,
    Link,
    Lock,
    Mail,
    Map,
    MessageSquare,
    Monitor,
    Music,
    Package,
    PenTool,
    Phone,
    PieChart,
    Play,
    Printer,
    Search,
    Settings,
    ShoppingBag,
    Smartphone,
    Smile,
    Star,
    Sun,
    Tag,
    ThumbsUp,
    Trash,
    Truck,
    User,
    Users,
    Video,
    Wifi,
    Zap,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';

export const ICON_options = {
    Archive,
    Book,
    Bookmark,
    Briefcase,
    Calculator,
    Calendar,
    Camera,
    CheckCircle,
    Clipboard,
    Cloud,
    Code,
    CreditCard,
    Database,
    FileText,
    Flag,
    Folder,
    Globe,
    Heart,
    Home,
    Image,
    Layers,
    Layout,
    Lightbulb,
    Link,
    Lock,
    Mail,
    Map,
    MessageSquare,
    Monitor,
    Music,
    Package,
    PenTool,
    Phone,
    PieChart,
    Play,
    Printer,
    Search,
    Settings,
    ShoppingBag,
    Smartphone,
    Smile,
    Star,
    Sun,
    Tag,
    ThumbsUp,
    Trash,
    Truck,
    User,
    Users,
    Video,
    Wifi,
    Zap,
};

interface IconPickerProps {
    onSelectIcon: (iconName: string) => void;
    selectedIcon: string;
}

export const IconPicker: React.FC<IconPickerProps> = React.memo(({ selectedIcon, onSelectIcon }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredIcons = useMemo(() => {
        return Object.keys(ICON_options).filter(name => name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [searchTerm]);

    const SelectedIconComponent = ICON_options[selectedIcon as keyof typeof ICON_options] || Folder;

    return (
        <div className="relative">
            <button
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
                type="button">
                <SelectedIconComponent className="h-4 w-4" />
                <span>{selectedIcon}</span>
            </button>

            {isOpen && (
                <div className="absolute left-0 top-full z-10 mt-2 w-64 rounded-xl border border-gray-200 bg-white shadow-xl p-3 animate-in fade-in zoom-in-95 duration-200">
                    <input
                        autoFocus
                        className="mb-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search icons..."
                        type="text"
                        value={searchTerm}
                    />
                    <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto custom-scrollbar">
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
