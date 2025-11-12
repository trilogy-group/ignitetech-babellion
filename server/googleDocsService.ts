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
    }) as { data: { files?: unknown[]; nextPageToken?: string | null } };

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
  const response: { data: string } = await drive.files.export(
    {
      fileId: documentId,
      mimeType: 'text/html',
    },
    { responseType: 'text' }
  ) as { data: string };

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

// Convert HTML to Google Docs API batchUpdate requests
// Uses a simpler approach: extract text segments with their formatting
function convertHtmlToGoogleDocsRequests(html: string): Array<Record<string, unknown>> {
  const requests: Array<Record<string, unknown>> = [];
  
  // Remove script and style tags
  let cleanHtml = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Extract text content and build segments with formatting
  interface TextSegment {
    text: string;
    bold: boolean;
    italic: boolean;
    underline: boolean;
  }
  
  const segments: TextSegment[] = [];
  let currentSegment: TextSegment = { text: '', bold: false, italic: false, underline: false };
  const formattingStack: Array<'bold' | 'italic' | 'underline'> = [];
  
  // Process HTML character by character to handle nested tags
  let i = 0;
  while (i < cleanHtml.length) {
    if (cleanHtml[i] === '<') {
      // Found a tag
      const tagEnd = cleanHtml.indexOf('>', i);
      if (tagEnd === -1) break;
      
      const tagContent = cleanHtml.substring(i + 1, tagEnd);
      const isClosing = tagContent.startsWith('/');
      const tagName = (isClosing ? tagContent.substring(1) : tagContent).split(/\s/)[0].toLowerCase();
      
      // Handle formatting tags - update stack BEFORE saving segment for closing tags
      if (tagName === 'b' || tagName === 'strong') {
        if (isClosing) {
          // Save current segment with bold formatting BEFORE removing it from stack
          if (currentSegment.text) {
            segments.push({ ...currentSegment });
            currentSegment.text = '';
          }
          const index = formattingStack.indexOf('bold');
          if (index > -1) formattingStack.splice(index, 1);
        } else {
          // Save current segment before starting bold formatting
          if (currentSegment.text) {
            segments.push({ ...currentSegment });
            currentSegment.text = '';
          }
          if (!formattingStack.includes('bold')) formattingStack.push('bold');
        }
        currentSegment.bold = formattingStack.includes('bold');
        currentSegment.italic = formattingStack.includes('italic');
        currentSegment.underline = formattingStack.includes('underline');
      } else if (tagName === 'i' || tagName === 'em') {
        if (isClosing) {
          if (currentSegment.text) {
            segments.push({ ...currentSegment });
            currentSegment.text = '';
          }
          const index = formattingStack.indexOf('italic');
          if (index > -1) formattingStack.splice(index, 1);
        } else {
          if (currentSegment.text) {
            segments.push({ ...currentSegment });
            currentSegment.text = '';
          }
          if (!formattingStack.includes('italic')) formattingStack.push('italic');
        }
        currentSegment.bold = formattingStack.includes('bold');
        currentSegment.italic = formattingStack.includes('italic');
        currentSegment.underline = formattingStack.includes('underline');
      } else if (tagName === 'u') {
        if (isClosing) {
          if (currentSegment.text) {
            segments.push({ ...currentSegment });
            currentSegment.text = '';
          }
          const index = formattingStack.indexOf('underline');
          if (index > -1) formattingStack.splice(index, 1);
        } else {
          if (currentSegment.text) {
            segments.push({ ...currentSegment });
            currentSegment.text = '';
          }
          if (!formattingStack.includes('underline')) formattingStack.push('underline');
        }
        currentSegment.bold = formattingStack.includes('bold');
        currentSegment.italic = formattingStack.includes('italic');
        currentSegment.underline = formattingStack.includes('underline');
      } else if (tagName === 'br' || tagName === 'p') {
        // Line break
        if (currentSegment.text || segments.length > 0) {
          segments.push({ ...currentSegment, text: currentSegment.text || '\n' });
          currentSegment = { text: '', bold: formattingStack.includes('bold'), italic: formattingStack.includes('italic'), underline: formattingStack.includes('underline') };
        }
      } else if (tagName === 'li') {
        // List item - we'll add bullet later, for now just mark as new segment
        if (currentSegment.text || segments.length > 0) {
          segments.push({ ...currentSegment, text: currentSegment.text || '\n' });
          currentSegment = { text: '', bold: formattingStack.includes('bold'), italic: formattingStack.includes('italic'), underline: formattingStack.includes('underline') };
        }
      } else {
        // Other tags - just save current segment if it has text
        if (currentSegment.text) {
          segments.push({ ...currentSegment });
          currentSegment.text = '';
        }
      }
      
      i = tagEnd + 1;
    } else {
      // Regular character
      currentSegment.text += cleanHtml[i];
      i++;
    }
  }
  
  // Add final segment
  if (currentSegment.text) {
    segments.push(currentSegment);
  }
  
  // Build the full text and track formatting ranges
  let fullText = '';
  const formattingRanges: Array<{
    startIndex: number;
    endIndex: number;
    formatting: Record<string, unknown>;
  }> = [];
  
  for (const segment of segments) {
    const startIndex = fullText.length + 1; // +1 because Google Docs indices start at 1
    fullText += segment.text;
    const endIndex = fullText.length; // Exclusive endIndex (points to position after last char)
    
    const formatting: Record<string, unknown> = {};
    if (segment.bold) formatting.bold = true;
    if (segment.italic) formatting.italic = true;
    if (segment.underline) formatting.underline = true;
    
    // Apply formatting if segment has formatting and non-empty text (or whitespace-only but we want to format it)
    if (Object.keys(formatting).length > 0 && segment.text.length > 0) {
      formattingRanges.push({
        startIndex,
        endIndex,
        formatting,
      });
    }
  }
  
  // If no content, add a space
  if (!fullText.trim()) {
    fullText = ' ';
  }
  
  // Insert text
  requests.push({
    insertText: {
      location: { index: 1 },
      text: fullText,
    },
  });
  
  // Apply formatting
  for (const range of formattingRanges) {
    requests.push({
      updateTextStyle: {
        range: {
          startIndex: range.startIndex,
          endIndex: range.endIndex,
        },
        textStyle: range.formatting,
        fields: Object.keys(range.formatting).join(','),
      },
    });
  }
  
  return requests;
}

