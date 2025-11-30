/* eslint-disable object-curly-spacing */
import { FC, memo } from 'react';

import { TimelineItem } from '../data/dataDef';

interface TimelineBoxProps {
    title: string;
    items: TimelineItem[];
}

const TimelineBox: FC<TimelineBoxProps> = memo(({ title, items }) => {
    return (
        <div className="flex h-full w-full flex-col overflow-hidden rounded-[20px] border border-white/10 bg-white/5 p-4 shadow-[0_4px_30px_rgba(0,0,0,0.1)] backdrop-blur-[16px] lg:p-6">
            <h2 className="mb-6 text-center text-xl font-bold text-white lg:text-2xl">{title}</h2>
            <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide">
                <div className="flex flex-col gap-y-6 pl-2">
                    {items.map((item, index) => (
                        <div className="group relative border-l border-white/20 pl-6 transition-all duration-300 hover:border-neon-cyan" key={index}>
                            {/* Glowing Dot */}
                            <div className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-white transition-all duration-300 group-hover:bg-neon-cyan group-hover:shadow-[0_0_10px_#00FFFF]" />

                            {/* Card Content */}
                            <div className="transform transition-transform duration-300 group-hover:scale-102">
                                <div className="mb-1 text-xs font-medium uppercase tracking-wider text-white/60">{item.date}</div>
                                <h3 className="text-lg font-bold text-electric-amber lg:text-xl">{item.title}</h3>
                                <div className="text-sm font-medium text-white lg:text-base">{item.location}</div>
                                {item.content && <div className="mt-2 text-sm text-gray-300 lg:text-base">{item.content}</div>}
                            </div>
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
            `}</style>
        </div>
    );
});

TimelineBox.displayName = 'TimelineBox';
export default TimelineBox;
