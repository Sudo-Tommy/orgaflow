<script lang="ts">
    import { toastStore } from "$lib/services/toastService.svelte";
    import { pb } from "$lib/services/pocketbase";
    import { X, User, Trash2, Maximize2, RotateCcw, PenTool, Upload } from "lucide-svelte";

    let dialog: HTMLDialogElement | undefined = $state();
    let isLoading = $state(false);
    let errorMsg = $state("");
    let successMsg = $state("");

    let formData = $state({
        name_first: "",
        name_last: "",
        email: "",
        phone: "",
        street: "",
        housenr: "",
        zip: "",
        city: ""
    });

    // --- Unterschrift State ---
    let existingSignUrl = $state("");
    let deleteSign = $state(false);
    let signatureMode = $state<"draw" | "upload">("draw");
    let canvas = $state<HTMLCanvasElement | null>(null);
    let isDrawing = false;
    let hasDrawnSignature = $state(false);
    let isSignatureFullscreen = $state(false);
    let uploadedFile = $state<File | null>(null);
    let uploadedPreviewUrl = $state("");

    // --- PIN Ändern State ---
    let currentPin = $state("");
    let newPin = $state("");
    let isPinChanging = $state(false);
    let pinChangeMsg = $state("");
    let pinChangeSuccess = $state(false);

    export async function open() {
        errorMsg = "";
        successMsg = "";
        deleteSign = false;
        hasDrawnSignature = false;
        uploadedFile = null;
        uploadedPreviewUrl = "";
        signatureMode = "draw";
        dialog?.showModal();
        
        // Lade die aktuellen Daten des Nutzers
        isLoading = true;
        try {
            const token = localStorage.getItem('portal_token') || sessionStorage.getItem('portal_token');
            const apiBaseUrl = (typeof window !== 'undefined' && !window.location.hostname.includes('ihre-seniorenassistenz.com')) ? `http://${window.location.hostname}:3000/portal` : '/api/emails/portal';
            
            const res = await fetch(`${apiBaseUrl}/profile`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.profile) {
                    formData = {
                        name_first: data.profile.name_first || "",
                        name_last: data.profile.name_last || "",
                        email: data.profile.email || "",
                        phone: data.profile.phone || data.profile.handy || "",
                        street: data.profile.street || "",
                        housenr: data.profile.housenr || "",
                        zip: data.profile.zip || "",
                        city: data.profile.city || ""
                    };

                    if (data.profile.signUrl) {
                        existingSignUrl = data.profile.signUrl;
                    } else if (data.profile.sign) {
                        existingSignUrl = pb.files.getURL(data.profile, data.profile.sign);
                    } else {
                        existingSignUrl = "";
                    }
                }
            }
        } catch (e) {
            console.error("Fehler beim Laden des Profils");
            errorMsg = "Profildaten konnten nicht geladen werden.";
        } finally {
            isLoading = false;
        }
    }

    export function close() {
        isSignatureFullscreen = false;
        dialog?.close();
    }

    // --- Zeichen-Funktionen für Touch & Maus ---
    function getPointerPos(e: MouseEvent | TouchEvent) {
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        let clientX = 0, clientY = 0;
        if (typeof window !== 'undefined' && window.TouchEvent && e instanceof TouchEvent) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as MouseEvent).clientX;
            clientY = (e as MouseEvent).clientY;
        }
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
    }

    function startDrawing(e: MouseEvent | TouchEvent) {
        if (!canvas) return;
        e.preventDefault();
        isDrawing = true;
        hasDrawnSignature = true;
        const pos = getPointerPos(e);
        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.lineWidth = 6;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.strokeStyle = "#0f172a"; // Tiefes Anthrazit für sauberen Tintenschnitt
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
        }
    }

    function draw(e: MouseEvent | TouchEvent) {
        if (!isDrawing || !canvas) return;
        e.preventDefault();
        const pos = getPointerPos(e);
        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
        }
    }

    function stopDrawing() {
        isDrawing = false;
    }

    function clearSignature() {
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        hasDrawnSignature = false;
    }

    function handleFileChange(e: Event) {
        const target = e.target as HTMLInputElement;
        if (target.files && target.files.length > 0) {
            uploadedFile = target.files[0];
            const reader = new FileReader();
            reader.onload = () => {
                uploadedPreviewUrl = reader.result as string;
            };
            reader.readAsDataURL(uploadedFile);
        } else {
            uploadedFile = null;
            uploadedPreviewUrl = "";
        }
    }

    async function saveProfile() {
        isLoading = true;
        errorMsg = "";
        successMsg = "";
        try {
            const token = localStorage.getItem('portal_token') || sessionStorage.getItem('portal_token');
            const apiBaseUrl = (typeof window !== 'undefined' && !window.location.hostname.includes('ihre-seniorenassistenz.com')) ? `http://${window.location.hostname}:3000/portal` : '/api/emails/portal';
            
            const payload: any = {
                ...formData
            };

            // Unterschrift mit übermitteln, falls gezeichnet oder hochgeladen
            if (signatureMode === 'draw' && hasDrawnSignature && canvas) {
                payload.signature_base64 = canvas.toDataURL("image/png");
            } else if (signatureMode === 'upload' && uploadedPreviewUrl) {
                payload.signature_base64 = uploadedPreviewUrl;
            } else if (deleteSign) {
                payload.delete_signature = true;
            }

            const res = await fetch(`${apiBaseUrl}/profile`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Fehler beim Speichern");
            
            if (data.profile?.signUrl) {
                existingSignUrl = data.profile.signUrl;
            } else if (payload.delete_signature) {
                existingSignUrl = "";
            }
            deleteSign = false;
            hasDrawnSignature = false;
            uploadedFile = null;
            uploadedPreviewUrl = "";

            toastStore.success("Profil & Unterschrift erfolgreich aktualisiert!");
            close();
        } catch (err: any) {
            errorMsg = err.message || "Es ist ein Fehler aufgetreten.";
        } finally {
            isLoading = false;
        }
    }

    async function changePin() {
        if (!newPin || newPin.trim().length < 4) {
            pinChangeMsg = "Die neue PIN muss mindestens 4 Ziffern lang sein.";
            pinChangeSuccess = false;
            return;
        }

        isPinChanging = true;
        pinChangeMsg = "";

        try {
            const token = localStorage.getItem('portal_token') || sessionStorage.getItem('portal_token');
            const apiBaseUrl = (typeof window !== 'undefined' && !window.location.hostname.includes('ihre-seniorenassistenz.com')) ? `http://${window.location.hostname}:3000/portal` : '/api/emails/portal';

            const res = await fetch(`${apiBaseUrl}/change-pin`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ currentPin, newPin: newPin.trim() })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Fehler beim Ändern der PIN.");

            pinChangeMsg = "PIN erfolgreich geändert!";
            pinChangeSuccess = true;
            currentPin = "";
            newPin = "";
            toastStore.success("Portal-PIN erfolgreich geändert.");
        } catch (err: any) {
            pinChangeMsg = err.message || "Fehler beim Ändern der PIN.";
            pinChangeSuccess = false;
        } finally {
            isPinChanging = false;
        }
    }
