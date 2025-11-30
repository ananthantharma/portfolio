/* eslint-disable object-curly-spacing */
import Image from 'next/image';
import {FC, memo} from 'react';

import {TimelineItem} from '../data/dataDef';

interface TimelineBoxProps {
  title: string;
  items: TimelineItem[];
  side?: 'left' | 'right';
}

const TimelineBox: FC<TimelineBoxProps> = memo(({title, items, side = 'left'}) => {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden p-2 lg:p-4">
      <h2 className="mb-6 text-center text-xl font-bold text-white lg:text-2xl">{title}</h2>
      <div
        className={`flex-1 overflow-y-auto pr-2 scrollbar-hide ${
          side === 'left' ? 'border-r border-white/10' : 'border-l border-white/10'
        }`}>
        <div className="flex flex-col gap-y-4">
          {items.map((item, index) => (
            <div
              className="group relative flex transform items-center gap-x-4 rounded-xl border border-white/10 bg-[rgba(255,255,255,0.03)] p-4 shadow-lg backdrop-blur-md transition-all duration-300 hover:translate-x-2 hover:border-cyan-400/50 hover:bg-[rgba(255,255,255,0.08)] hover:shadow-[0_0_20px_rgba(0,201,255,0.2)]"
              key={index}
              style={{animation: `fadeInUp 0.5s ease-out ${index * 100 + 500}ms backwards`}}>
              {/* Logo Container */}
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-white p-1 shadow-inner">
                {item.image ? (
                  <Image alt={`${item.title} logo`} className="h-full w-full object-contain" src={item.image} />
                ) : (
                  <span className="text-sm font-bold text-black">YU</span>
                )}
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-400">{item.date}</div>
                <h3 className="bg-gradient-to-r from-[#00C9FF] to-[#92FE9D] bg-clip-text text-lg font-bold text-transparent lg:text-xl">
                  {item.title}
                </h3>
                <div className="text-sm font-medium text-slate-300 lg:text-base">{item.location}</div>
                {item.content && <div className="mt-2 text-sm text-slate-400 lg:text-base">{item.content}</div>}
              </div>

              {/* Connector Line */}
              <div
                className={`absolute top-1/2 h-px w-4 bg-gradient-to-r from-cyan-400 to-transparent ${
                  side === 'left' ? '-right-4' : '-left-4 rotate-180'
                }`}
              />
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
