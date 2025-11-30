/* eslint-disable object-curly-spacing */
import { FC, memo } from 'react';

import { TimelineItem } from '../data/dataDef';

interface TimelineBoxProps {
    title: string;
    items: TimelineItem[];
}

const TimelineBox: FC<TimelineBoxProps> = memo(({ title, items }) => {
    return (
        <div className="flex h-full w-full flex-col overflow-hidden p-2 lg:p-4">
            <h2 className="mb-6 text-center text-xl font-bold text-white lg:text-2xl">{title}</h2>
            <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide">
                <div className="flex flex-col gap-y-4">
                    {items.map((item, index) => (
                        <div
                            className="group relative transform rounded-r-lg border-l-[3px] border-neon-cyan bg-[rgba(10,20,40,0.6)] p-4 shadow-lg backdrop-blur-sm transition-all duration-300 hover:translate-x-2 hover:bg-[rgba(10,20,40,0.8)] hover:shadow-[0_0_15px_rgba(0,255,255,0.3)]"
                            key={index}
                            style={{ animation: `fadeInUp 0.5s ease-out ${index * 100 + 500}ms backwards` }}
                        >
                            <div className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-400">{item.date}</div>
                            <h3 className="text-lg font-bold text-neon-cyan lg:text-xl">{item.title}</h3>
                            <div className="text-sm font-medium text-white lg:text-base">{item.location}</div>
                            {item.content && <div className="mt-2 text-sm text-gray-300 lg:text-base">{item.content}</div>}
                        </div>
                    ))}
                </div>
            </div>
            <style jsx>{`
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </div>
    );
});

TimelineBox.displayName = 'TimelineBox';
export default TimelineBox;
