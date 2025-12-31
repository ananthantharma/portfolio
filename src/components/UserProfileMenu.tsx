import { Menu, Transition } from '@headlessui/react';
import { signOut, useSession } from 'next-auth/react';
import React, { Fragment, memo } from 'react';

const UserProfileMenu = memo(() => {
    const { data: session } = useSession();

    if (!session) return null;

    const userInitial = session.user?.name ? session.user.name.charAt(0).toUpperCase() : 'U';

    return (
        <Menu as="div" className="relative ml-3">
            <div>
                <Menu.Button className="flex rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2">
                    <span className="sr-only">Open user menu</span>
                    {session.user?.image ? (
                        <img
                            alt="User"
                            className="h-8 w-8 rounded-full border border-gray-200"
                            src={session.user.image}
                        />
                    ) : (
                        <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold border border-orange-200">
                            {userInitial}
                        </div>
                    )}
                </Menu.Button>
            </div>
            <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95">
                <Menu.Items className="absolute right-0 z-[60] mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900 truncate">{session.user?.name || 'User'}</p>
                        <p className="text-xs text-gray-500 truncate">{session.user?.email}</p>
                    </div>
                    <Menu.Item>
                        {({ active }) => (
                            <button
                                className={`${active ? 'bg-gray-100' : ''
                                    } block w-full px-4 py-2 text-left text-sm text-gray-700`}
                                onClick={() => signOut()}>
                                Sign out
                            </button>
                        )}
                    </Menu.Item>
                </Menu.Items>
            </Transition>
        </Menu>
    );
});

UserProfileMenu.displayName = 'UserProfileMenu';

export default UserProfileMenu;
