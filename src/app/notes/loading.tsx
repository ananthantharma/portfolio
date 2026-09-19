import React from 'react';

const NotesLoading = React.memo(function NotesLoading() {
  return (
    <div className="flex h-screen items-center justify-center bg-[#fbfaf7] text-[#405b43]" role="status">
      <div className="flex flex-col items-center gap-4">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#dfe5d7] border-t-[#405b43]" />
        <p className="text-sm">Opening your workspace…</p>
      </div>
    </div>
  );
});

export default NotesLoading;
