import { google } from 'googleapis';

export const getDriveClient = (accessToken: string, refreshToken?: string) => {
  const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const credentials: any = { access_token: accessToken };
  if (refreshToken) {
    credentials.refresh_token = refreshToken;
  }

  auth.setCredentials(credentials);

  return google.drive({ version: 'v3', auth });
};

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export const ensureFolder = async (drive: any, folderName: string) => {
  try {
    // Check if folder exists in root
    const query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and 'root' in parents and trashed=false`;
    const res = await drive.files.list({
      q: query,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    if (res.data.files && res.data.files.length > 0) {
      console.log(`Folder '${folderName}' found:`, res.data.files[0].id);
      return res.data.files[0].id;
    }

    // Create folder if not found
    const fileMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: ['root'],
    };

    const folder = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id',
    });

    console.log(`Folder '${folderName}' created:`, folder.data.id);
    return folder.data.id;
  } catch (error) {
    console.error('Error ensuring folder:', error);
    throw error;
  }
};
