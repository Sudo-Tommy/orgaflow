<script lang="ts">
    import { pb } from "$lib/services/pocketbase";
    import { ClipboardList, Edit3, Calendar, Heart, Receipt, Phone, Mail, Home, MapPin, FileSignature, File as FileIcon, Check, X } from "lucide-svelte";
    import { safeFormatDate } from "$lib/services/clientDetailHelper";
    import ClientBillingBadge from "./ClientBillingBadge.svelte";
    import ClientAssignedEmployeeWidget from "./ClientAssignedEmployeeWidget.svelte";
    import { rbacService } from "$lib/services/rbacService.svelte";

    interface Props {
        client: any; careLevel: number; assignedEmployee: any; availableEmployees: any[];
        isChangingEmployee: boolean; onEdit: () => void; onAssignEmployee: (empId: string) => void;
        onUnlinkEmployee: () => void; onToggleChangingEmployee: () => void;
        onInlineUpdate: (field: string, val: string) => Promise<void>;
    }

    let {
        client, careLevel, assignedEmployee, availableEmployees, isChangingEmployee,
        onEdit, onAssignEmployee, onUnlinkEmployee, onToggleChangingEmployee, onInlineUpdate
    }: Props = $props();

    let editingField = $state<'phone' | 'email' | null>(null);
    let editValue = $state("");
    let isSavingInline = $state(false);

    function startInlineEdit(field: 'phone' | 'email') { editingField = field; editValue = client?.[field] || ""; }
    async function commitInlineEdit() {
        if (!editingField) return;
        isSavingInline = true;
        await onInlineUpdate(editingField, editValue.trim());
        isSavingInline = false;
        editingField = null;
    }
    function cancelInlineEdit() { editingField = null; editValue = ""; }
</script>