// Create a new Google Doc with HTML content
export async function createGoogleDoc(
  auth: Auth.OAuth2Client,
  title: string,
  htmlContent: string
): Promise<{ documentId: string; webViewLink: string }> {
  const drive = google.drive({ version: 'v3', auth });
  
  // Wrap HTML content in a proper HTML document structure
  const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
</head>
<body>
${htmlContent}
</body>
</html>`;
  
  // Create a multipart upload to convert HTML to Google Docs
  // Google Drive API can convert HTML files to Google Docs format
  const media = {
    mimeType: 'text/html',
    body: fullHtml,
  };
  
  const fileMetadata = {
    name: title,
    mimeType: 'application/vnd.google-apps.document', // This tells Drive to convert to Google Docs
  };
  
  // Upload HTML file and convert it to Google Docs format
  const file = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: 'id, webViewLink',
  });
  
  const documentId = file.data.id;
  if (!documentId) {
    throw new Error('Failed to create Google Doc: No document ID returned');
  }
  
  // Set default paragraph spacing (space before paragraphs)
  const docs = google.docs({ version: 'v1', auth });
  try {
    // Get the document to find all paragraphs
    const doc = await docs.documents.get({
      documentId,
    });
    
    // Apply spacing to all paragraphs in the document
    const requests: Array<Record<string, unknown>> = [];
    const body = doc.data.body;
    
    if (body?.content) {
      // Find the end of the document
      const lastElement = body.content[body.content.length - 1];
      const documentEndIndex = lastElement?.endIndex || 1;
      
      // Apply spacing to the entire document (all paragraphs)
      requests.push({
        updateParagraphStyle: {
          range: {
            startIndex: 1,
            endIndex: documentEndIndex,
          },
          paragraphStyle: {
            spaceAbove: {
              magnitude: 6, // 6 points spacing before paragraphs
              unit: 'PT',
            },
          },
          fields: 'spaceAbove',
        },
      });
    }
    
    if (requests.length > 0) {
      await docs.documents.batchUpdate({
        documentId,
        requestBody: {
          requests,
        },
      });
    }
  } catch (error) {
    // Log but don't fail if we can't set paragraph spacing
    console.warn('Failed to set paragraph spacing:', error);
  }
  
  return {
    documentId,
    webViewLink: file.data.webViewLink || `https://docs.google.com/document/d/${documentId}/edit`,
  };
}


