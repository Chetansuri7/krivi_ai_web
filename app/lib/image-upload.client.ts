// app/lib/image-upload.client.ts

/**
 * Gets a presigned URL for uploading a file from our Remix backend.
 * @param file The file to be uploaded.
 * @returns An object containing the uploadUrl and the objectKey.
 */
function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) {
    return ''; // No extension found
  }
  return filename.substring(lastDot + 1);
}

async function getUploadUrl(file: File): Promise<{ uploadUrl: string; objectKey: string }> {
  const fileExtension = getFileExtension(file.name);
  const uniqueFileName = `${crypto.randomUUID()}${fileExtension ? `.${fileExtension}` : ''}`;

  const response = await fetch('/api/get-upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName: uniqueFileName, contentType: file.type }),
  });

  if (!response.ok) {
    throw new Error('Failed to get upload URL.');
  }

  const data = await response.json();
  // The actual response is nested inside a 'body' property by the serverless function.
  if (data.body) {
    return data.body;
  }
  return data; // Fallback for if the structure changes or is already flat
}

/**
 * Uploads the file to the presigned URL provided by DigitalOcean Spaces.
 * @param file The file to upload.
 * @param uploadUrl The presigned URL for the PUT request.
 */
async function uploadFileToSignedUrl(file: File, uploadUrl: string): Promise<Response> {
  const headers = { 'Content-Type': file.type };
  console.log('Uploading to URL:', uploadUrl);
  console.log('With headers:', headers);

  const response = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: headers,
    mode: 'cors',
    cache: 'no-cache',
  });
  return response;
}

/**
 * The main function to handle the entire file upload process.
 * It gets a signed URL, uploads the file, and returns the object key.
 * @param file The file to be uploaded.
 * @returns An object containing the objectKey and the public readUrl.
 */
export async function handleImageUpload(file: File): Promise<{ objectKey: string; readUrl: string }> {
  // 1. Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    alert('Invalid file type. Please upload a JPG, PNG, GIF, or WebP image.');
    throw new Error('Invalid file type.');
  }

  // 2. Get a presigned URL from our backend
  const { uploadUrl, objectKey } = await getUploadUrl(file);

  if (!uploadUrl || !objectKey) {
    alert('Could not get an upload URL. Please try again.');
    throw new Error("Failed to retrieve valid upload credentials.");
  }

  // 3. Upload the file to the presigned URL
  const uploadResponse = await uploadFileToSignedUrl(file, uploadUrl);

  if (!uploadResponse.ok) {
    alert('The image upload failed. This might be due to a network issue or a problem with the storage provider. Please check your CORS settings on DigitalOcean Spaces.');
    throw new Error('Upload failed.');
  }

  // 4. Get a readable, public URL for the uploaded file
  const readUrl = await getReadUrl(objectKey);

  // 5. Return both the key and the public URL
  return { objectKey, readUrl };
}

/**
 * Gets a readable, public URL for a given object key from our backend.
 * @param objectKey The key of the object in the Space.
 * @returns The public URL to view the image.
 */
export async function getReadUrl(objectKey: string): Promise<string> {
    const response = await fetch(`/api/get-read-url?objectKey=${objectKey}`);
    if (!response.ok) {
        throw new Error('Failed to get read URL.');
    }
    const data = await response.json();
    return data.readUrl;
}