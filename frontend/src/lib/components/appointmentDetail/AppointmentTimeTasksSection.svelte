<script lang="ts">
    import AppointmentTimeSection from "./AppointmentTimeSection.svelte";
    import AppointmentTasksSection from "./AppointmentTasksSection.svelte";

    interface Props {
        timeRecords: any[];
        runningTimeRecord: any;
        elapsedSeconds: number;
        totalRecordedMinutes: number;
        isTimeLoading: boolean;
        isAssignedCaregiver?: boolean;
        tasks: any[];
        allTasks: any[];
        onStartTracking: () => void;
        onStopTracking: (recordId: string) => void;
        onDeleteTime: (recordId: string) => void;
        onOpenTimeModal: (record?: any) => void;
        onToggleTask: (taskId: string) => void;
        onCreateTask: (title: string) => Promise<void>;
    }

    let {
        timeRecords, runningTimeRecord, elapsedSeconds, totalRecordedMinutes, isTimeLoading,
        isAssignedCaregiver = false, tasks, allTasks,
        onStartTracking, onStopTracking, onDeleteTime, onOpenTimeModal,
        onToggleTask, onCreateTask
    }: Props = $props();
</script>

<div class="space-y-4">
    <AppointmentTimeSection
        {timeRecords}
        {runningTimeRecord}
        {elapsedSeconds}
        {totalRecordedMinutes}
        {isTimeLoading}
        {isAssignedCaregiver}
        {onStartTracking}
        {onStopTracking}
        {onDeleteTime}
        {onOpenTimeModal}
    />

    <AppointmentTasksSection
        {tasks}
        {allTasks}
        {onToggleTask}
        {onCreateTask}
    />
</div>
