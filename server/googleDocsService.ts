import { google, Auth } from 'googleapis';
import type { Request } from 'express';
import { storage } from './storage';

// Helper to get Google OAuth2 client with user's access token
export async function getGoogleAuth(req: Request): Promise<Auth.OAuth2Client> {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  // Get user from request (set by isAuthenticated middleware)
  const user = (req as any).user;
  if (!user?.id) {
    throw new Error('User not authenticated');
  }

  // Get user's Google tokens from database
  const dbUser = await storage.getUser(user.id);
  if (!dbUser?.googleAccessToken) {
    throw new Error('No Google access token found. Please log out and log back in to grant access to your Google Docs.');
  }

  oauth2Client.setCredentials({
    access_token: dbUser.googleAccessToken,
    refresh_token: dbUser.googleRefreshToken || undefined,
  });

  return oauth2Client;
}

// List Google Docs with pagination to get all docs
export async function listGoogleDocs(auth: Auth.OAuth2Client, searchQuery?: string) {
  const drive = google.drive({ version: 'v3', auth });
  
  let allFiles: any[] = [];
  let pageToken: string | undefined = undefined;
  const pageSize = 100;

  // Build query
  let q = "mimeType='application/vnd.google-apps.document'";
  if (searchQuery) {
    // Escape single quotes in search query
    const escapedQuery = searchQuery.replace(/'/g, "\\'");
    q += ` and name contains '${escapedQuery}'`;
  }

  // Fetch all pages
  do {
    const response = await drive.files.list({
      pageSize,
      pageToken,
      fields: 'nextPageToken, files(id, name, createdTime, modifiedTime, mimeType, thumbnailLink, webViewLink)',
      q,
      orderBy: 'modifiedTime desc',
    });

    if (response.data.files) {
      allFiles = allFiles.concat(response.data.files);
    }

    pageToken = response.data.nextPageToken || undefined;

    // Safety limit: stop after 500 docs to avoid excessive API calls
    if (allFiles.length >= 500) {
      break;
    }
  } while (pageToken);

  return allFiles;
}

// Get Google Doc content as HTML using export API
export async function getGoogleDocContent(auth: Auth.OAuth2Client, documentId: string) {
  const drive = google.drive({ version: 'v3', auth });
  const docs = google.docs({ version: 'v1', auth });
  
  // Get document title first
  const doc = await docs.documents.get({
    documentId,
    fields: 'title',
  });

  // Export as HTML using Drive API
  const response = await drive.files.export(
    {
      fileId: documentId,
      mimeType: 'text/html',
    },
    { responseType: 'text' }
  );

  // The response.data contains the full HTML document
  let html = response.data as string;

  // Extract body content (remove <!DOCTYPE>, <html>, <head>, etc.)
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch) {
    html = bodyMatch[1];
  }

  // Minimal cleanup - only remove document-level style tags, keep inline styles for formatting
  html = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove style tags from head
    .replace(/\s*id="[^"]*"/g, '') // Remove IDs (not needed for editor)
    .replace(/\s*class="[^"]*"/g, '') // Remove classes (not needed for editor)
    .trim();

  return {
    title: doc.data.title || 'Untitled',
    html: html || '<p></p>',
  };
}


