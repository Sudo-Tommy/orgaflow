<script lang="ts">
    let { formData, avatarFile = $bindable(), deleteAvatar = $bindable(), existingAvatarUrl, isLoading, onSave } = $props<{
        formData: any;
        avatarFile: File | null;
        deleteAvatar: boolean;
        existingAvatarUrl: string;
        isLoading: boolean;
        onSave: () => void;
    }>();

    let localPreviewUrl = $derived(avatarFile ? URL.createObjectURL(avatarFile) : "");

    function handleFileChange(e: Event) {
        const target = e.target as HTMLInputElement;
        if (target.files && target.files.length > 0) {
            const file = target.files[0];
            
            // Bild automatisch verkleinern, da Handy-Fotos meist zu groß für Server-Limits sind
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const MAX_SIZE = 1600; // Auflösung für maximale Schärfe (Retina/4K) verdoppelt
                        let width = img.width;
                        let height = img.height;

                        if (width > height && width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        } else if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }

                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            ctx.imageSmoothingEnabled = true;
                            ctx.imageSmoothingQuality = 'high';
                            ctx.drawImage(img, 0, 0, width, height);
                        }
                        
                        canvas.toBlob((blob) => {
                            if (blob) {
                                const newFileName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
                                avatarFile = new File([blob], newFileName, { type: 'image/jpeg' });
                                deleteAvatar = false;
                            }
                        }, 'image/jpeg', 0.95); // Nahezu verlustfreie Qualität
                    };
                    img.src = event.target?.result as string;
                };
                reader.readAsDataURL(file);
            } else {
                avatarFile = file;
                deleteAvatar = false;
            }
        } else {
            avatarFile = null;
        }
    }
</script>

<div class="orga-card-white p-6 md:p-8">
    <h2 class="text-lg font-bold text-neutral-900 mb-6 flex items-center gap-2 border-b border-neutral-100 pb-4">
        <span class="w-8 h-8 flex items-center justify-center bg-indigo-100 text-indigo-600 rounded-lg shadow-inner text-sm">👤</span> Persönliche Daten
    </h2>
    
    <form onsubmit={(e) => { e.preventDefault(); onSave(); }} class="space-y-5">
        <div class="flex flex-col sm:flex-row items-start sm:items-center gap-6 pb-2">
            <div class="relative shrink-0">
                {#if localPreviewUrl || (existingAvatarUrl && !deleteAvatar)}
                    <img src={localPreviewUrl || existingAvatarUrl} alt="Avatar" class="w-24 h-24 rounded-full object-cover border border-neutral-200 shadow-sm" />
                    <button type="button" onclick={() => { deleteAvatar = true; avatarFile = null; }} class="absolute -top-1 -right-1 bg-red-100 text-red-600 hover:bg-red-500 hover:text-white rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold shadow-sm transition-colors" title="Entfernen">✕</button>
                {:else}
                    <div class="w-24 h-24 bg-indigo-50 text-indigo-300 rounded-full flex items-center justify-center text-4xl shadow-inner font-bold uppercase">
                        {(formData.name_first?.charAt(0) || '')}{(formData.name_last?.charAt(0) || '')}
                    </div>
                {/if}
            </div>
            <div class="flex-1 w-full">
                <span class="block text-sm font-semibold text-neutral-700 mb-1.5">Profilbild ändern</span>
                <input type="file" accept="image/png, image/jpeg, image/webp" class="w-full text-sm text-neutral-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-colors" onchange={handleFileChange} disabled={isLoading} />
            </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label for="prof-first" class="block text-sm font-semibold text-neutral-700 mb-1.5">Vorname</label><input id="prof-first" type="text" bind:value={formData.name_first} class="orga-input-clear" disabled={isLoading} /></div>
            <div><label for="prof-last" class="block text-sm font-semibold text-neutral-700 mb-1.5">Nachname</label><input id="prof-last" type="text" bind:value={formData.name_last} class="orga-input-clear" disabled={isLoading} /></div>
        </div>
        
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label for="prof-username" class="block text-sm font-semibold text-neutral-700 mb-1.5">Benutzername</label><input id="prof-username" type="text" bind:value={formData.username} class="orga-input-clear" disabled={isLoading} /></div>
            <div><label for="prof-phone" class="block text-sm font-semibold text-neutral-700 mb-1.5">Telefon (Optional)</label><input id="prof-phone" type="text" bind:value={formData.phone} class="orga-input-clear" disabled={isLoading} /></div>
        </div>
        
        <div><label for="prof-email" class="block text-sm font-semibold text-neutral-700 mb-1.5">E-Mail Adresse</label><input id="prof-email" type="email" bind:value={formData.email} class="orga-input-clear" required disabled={isLoading} /></div>
        
        <div class="pt-4 flex justify-end">
            <button type="submit" disabled={isLoading} class="orga-button-primary w-full sm:w-auto shadow-indigo-600/20 py-3 sm:py-2.5">
                {isLoading ? 'Speichert...' : 'Profil aktualisieren'}
            </button>
        </div>
    </form>
</div>