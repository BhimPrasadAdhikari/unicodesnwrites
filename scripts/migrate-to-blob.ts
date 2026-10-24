import { put } from '@vercel/blob';
import fs from 'fs/promises';
import path from 'path';

async function migrateFiles() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('❌ BLOB_READ_WRITE_TOKEN is missing');
    return;
  }

  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  
  try {
    // Check if directory exists
    await fs.access(uploadDir);
    
    const files = await fs.readdir(uploadDir, { recursive: true });
    
    for (const file of files) {
      const filePath = path.join(uploadDir, file);
      const stat = await fs.stat(filePath);
      
      if (stat.isFile()) {
        console.log(`Uploading ${file}...`);
        const fileBuffer = await fs.readFile(filePath);
        // Cast to any because Blob typings might conflict in Node env vs Browser
        const blob = new Blob([fileBuffer]); 
        
        const { url } = await put(`uploads/${file}`, blob, {
          access: 'public',
        });
        
        console.log(`✅ Uploaded: ${file} → ${url}`);
        
        // Update database records with new URL (if stored)
        // await updateFileUrl(oldPath, url);
      }
    }
    
    console.log('Migration complete!');
  } catch (error) {
    console.error('Migration error (or no local uploads found):', error);
  }
}

migrateFiles().catch(console.error);
