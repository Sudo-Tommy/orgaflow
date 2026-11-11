/**
 * Komprimiert Bilddateien (Fotos von Kamera / Galerie) auf dem Endgerät,
 * um Speicherplatz und Netzwerkübertragung minimal zu halten.
 */
export async function compressImageFile(
    file: File, 
    maxWidth = 1280, 
    maxHeight = 1280, 
    quality = 0.75
): Promise<{ dataUrl: string; name: string; sizeKb: number }> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve({ dataUrl: e.target?.result as string, name: file.name, sizeKb: Math.round(file.size / 1024) });
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                const approxSizeKb = Math.round((dataUrl.length * 3) / 4 / 1024);

                resolve({
                    dataUrl,
                    name: file.name,
                    sizeKb: approxSizeKb
                });
            };
            img.onerror = () => reject(new Error('Bild konnte nicht geladen werden.'));
            img.src = e.target?.result as string;
        };
        reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden.'));
        reader.readAsDataURL(file);
    });
}
