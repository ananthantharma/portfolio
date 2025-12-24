export const COLOR_PALETTE = [
    { name: 'Obsidian', value: '#000000', gradient: 'linear-gradient(to right, #000000, #434343)' },
    { name: 'Graphite', value: '#374151', gradient: 'linear-gradient(to right, #374151, #111827)' },
    { name: 'Slate', value: '#64748b', gradient: 'linear-gradient(to right, #64748b, #475569)' },
    { name: 'Cool Gray', value: '#9ca3af', gradient: 'linear-gradient(to right, #9ca3af, #6b7280)' },
    { name: 'Midnight Blue', value: '#1e3a8a', gradient: 'linear-gradient(to right, #1e3a8a, #1e40af)' },
    { name: 'Ocean', value: '#0ea5e9', gradient: 'linear-gradient(to right, #0ea5e9, #38bdf8)' },
    { name: 'Emerald', value: '#10b981', gradient: 'linear-gradient(to right, #10b981, #34d399)' },
    { name: 'Forest', value: '#065f46', gradient: 'linear-gradient(to right, #065f46, #047857)' },
    { name: 'Amber', value: '#f59e0b', gradient: 'linear-gradient(to right, #f59e0b, #fbbf24)' },
    { name: 'Sunset', value: '#f97316', gradient: 'linear-gradient(to right, #f97316, #fb923c)' },
    { name: 'Crimson', value: '#ef4444', gradient: 'linear-gradient(to right, #ef4444, #f87171)' },
    { name: 'Berry', value: '#db2777', gradient: 'linear-gradient(to right, #db2777, #f472b6)' },
    { name: 'Violet', value: '#8b5cf6', gradient: 'linear-gradient(to right, #8b5cf6, #a78bfa)' },
    { name: 'Royal', value: '#6d28d9', gradient: 'linear-gradient(to right, #6d28d9, #7c3aed)' },
];

interface ColorPickerProps {
    selectedColor: string;
    onSelectColor: (color: string) => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ selectedColor, onSelectColor }) => {
    const selected = COLOR_PALETTE.find(c => c.value === selectedColor) || COLOR_PALETTE[0];

    return (
        <div className="flex flex-wrap gap-2">
            {COLOR_PALETTE.map(color => (
                <button
                    className={`h-6 w-6 rounded-full transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 ${selectedColor === color.value ? 'ring-2 ring-gray-400 ring-offset-1 scale-110' : ''
                        }`}
                    key={color.value}
                    onClick={() => onSelectColor(color.value)}
                    style={{ background: color.gradient }}
                    title={color.name}
                    type="button"
                />
            ))}
        </div>
    );
};
