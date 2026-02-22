import React, {Fragment} from 'react';
import {Dialog, Transition} from '@headlessui/react';
import {XMarkIcon} from '@heroicons/react/24/outline';
import TableApp from './TableApp';

interface TableAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TableAppModal: React.FC<TableAppModalProps> = ({isOpen, onClose}) => {
  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-hidden">
          <div className="flex h-full min-h-full items-center justify-center p-2 sm:p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
              <Dialog.Panel className="relative transform overflow-hidden rounded-2xl bg-zinc-950 border border-zinc-800/60 text-left shadow-2xl transition-all w-full h-full flex flex-col">
                <div className="absolute right-3 top-3 z-50">
                  <button
                    type="button"
                    className="rounded-lg bg-zinc-800/80 p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition-colors backdrop-blur-sm"
                    onClick={onClose}>
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>

                <div className="flex-1 flex flex-col overflow-hidden">
                  <TableApp />
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};