<div class="orga-card-white p-4 sm:p-6 space-y-4">
    <div class="flex items-center justify-between border-b border-neutral-100 dark:border-slate-800 pb-3">
        <h3 class="text-sm sm:text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <span class="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                <ClipboardList class="w-4 h-4" />
            </span>
            Stammdaten & Anschrift
        </h3>
        {#if rbacService.canEditClient(client)}
            <button
                type="button"
                onclick={onEdit}
                class="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
            >
                <Edit3 class="w-3.5 h-3.5" />
                <span>Alle Daten bearbeiten</span>
            </button>
        {/if}
    </div>

    <!-- 2-Col Grid for Core Client Info -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <!-- Geburtsdatum -->
        <div class="p-3 bg-neutral-50 dark:bg-slate-800/60 rounded-xl border border-neutral-100 dark:border-slate-700/80 flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 flex items-center justify-center shrink-0">
                <Calendar class="w-4 h-4" />
            </div>
            <div class="min-w-0">
                <p class="text-[9px] font-bold uppercase tracking-wider text-neutral-400 dark:text-slate-400">Geburtsdatum</p>
                <p class="text-xs font-bold text-neutral-900 dark:text-white truncate">{safeFormatDate(client?.birthdate)}</p>
            </div>
        </div>

        <!-- Pflegegrad -->
        <div class="p-3 bg-neutral-50 dark:bg-slate-800/60 rounded-xl border border-neutral-100 dark:border-slate-700/80 flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 flex items-center justify-center shrink-0">
                <Heart class="w-4 h-4" />
            </div>
            <div class="min-w-0">
                <p class="text-[9px] font-bold uppercase tracking-wider text-neutral-400 dark:text-slate-400">Pflegegrad</p>
                <p class="text-xs font-bold text-neutral-900 dark:text-white truncate">
                    {careLevel > 0 ? `Pflegegrad ${careLevel}` : 'Kein Pflegegrad'}
                </p>
            </div>
        </div>

        {#if rbacService.canAccessFinances}
            <!-- Standard-Abrechnungsart (Glance-and-Edit) -->
            <div class="p-3 bg-neutral-50 dark:bg-slate-800/60 rounded-xl border border-neutral-100 dark:border-slate-700/80 flex items-center justify-between gap-2 sm:col-span-2">
                <div class="flex items-center gap-2.5 min-w-0">
                    <div class="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shrink-0">
                        <Receipt class="w-4 h-4" />
                    </div>
                    <div class="min-w-0">
                        <p class="text-[9px] font-bold uppercase tracking-wider text-neutral-400 dark:text-slate-400">Standard-Abrechnungsart</p>
                        <p class="text-[10px] text-neutral-400 dark:text-slate-500">1-Klick Schnellauswahl</p>
                    </div>
                </div>
                <div class="shrink-0">
                    <ClientBillingBadge {client} />
                </div>
            </div>
        {/if}

        <!-- Phone (Glance-and-Edit) -->
        <div class="p-3 bg-neutral-50 dark:bg-slate-800/60 rounded-xl border border-neutral-100 dark:border-slate-700/80 flex items-center justify-between gap-2">
            <div class="flex items-center gap-2.5 min-w-0 flex-1">
                <div class="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 flex items-center justify-center shrink-0">
                    <Phone class="w-4 h-4" />
                </div>
                <div class="min-w-0 flex-1">
                    <p class="text-[9px] font-bold uppercase tracking-wider text-neutral-400 dark:text-slate-400">Telefon</p>
                    {#if editingField === 'phone'}
                        <div class="flex items-center gap-1 mt-0.5">
                            <input
                                type="text"
                                bind:value={editValue}
                                class="orga-input-clear py-0.5 px-1.5 text-xs w-full"
                                placeholder="Telefonnr..."
                                onkeydown={(e) => { if (e.key === 'Enter') commitInlineEdit(); if (e.key === 'Escape') cancelInlineEdit(); }}
                            />
                            <button type="button" onclick={commitInlineEdit} disabled={isSavingInline} class="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Check class="w-3.5 h-3.5" /></button>
                            <button type="button" onclick={cancelInlineEdit} class="p-1 text-neutral-400 hover:bg-neutral-100 rounded"><X class="w-3.5 h-3.5" /></button>
                        </div>
                    {:else}
                        {#if client?.phone}
                            <a href={`tel:${client.phone}`} class="text-xs font-bold text-blue-700 dark:text-blue-400 hover:underline block truncate">
                                {client.phone}
                            </a>
                        {:else if rbacService.canEditClient(client)}
                            <button type="button" onclick={() => startInlineEdit('phone')} class="text-xs text-neutral-400 dark:text-slate-500 hover:underline italic cursor-pointer">
                                + Hinterlegen
                            </button>
                        {:else}
                            <span class="text-xs text-neutral-400 dark:text-slate-500 italic">-</span>
                        {/if}
                    {/if}
                </div>
            </div>
            {#if editingField !== 'phone' && rbacService.canEditClient(client)}
                <button type="button" onclick={() => startInlineEdit('phone')} class="p-1 text-neutral-400 hover:text-indigo-600 rounded cursor-pointer" title="Telefon bearbeiten"><Edit3 class="w-3 h-3" /></button>
            {/if}
        </div>

        <!-- Email (Glance-and-Edit) -->
        <div class="p-3 bg-neutral-50 dark:bg-slate-800/60 rounded-xl border border-neutral-100 dark:border-slate-700/80 flex items-center justify-between gap-2">
            <div class="flex items-center gap-2.5 min-w-0 flex-1">
                <div class="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shrink-0">
                    <Mail class="w-4 h-4" />
                </div>
                <div class="min-w-0 flex-1">
                    <p class="text-[9px] font-bold uppercase tracking-wider text-neutral-400 dark:text-slate-400">E-Mail</p>
                    {#if editingField === 'email'}
                        <div class="flex items-center gap-1 mt-0.5">
                            <input
                                type="email"
                                bind:value={editValue}
                                class="orga-input-clear py-0.5 px-1.5 text-xs w-full"
                                placeholder="E-Mail..."
                                onkeydown={(e) => { if (e.key === 'Enter') commitInlineEdit(); if (e.key === 'Escape') cancelInlineEdit(); }}
                            />
                            <button type="button" onclick={commitInlineEdit} disabled={isSavingInline} class="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Check class="w-3.5 h-3.5" /></button>
                            <button type="button" onclick={cancelInlineEdit} class="p-1 text-neutral-400 hover:bg-neutral-100 rounded"><X class="w-3.5 h-3.5" /></button>
                        </div>
                    {:else}
                        {#if client?.email}
                            <a href={`mailto:${client.email}`} class="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline block truncate" title={client.email}>
                                {client.email}
                            </a>
                        {:else if rbacService.canEditClient(client)}
                            <button type="button" onclick={() => startInlineEdit('email')} class="text-xs text-neutral-400 dark:text-slate-500 hover:underline italic cursor-pointer">
                                + Hinterlegen
                            </button>
                        {:else}
                            <span class="text-xs text-neutral-400 dark:text-slate-500 italic">-</span>
                        {/if}
                    {/if}
                </div>
            </div>
            {#if editingField !== 'email' && rbacService.canEditClient(client)}
                <button type="button" onclick={() => startInlineEdit('email')} class="p-1 text-neutral-400 hover:text-indigo-600 rounded cursor-pointer" title="E-Mail bearbeiten"><Edit3 class="w-3 h-3" /></button>
            {/if}
        </div>
    </div>

    <!-- Address with Google Maps Button -->
    <div class="p-3 bg-neutral-50 dark:bg-slate-800/60 rounded-xl border border-neutral-100 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-2.5">
        <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-300 flex items-center justify-center shrink-0">
                <Home class="w-4 h-4" />
            </div>
            <div class="min-w-0">
                <p class="text-[9px] font-bold uppercase tracking-wider text-neutral-400 dark:text-slate-400">Wohnadresse</p>
                <p class="text-xs font-bold text-neutral-900 dark:text-white truncate">
                    {#if client?.street || client?.city}
                        {client.street || ''} {client.housenr || ''}, {client.zip || ''} {client.city || ''}
                    {:else}
                        <span class="text-neutral-400 dark:text-slate-500 italic font-normal">Keine Adresse hinterlegt</span>
                    {/if}
                </p>
            </div>
        </div>

        {#if client?.street || client?.city}
            <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${client.street || ''} ${client.housenr || ''}, ${client.zip || ''} ${client.city || ''}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-slate-600 border border-blue-200 dark:border-slate-600 px-2.5 py-1.5 rounded-lg transition-all shadow-2xs shrink-0"
            >
                <MapPin class="w-3 h-3 text-blue-600 dark:text-blue-400" />
                <span>Maps Route</span>
            </a>
        {/if}
    </div>

    <!-- Assigned Assistant Widget -->
    <ClientAssignedEmployeeWidget
        {assignedEmployee}
        {availableEmployees}
        {isChangingEmployee}
        {onAssignEmployee}
        {onUnlinkEmployee}
        {onToggleChangingEmployee}
    />

    <!-- Client Signature Preview (if exists) -->
    {#if client?.sign}
        <div class="p-3 bg-neutral-50 dark:bg-slate-800/60 rounded-xl border border-neutral-100 dark:border-slate-700/80 border-l-4 border-l-purple-500 flex items-center justify-between gap-3">
            <div>
                <p class="text-[9px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-1">
                    <FileSignature class="w-3.5 h-3.5" /> Unterschrift
                </p>
                <p class="text-[10px] text-neutral-500 dark:text-slate-400 mt-0.5">
                    {rbacService.canAccessFinances ? 'Automatisch in Rechnungen genutzt' : 'Hinterlegte Klienten-Unterschrift'}
                </p>
            </div>
            <div class="bg-white dark:bg-white p-1 rounded-lg border border-neutral-200 shadow-2xs shrink-0">
                {#if client.sign.toLowerCase().endsWith('.pdf')}
                    <a href={pb.files.getURL(client, client.sign)} target="_blank" rel="noopener noreferrer" class="text-xs font-bold text-indigo-600 flex items-center gap-1 p-1">
                        <FileIcon class="w-3.5 h-3.5" /> PDF
                    </a>
                {:else}
                    <img src={pb.files.getURL(client, client.sign)} alt="Unterschrift" class="max-h-8 object-contain" />
                {/if}
            </div>
        </div>
    {/if}
</div>