</script>

<dialog bind:this={dialog} class="p-0 bg-transparent backdrop:bg-slate-950/60 backdrop:backdrop-blur-sm w-full max-w-2xl m-0 sm:m-auto max-h-none sm:max-h-fit rounded-none sm:rounded-3xl" onclick={(e) => { if (e.target === dialog) close(); }}>
    <div class="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-neutral-100 dark:border-slate-800 sm:rounded-3xl w-full h-dvh sm:h-auto sm:max-h-[90dvh] flex flex-col relative overflow-hidden shadow-2xl">
        <div class="px-6 md:px-8 py-5 border-b border-neutral-100 dark:border-slate-800 shrink-0 sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-20 flex justify-between items-center">
            <h2 class="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2"><User class="w-6 h-6 text-emerald-600 dark:text-emerald-400" /> Ihr Profil</h2>
            <button aria-label="Schließen" onclick={close} class="w-11 h-11 min-w-[44px] min-h-[44px] bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 text-neutral-600 dark:text-slate-300 rounded-full flex items-center justify-center transition-colors cursor-pointer">
                <X class="w-5 h-5" />
            </button>
        </div>
        
        <div class="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 space-y-6 bg-neutral-50/50 dark:bg-slate-950/50">
            {#if errorMsg}<div class="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 p-4 rounded-xl text-sm font-medium border border-red-100 dark:border-red-900/60 animate-enter">{errorMsg}</div>{/if}
            
            <form id="portalProfileForm" onsubmit={(e) => { e.preventDefault(); saveProfile(); }} class="space-y-5 pb-2">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label for="prof-first" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Vorname</label><input id="prof-first" type="text" bind:value={formData.name_first} class="orga-input-clear py-2.5 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" disabled={isLoading} required /></div>
                    <div><label for="prof-last" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Nachname</label><input id="prof-last" type="text" bind:value={formData.name_last} class="orga-input-clear py-2.5 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" disabled={isLoading} required /></div>
                </div>
                <div><label for="prof-email" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">E-Mail</label><input id="prof-email" type="email" bind:value={formData.email} class="orga-input-clear py-2.5 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" disabled={isLoading} required /></div>
                <div><label for="prof-phone" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Telefon / Mobil</label><input id="prof-phone" type="text" bind:value={formData.phone} class="orga-input-clear py-2.5 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" disabled={isLoading} /></div>
                
                <div class="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-4 border-t border-neutral-100 dark:border-slate-800">
                    <div class="sm:col-span-3"><label for="prof-street" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Straße</label><input id="prof-street" type="text" bind:value={formData.street} class="orga-input-clear py-2.5 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" disabled={isLoading} /></div>
                    <div><label for="prof-housenr" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Hausnr.</label><input id="prof-housenr" type="text" bind:value={formData.housenr} class="orga-input-clear py-2.5 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" disabled={isLoading} /></div>
                    <div><label for="prof-zip" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">PLZ</label><input id="prof-zip" type="text" bind:value={formData.zip} class="orga-input-clear py-2.5 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" disabled={isLoading} /></div>
                    <div class="sm:col-span-3"><label for="prof-city" class="block text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-1.5">Stadt</label><input id="prof-city" type="text" bind:value={formData.city} class="orga-input-clear py-2.5 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" disabled={isLoading} /></div>
                </div>

                <!-- UNTERSCHRIFT BEREICH -->
                <div class="pt-6 border-t border-neutral-200 dark:border-slate-800">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                        <div>
                            <h3 class="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                                <span class="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 flex items-center justify-center text-xs shadow-inner">✍️</span>
                                Ihre Unterschrift
                            </h3>
                            <p class="text-xs text-neutral-500 dark:text-slate-400 mt-0.5">Ihre hinterlegte Unterschrift für Leistungsnachweise und Bestätigungen.</p>
                        </div>
                        {#if (!existingSignUrl || deleteSign)}
                            <div class="flex bg-neutral-100 dark:bg-slate-800 p-1 rounded-lg border border-neutral-200/80 dark:border-slate-700 shrink-0">
                                <button 
                                    type="button" 
                                    onclick={() => signatureMode = 'draw'} 
                                    class="px-3 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer {signatureMode === 'draw' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-300' : 'text-neutral-500 dark:text-slate-400 hover:text-neutral-700 dark:hover:text-white'}">
                                    Zeichnen
                                </button>
                                <button 
                                    type="button" 
                                    onclick={() => signatureMode = 'upload'} 
                                    class="px-3 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer {signatureMode === 'upload' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-300' : 'text-neutral-500 dark:text-slate-400 hover:text-neutral-700 dark:hover:text-white'}">
                                    Hochladen
                                </button>
                            </div>
                        {/if}
                    </div>

                    {#if existingSignUrl && !deleteSign}
                        <!-- Bestehende Unterschrift anzeigen (Clean white card to keep black ink natural) -->
                        <div class="bg-neutral-50 dark:bg-slate-800/80 border border-neutral-200 dark:border-slate-700 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 animate-enter">
                            <div class="bg-white rounded-xl p-3 border border-neutral-200 shadow-sm max-w-full flex items-center justify-center">
                                <img src={existingSignUrl} alt="Hinterlegte Unterschrift" class="max-h-24 max-w-full object-contain mx-auto" />
                            </div>
                            <div class="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                                <button 
                                    type="button" 
                                    onclick={() => { deleteSign = true; hasDrawnSignature = false; uploadedFile = null; uploadedPreviewUrl = ""; }} 
                                    class="orga-button-ghost text-xs font-bold text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-700 border border-indigo-200 dark:border-slate-700 py-2.5 px-4 w-full sm:w-auto flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer">
                                    <span>✍️</span> Unterschrift neu aufnehmen
                                </button>
                            </div>
                        </div>
                    {:else if signatureMode === 'draw'}
                        <!-- Unterschrift per Touch / Maus zeichnen (Pure white drawing canvas for clean legibility) -->
                        <div class="{isSignatureFullscreen ? 'fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-6 touch-none' : 'block relative w-full p-0 m-0 bg-white border-2 border-dashed border-neutral-300 dark:border-slate-700 rounded-2xl overflow-hidden touch-none'}">
                            {#if isSignatureFullscreen}
                                <div class="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-t-3xl flex items-center justify-between p-4 sm:p-5 border-b border-neutral-200 dark:border-slate-800 shrink-0 shadow-lg">
                                    <h3 class="font-bold text-base sm:text-xl text-neutral-900 dark:text-white flex items-center gap-2">
                                        <span class="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 flex items-center justify-center text-xs shadow-inner">✍️</span>
                                        Bitte hier mit Finger oder Stift unterschreiben
                                    </h3>
                                    <div class="flex items-center gap-2">
                                        <button type="button" onclick={clearSignature} class="px-3 py-2 bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 text-neutral-700 dark:text-slate-300 text-xs sm:text-sm font-bold rounded-xl transition-colors active:scale-95 cursor-pointer">Leeren</button>
                                        <button type="button" onclick={() => isSignatureFullscreen = false} class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-colors shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer">Fertig</button>
                                    </div>
                                </div>
                            {/if}

                            <div class="{isSignatureFullscreen ? 'w-full max-w-4xl bg-neutral-50 dark:bg-slate-900 rounded-b-3xl p-3 sm:p-6 flex items-center justify-center relative shadow-2xl' : 'w-full relative'}">
                                <div class="relative w-full aspect-3/1 min-h-[140px] bg-white {isSignatureFullscreen ? 'border-4 border-dashed border-neutral-300 dark:border-slate-700 rounded-2xl shadow-inner' : ''}">
                                    <canvas 
                                        bind:this={canvas} 
                                        width="1200" height="400" 
                                        class="w-full h-full cursor-crosshair touch-none bg-white {isSignatureFullscreen ? 'rounded-2xl' : ''}"
                                        onmousedown={startDrawing} onmousemove={draw} onmouseup={stopDrawing} onmouseleave={stopDrawing}
                                        ontouchstart={startDrawing} ontouchmove={draw} ontouchend={stopDrawing}
                                    ></canvas>
                                    {#if !hasDrawnSignature}
                                        <div class="absolute inset-0 pointer-events-none flex items-center justify-center text-neutral-400 font-bold {isSignatureFullscreen ? 'text-2xl sm:text-3xl opacity-50' : 'text-sm font-medium'}">
                                            Hier mit Finger oder Maus unterschreiben
                                        </div>
                                    {/if}
                                </div>
                            </div>

                            {#if !isSignatureFullscreen}
                                <div class="absolute top-2 right-2 flex items-center gap-2 z-10">
                                    <button 
                                        type="button" 
                                        onclick={() => isSignatureFullscreen = true} 
                                        class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm flex items-center gap-1.5 active:scale-95 cursor-pointer"
                                        title="Für mehr Platz auf dem ganzen Bildschirm unterschreiben">
                                        <span>🔍</span> Groß machen
                                    </button>
                                    {#if hasDrawnSignature}
                                        <button 
                                            type="button" 
                                            onclick={clearSignature} 
                                            class="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold rounded-lg transition-colors active:scale-95 cursor-pointer">
                                            Leeren
                                        </button>
                                    {/if}
                                    {#if deleteSign && existingSignUrl}
                                        <button 
                                            type="button" 
                                            onclick={() => { deleteSign = false; clearSignature(); }} 
                                            class="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 text-xs font-bold rounded-lg transition-colors cursor-pointer">
                                            Abbrechen
                                        </button>
                                    {/if}
                                </div>
                            {/if}
                        </div>
                    {:else}
                        <!-- Bilddatei hochladen -->
                        <div class="bg-neutral-50 dark:bg-slate-800/80 border-2 border-dashed border-neutral-200 dark:border-slate-700 rounded-2xl p-6 text-center">
                            {#if uploadedPreviewUrl}
                                <div class="mb-3">
                                    <img src={uploadedPreviewUrl} alt="Vorschau der Unterschrift" class="max-h-24 mx-auto bg-white border border-neutral-200 rounded-xl p-2 shadow-sm object-contain" />
                                </div>
                                <button type="button" onclick={() => { uploadedFile = null; uploadedPreviewUrl = ""; }} class="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer">
                                    ✕ Anderes Bild wählen
                                </button>
                            {:else}
                                <input 
                                    type="file" 
                                    accept="image/png, image/jpeg, image/webp" 
                                    class="w-full text-xs text-neutral-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 dark:file:bg-indigo-950/60 file:text-indigo-700 dark:file:text-indigo-400 hover:file:bg-indigo-100 transition-colors cursor-pointer" 
                                    onchange={handleFileChange} 
                                />
                                <p class="text-[11px] text-neutral-400 dark:text-slate-400 mt-2">Unterstützt PNG, JPG oder WEBP (max. 5 MB)</p>
                            {/if}
                            {#if deleteSign && existingSignUrl}
                                <div class="mt-3">
                                    <button 
                                        type="button" 
                                        onclick={() => { deleteSign = false; uploadedFile = null; uploadedPreviewUrl = ""; }} 
                                        class="text-xs font-bold text-neutral-500 dark:text-slate-400 hover:text-neutral-700 dark:hover:text-white cursor-pointer">
                                        Abbrechen & bisherige Unterschrift behalten
                                    </button>
                                </div>
                            {/if}
                        </div>
                    {/if}
                </div>
            </form>

            <!-- PIN ÄNDERN BEREICH -->
            <div class="pt-6 border-t border-neutral-200 dark:border-slate-800">
                <h3 class="text-sm font-bold text-neutral-900 dark:text-white mb-1 flex items-center gap-2">
                    <span>🔐</span> Persönliche Portal-PIN ändern
                </h3>
                <p class="text-xs text-neutral-500 dark:text-slate-400 mb-4">Hier können Sie Ihre 4- bis 6-stellige PIN für den Login am Computer oder Laptop anpassen.</p>
                
                {#if pinChangeMsg}
                    <div class="p-3 rounded-xl mb-4 text-xs font-bold {pinChangeSuccess ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60'}">
                        {pinChangeMsg}
                    </div>
                {/if}

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label for="cur-pin" class="block text-xs font-semibold text-neutral-700 dark:text-slate-300 mb-1">Bisherige PIN (falls vorhanden)</label>
                        <input id="cur-pin" type="password" bind:value={currentPin} placeholder="Bisherige PIN" class="orga-input-clear py-2.5 text-sm font-mono dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" disabled={isPinChanging} />
                    </div>
                    <div>
                        <label for="new-pin" class="block text-xs font-semibold text-neutral-700 dark:text-slate-300 mb-1">Neue Wunsch-PIN (mind. 4 Ziffern)</label>
                        <input id="new-pin" type="text" bind:value={newPin} placeholder="z. B. 123456" maxlength="12" class="orga-input-clear py-2.5 text-sm font-mono dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" disabled={isPinChanging} />
                    </div>
                </div>
                <div class="mt-3 flex justify-end">
                    <button type="button" onclick={changePin} disabled={isPinChanging || !newPin.trim() || newPin.trim().length < 4} class="orga-button-ghost min-h-[44px] py-2 px-4 text-xs font-bold text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 border border-indigo-200 dark:border-slate-700 shadow-xs cursor-pointer">
                        {isPinChanging ? 'Ändere PIN...' : 'Neue PIN speichern'}
                    </button>
                </div>
            </div>
        </div>
        <div class="p-4 sm:p-6 border-t border-neutral-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shrink-0 sticky bottom-0 z-20 pb-[max(env(safe-area-inset-bottom,0px),1rem)]">
            <div class="flex flex-col-reverse sm:flex-row justify-end gap-3">
                <button type="button" onclick={close} class="orga-button-ghost w-full sm:w-auto min-h-[44px] py-3 sm:py-2.5 dark:text-slate-300 dark:hover:bg-slate-800" disabled={isLoading}>Abbrechen</button>
                <button type="submit" form="portalProfileForm" class="orga-button-primary bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20 w-full sm:w-auto min-h-[44px] py-3 sm:py-2.5 cursor-pointer" disabled={isLoading}>{isLoading ? "Speichert..." : "Profil & Unterschrift speichern"}</button>
            </div>
        </div>
    </div>
</dialog>