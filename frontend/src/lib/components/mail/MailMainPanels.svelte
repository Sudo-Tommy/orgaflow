<script lang="ts">
  import MailList from '../MailList.svelte';
  import MailDetail from '../MailDetail.svelte';

  interface Props {
    emails: any[];
    selectedEmailId: string | null;
    currentPage: number;
    totalPages: number;
    pageSize?: number;
    isLoading: boolean;
    folderName: string;
    onEmailSelect: (id: string) => void;
    onPageChange: (page: number) => void;
    onToggleMenu: () => void;
    onComposeClick: () => void;
    onMarkAllRead: () => void;
    onRefresh: () => void;
    onDeleteEmail: (id: string) => void;
    onBulkDelete?: (ids: string[]) => void;
    onBulkMarkRead?: (ids: string[], isRead: boolean) => void;
    onToggleStar?: (id: string) => void;
    onReplyEmail: (id: string) => void;
    onForwardEmail: (id: string) => void;
    onCloseDetail: () => void;
  }

  let {
    emails,
    selectedEmailId,
    currentPage,
    totalPages,
    pageSize = 25,
    isLoading,
    folderName,
    onEmailSelect,
    onPageChange,
    onToggleMenu,
    onComposeClick,
    onMarkAllRead,
    onRefresh,
    onDeleteEmail,
    onBulkDelete,
    onBulkMarkRead,
    onToggleStar,
    onReplyEmail,
    onForwardEmail,
    onCloseDetail
  }: Props = $props();
</script>

<div class="flex-1 flex flex-col w-full min-w-0">
  {#if selectedEmailId}
    <MailDetail
      emailId={selectedEmailId}
      onDelete={() => onDeleteEmail(selectedEmailId || '')}
      onReply={() => onReplyEmail(selectedEmailId || '')}
      onForward={() => onForwardEmail(selectedEmailId || '')}
      onBack={onCloseDetail}
    />
  {:else}
    <MailList
      {emails}
      {selectedEmailId}
      {currentPage}
      {totalPages}
      {pageSize}
      {isLoading}
      {folderName}
      {onEmailSelect}
      {onPageChange}
      {onToggleMenu}
      {onComposeClick}
      {onMarkAllRead}
      {onRefresh}
      {onBulkDelete}
      {onBulkMarkRead}
      {onToggleStar}
      {onDeleteEmail}
      {onReplyEmail}
    />
  {/if}
</div>
