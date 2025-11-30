/* eslint-disable object-curly-spacing */
import { FC, memo } from 'react';

import { TimelineItem } from '../data/dataDef';

interface TimelineBoxProps {
    title: string;
    items: TimelineItem[];
}

const TimelineBox: FC<TimelineBoxProps> = memo(({ title, items }) => {
    return (
        <div className="flex h-full w-full flex-col overflow-hidden rounded-xl bg-gray-800/40 p-4 shadow-lg backdrop-blur-sm lg:p-6">
            <h2 className="mb-4 text-center text-xl font-bold text-white lg:text-2xl">{title}</h2>
            <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide">
                <div className="flex flex-col gap-y-4">
                    {items.map((item, index) => (
                        <div className="relative border-l-2 border-orange-500 pl-4" key={index}>
                            <div className="mb-1 text-sm text-gray-400 lg:text-base">{item.date}</div>
                            <h3 className="text-lg font-bold text-white lg:text-xl">{item.title}</h3>
                            <div className="mb-2 text-sm font-medium text-orange-400 lg:text-base">{item.location}</div>
                            {item.content && <div className="text-sm text-gray-300 lg:text-base">{item.content}</div>}
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
