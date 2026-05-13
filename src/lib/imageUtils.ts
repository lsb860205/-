
export const compressImage = (dataUrl: string, maxWidth = 1000, initialQuality = 0.5): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (maxWidth / width) * height;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      
      const MAX_SIZE = 1048576; // 1MB (1,048,576 characters/bytes in base64 string)
      let quality = initialQuality;
      let result = canvas.toDataURL('image/jpeg', quality);
      
      // Iteratively reduce quality if size is too large
      // Starts at initialQuality, drops by 0.05 each step, min quality 0.5
      while (result.length > MAX_SIZE && quality > 0.5) {
        quality -= 0.05;
        // Ensure quality doesn't go below 0.01 for toDataURL
        const nextQuality = Math.max(0.01, quality);
        result = canvas.toDataURL('image/jpeg', nextQuality);
        if (nextQuality === 0.01) break;
      }
      
      resolve(result);
    };
    img.onerror = reject;
  });
};
