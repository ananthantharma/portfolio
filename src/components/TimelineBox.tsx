/* eslint-disable object-curly-spacing */
import { FC, memo } from 'react';

import { TimelineItem } from '../data/dataDef';

interface TimelineBoxProps {
    title: string;
    items: TimelineItem[];
}

const TimelineBox: FC<TimelineBoxProps> = memo(({ title, items }) => {
    return (
        <div className="max-h-[45vh] overflow-y-auto rounded-xl bg-gray-900/60 p-6 backdrop-blur-sm">
            <h3 className="mb-6 text-2xl font-bold text-white">{title}</h3>
            <div className="flex flex-col gap-y-6">
                {items.map((item, index) => (
                    <div className="relative flex gap-x-4" key={`${item.title}-${index}`}>
                        {/* Timeline line */}
                        <div className="relative flex flex-col items-center">
                            <div className="h-full w-0.5 bg-orange-500/30" />
                            <div className="absolute top-1.5 h-4 w-4 rounded-full bg-orange-500 shadow-sm shadow-orange-500/50" />
                        </div>

                        {/* Content */}
                        <div className="flex flex-col pb-6">
                            <span className="text-sm font-bold text-orange-500 sm:text-base">{item.date}</span>
                            <h3 className="text-lg font-bold text-white sm:text-xl">{item.title}</h3>
                            <span className="text-sm text-stone-300 sm:text-base">{item.location}</span>
                            {item.content && <div className="mt-2 text-sm text-stone-200 sm:text-base">{item.content}</div>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
});

TimelineBox.displayName = 'TimelineBox';
export default TimelineBox;
