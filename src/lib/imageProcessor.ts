export async function processImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          // Extract base64 data without the data URL prefix
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        } else {
          reject(new Error('Failed to process image'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read image file'));
      };
      
      reader.readAsDataURL(file);
    });
  }
  
  export function getImageMimeType(file: File): string {
    return file.type || 'image/jpeg';
  }