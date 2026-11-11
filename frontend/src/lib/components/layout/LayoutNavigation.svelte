<script lang="ts">
	import type { Snippet } from "svelte";
	import { pb } from "$lib/services/pocketbase";
	import { rbacService } from "$lib/services/rbacService.svelte";
	import AppSidebar from "$lib/components/AppSidebar.svelte";
	import MobileNavDrawer from "$lib/components/MobileNavDrawer.svelte";

	let { 
		isMobileMenuOpen = $bindable(false),
		isDarkMode = false
	}: {
		isMobileMenuOpen: boolean;
		isDarkMode?: boolean;
	} = $props();

	interface NavItem {
		label: string;
		href: string;
		icon: Snippet;
		group: 'core' | 'finance' | 'system';
		badgeKey?: 'requests' | 'admissions' | 'mails';
	}

	let navItems: NavItem[] = $derived.by(() => {
		const all: NavItem[] = [
			// 1. TAGESGESCHÄFT
			{ label: 'Dashboard', href: '/dashboard', icon: iconDashboard, group: 'core' },
			{ label: 'Termine', href: '/appointments', icon: iconCalendar, group: 'core', badgeKey: 'requests' },
			{ label: 'Klienten', href: '/clients', icon: iconClients, group: 'core', badgeKey: 'admissions' },
			{ label: 'Kontakte', href: '/contacts', icon: iconContacts, group: 'core' },
			{ label: 'E-Mails', href: '/mail', icon: iconMail, group: 'core', badgeKey: 'mails' },

			// 2. FINANZEN & VORLAGEN
			{ label: 'Vorlagen', href: '/documents', icon: iconDocuments, group: 'finance' },
			{ label: 'Rechnungen', href: '/invoices', icon: iconInvoices, group: 'finance' },
			{ label: 'Haushaltsbuch', href: '/finances', icon: iconWallet, group: 'finance' },
			{ label: 'BWA & Statistik', href: '/bwa', icon: iconChart, group: 'finance' },
			{ label: 'Reisekosten (VMA)', href: '/vma', icon: iconCar, group: 'finance' },

			// 3. VERWALTUNG & SYSTEM
			{ label: 'Krankenkassen', href: '/insurancies', icon: iconInsurance, group: 'system' },
			{ label: 'Firmendaten', href: '/company', icon: iconCompany, group: 'system' },
			{ label: 'Mein Profil', href: '/profile', icon: iconProfile, group: 'system' },
			{ label: 'System-Admin', href: '/admin', icon: iconAdmin, group: 'system' }
		];

		return all.filter(item => {
			// Für Mitarbeiter (Caregiver/Employee) exakt die 6 freigegebenen Module anzeigen
			if (rbacService.isCaregiver) {
				return ['Dashboard', 'Termine', 'Klienten', 'Kontakte', 'Krankenkassen', 'Mein Profil'].includes(item.label);
			}
			if (item.label === 'System-Admin') return rbacService.canAccessAdmin;
			if (item.label === 'Firmendaten') return rbacService.isAdmin;
			if (['Rechnungen', 'BWA & Statistik', 'Haushaltsbuch'].includes(item.label)) return rbacService.canAccessFinances;
			if (item.label === 'Reisekosten (VMA)') return rbacService.isOwner;
			return true;
		});
	});
</script>

{#snippet iconDashboard()}
	<svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
		<path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
	</svg>
{/snippet}

{#snippet iconCalendar()}
	<svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
		<path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
	</svg>
{/snippet}

{#snippet iconClients()}
	<svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
		<path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
	</svg>
{/snippet}

{#snippet iconContacts()}
	<svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
		<path stroke-linecap="round" stroke-linejoin="round" d="M16 2v2M8 2v2M4 7h16a2 2 0 012 2v11a2 2 0 01-2 2H4a2 2 0 01-2-2V9a2 2 0 012-2z" />
		<circle cx="12" cy="13" r="2.5" />
		<path stroke-linecap="round" stroke-linejoin="round" d="M8 19c0-1.8 1.8-3 4-3s4 1.2 4 3" />
	</svg>
{/snippet}

{#snippet iconMail()}
	<svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
		<path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
	</svg>
{/snippet}

{#snippet iconDocuments()}
	<svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
		<path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
	</svg>
{/snippet}

{#snippet iconInvoices()}
	<svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
		<path stroke-linecap="round" stroke-linejoin="round" d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
		<path stroke-linecap="round" stroke-linejoin="round" d="M15 8H9m6 4H9m4 4H9" />
	</svg>
{/snippet}

{#snippet iconWallet()}
	<svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor">
		<path stroke-linecap="round" stroke-linejoin="round" d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0-2.25-4.5M3 12l2.25-4.5M12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
	</svg>
{/snippet}

{#snippet iconChart()}
	<svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
		<path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
	</svg>
{/snippet}

{#snippet iconCar()}
	<svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
		<path stroke-linecap="round" stroke-linejoin="round" d="M19 17H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2Z" />
		<circle cx="7" cy="15" r="2" />
		<circle cx="17" cy="15" r="2" />
	</svg>
{/snippet}

{#snippet iconInsurance()}
	<svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
		<path stroke-linecap="round" stroke-linejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
		<path stroke-linecap="round" stroke-linejoin="round" d="M12 8v6m-3-3h6" />
	</svg>
{/snippet}

{#snippet iconCompany()}
	<svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
		<path stroke-linecap="round" stroke-linejoin="round" d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
		<path stroke-linecap="round" stroke-linejoin="round" d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
		<path stroke-linecap="round" stroke-linejoin="round" d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
		<path stroke-linecap="round" stroke-linejoin="round" d="M10 6h4m-4 4h4m-4 4h4m-4 4h4" />
	</svg>
{/snippet}

{#snippet iconProfile()}
	<svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
		<circle cx="12" cy="12" r="10" />
		<circle cx="12" cy="10" r="3" />
		<path stroke-linecap="round" stroke-linejoin="round" d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662" />
	</svg>
{/snippet}

{#snippet iconAdmin()}
	<svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
		<path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
		<path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
	</svg>
{/snippet}

<AppSidebar items={navItems} />
<MobileNavDrawer bind:isOpen={isMobileMenuOpen} items={navItems} {isDarkMode} />
