/* eslint-disable object-curly-spacing */
import { FC, memo } from 'react';

import { heroTimeline } from '../data/data';

const WorkTimeline: FC = memo(() => {
  return (
    <div className="flex flex-col gap-y-4">
      {heroTimeline.map((item, index) => (
        <div className="relative flex gap-x-4" key={`${item.title}-${index}`}>
          {/* Timeline line */}
          <div className="relative flex flex-col items-center">
            <div className="h-full w-0.5 bg-orange-500/30" />
            <div className="absolute top-1.5 h-3 w-3 rounded-full bg-orange-500 shadow-sm shadow-orange-500/50" />
          </div>

          {/* Content */}
          <div className="flex flex-col pb-6">
            <span className="text-xs font-bold text-orange-500">{item.date}</span>
            <h3 className="text-sm font-bold text-white">{item.title}</h3>
            <span className="text-xs text-stone-300">{item.location}</span>
          </div>
        </div>
      ))}
    </div>
  );
});

WorkTimeline.displayName = 'WorkTimeline';
export default WorkTimeline;
