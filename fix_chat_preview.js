
const fs = require('fs');
const filename = 'src/components/ChatInterface.tsx';

try {
    let content = fs.readFileSync(filename, 'utf8');

    // The marker for start of preview area (the old code still has selectedImages)
    const startMarker = '{selectedImages.length > 0 && (';
    // The marker for start of input area
    const endMarker = '<div className="relative flex-1 flex gap-2 items-end">';

    const startIdx = content.indexOf(startMarker);
    const endIdx = content.indexOf(endMarker, startIdx);

    if (startIdx !== -1 && endIdx !== -1) {
        const newContent = `{attachments.length > 0 && (
              <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
                {attachments.map((att, idx) => (
                  <div className="relative group flex-shrink-0" key={idx}>
                    {att.type === 'image' ? (
                      <img alt="Preview" className="h-16 w-16 object-cover rounded-lg border border-zinc-700" src={att.content} />
                    ) : (
                      <div className="h-16 w-16 bg-zinc-800 rounded-lg border border-zinc-700 flex flex-col items-center justify-center p-1" title={att.name}>
                          {att.type === 'pdf' ? <FileIcon className="w-8 h-8 text-red-500" /> : <FileText className="w-8 h-8 text-blue-500" />}
                          <span className="text-[8px] text-zinc-400 mt-1 truncate w-full text-center">{att.name}</span>
                      </div>
                    )}
                    <button
                      className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeAttachment(idx)}
                      type="button">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            `;

        const finalContent = content.substring(0, startIdx) + newContent + content.substring(endIdx);
        fs.writeFileSync(filename, finalContent);
        console.log('Fixed ChatInterface preview block.');
    } else {
        console.log('Could not find markers.');
        console.log('Start:', startIdx, 'End:', endIdx);
    }
} catch (e) {
    console.error(e);
}
