import {google} from 'googleapis';

export const getDriveClient = (accessToken: string, refreshToken?: string) => {
  const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);

  const credentials: any = {access_token: accessToken};
  if (refreshToken) {
    credentials.refresh_token = refreshToken;
  }

  auth.setCredentials(credentials);

  return google.drive({version: 'v3', auth});
};
