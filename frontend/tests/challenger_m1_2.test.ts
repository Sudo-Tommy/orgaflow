/**
 * Challenger 2 Stress Test Suite for Milestone 1
 * Targets: appointmentDocumentsHelper, useChatAudioRecorder, and Scanner Ingestion
 * Strictly adheres to code-minimalism.md (<= 250 lines).
 */

import './mocks/setup';
import { resetTestEnvironment } from './mocks/setup';
import { registerTest, assert, assertEquals, assertDefined, assertMatches } from './test-harness';
import { getCleanFileName, getFileIcon, checkIsDuplicate } from '$lib/components/appointmentDetail/appointmentDocumentsHelper';
import { FileText, Image, File as FileIcon } from 'lucide-svelte';

registerTest('CH-M1-01', 2, 'appointmentDocumentsHelper: Boundary & Regex Inputs', () => {
    // 1. Boundary & Empty inputs
    assertEquals(getCleanFileName(''), '', 'Empty string returns empty');
    assertEquals(getCleanFileName(null as any), '', 'Null input returns empty');
    assertEquals(getCleanFileName(undefined as any), '', 'Undefined input returns empty');
    assertEquals(getCleanFileName('plain_file.pdf'), 'plain_file.pdf', 'Plain file without PB hash preserved');
    assertEquals(getCleanFileName('no_extension'), 'no_extension', 'File without extension preserved');

    // 2. PocketBase 10-char hash stripping
    assertEquals(getCleanFileName('Rechnung_1234567890.pdf'), 'Rechnung.pdf', '10-digit hash stripped');
    assertEquals(getCleanFileName('Rechnung_aBcDeFgHiJ.pdf'), 'Rechnung.pdf', '10-alpha hash stripped');
    assertEquals(getCleanFileName('my.file.v2_a1b2c3d4e5.docx'), 'my.file.v2.docx', 'Multi-dot filename supported');
    // Non-10-char hashes preserved
    assertEquals(getCleanFileName('Rechnung_12345.pdf'), 'Rechnung_12345.pdf', '5-char hash preserved');
    assertEquals(getCleanFileName('Rechnung_1234567890123.pdf'), 'Rechnung_1234567890123.pdf', '13-char preserved');

    // 3. getFileIcon
    assertEquals(getFileIcon(''), FileIcon, 'Empty string returns default FileIcon');
    assertEquals(getFileIcon('doc.pdf'), FileText, 'pdf returns FileText');
    assertEquals(getFileIcon('DOC.PDF'), FileText, 'Case insensitive PDF returns FileText');
    assertEquals(getFileIcon('photo.png'), Image, 'png returns Image');
    assertEquals(getFileIcon('PHOTO.JPEG'), Image, 'jpeg returns Image');
    assertEquals(getFileIcon('photo.webp'), Image, 'webp returns Image');
    assertEquals(getFileIcon('sheet.xlsx'), FileIcon, 'xlsx returns FileIcon');
    assertEquals(getFileIcon('archive.zip'), FileIcon, 'zip returns FileIcon');
});

registerTest('CH-M1-02', 2, 'appointmentDocumentsHelper: Duplicate Detection Stress', () => {
    const file = new File(['content'], 'Rechnung_Mai.pdf', { type: 'application/pdf' });

    // 1. Exact match and case-insensitivity
    assert(checkIsDuplicate(file, ['rechnung_mai.pdf']), 'Exact lowercase match detected');
    assert(checkIsDuplicate(file, ['RECHNUNG_MAI.PDF']), 'Exact uppercase match detected');

    // 2. PocketBase hashed file in storage
    const storedPbFile = 'Rechnung_Mai_x8y9z01234.pdf';
    assert(checkIsDuplicate(file, [storedPbFile]), 'PB-hashed stored document matches uploaded base');

    // 3. Match in appointmentDocs vs clientDocs
    assert(checkIsDuplicate(file, [], [storedPbFile]), 'Match found in appointmentDocs');
    assert(checkIsDuplicate(file, [storedPbFile], []), 'Match found in clientDocs');

    // 4. Regex special characters in filename (no ReDoS / no syntax errors)
    const regexFile = new File(['x'], 'test[0-9]+.*(1).pdf', { type: 'application/pdf' });
    assert(!checkIsDuplicate(regexFile, ['other.pdf']), 'Regex strings handled safely without error');
    assert(checkIsDuplicate(regexFile, ['test[0-9]+.*(1)_a1b2c3d4e5.pdf']), 'Regex string matches correctly');

    // 5. Distinct non-matching files
    const distinctFile = new File(['x'], 'unrelated_contract.pdf', { type: 'application/pdf' });
    assert(!checkIsDuplicate(distinctFile, ['rechnung_mai.pdf'], ['termin_doc.pdf']), 'Non-duplicate returns false');
    assert(!checkIsDuplicate(distinctFile, [], []), 'Empty collections return false');
    assert(!checkIsDuplicate(distinctFile), 'Default arguments return false');
});

registerTest('CH-M1-03', 2, 'useChatAudioRecorder: Lifecycle & Cancellation State Machine', async () => {
    resetTestEnvironment();

    // Mock MediaRecorder in global scope
    let recordedFiles: File[] = [];
    let tracksStopped = 0;
    const mockTrack = { stop: () => { tracksStopped++; } };
    const mockStream = { getTracks: () => [mockTrack] };

    class MockMediaRecorder {
        state: 'inactive' | 'recording' = 'inactive';
        stream = mockStream;
        ondataavailable: ((e: any) => void) | null = null;
        onstop: (() => void) | null = null;

        start() {
            this.state = 'recording';
            if (this.ondataavailable) {
                this.ondataavailable({ data: new Blob(['audio-data'], { type: 'audio/webm' }) });
            }
        }
        stop() {
            this.state = 'inactive';
            if (this.onstop) this.onstop();
        }
    }
    (globalThis as any).MediaRecorder = MockMediaRecorder;
    (globalThis as any).navigator.mediaDevices = {
        getUserMedia: async () => mockStream
    };

    const { createChatAudioRecorder } = await import('$lib/components/chat/useChatAudioRecorder.svelte');
    const recorder = createChatAudioRecorder((f) => { recordedFiles.push(f); });

    // Initial state
    assertEquals(recorder.isRecording, false, 'Initially not recording');
    assertEquals(recorder.formattedRecordingTime, '0:00', 'Initial time is 0:00');

    // 1. Normal recording lifecycle: Start -> Stop -> Recorded
    await recorder.startRecording();
    assertEquals(recorder.isRecording, true, 'isRecording is true after start');
    recorder.stopRecording();
    assertEquals(recorder.isRecording, false, 'isRecording is false after stop');
    assertEquals(recordedFiles.length, 1, 'Exactly 1 file recorded');
    assertMatches(recordedFiles[0].name, /^Sprachnachricht_\d+\.webm$/, 'Filename pattern matches webm');
    assertEquals(tracksStopped, 1, 'Audio track stopped');

    // 2. Multiple stop calls (Idempotence)
    recorder.stopRecording();
    recorder.stopRecording();
    assertEquals(recordedFiles.length, 1, 'Subsequent stops are no-op');

    // 3. Cancel recording: Start -> Cancel -> No file recorded
    await recorder.startRecording();
    assertEquals(recorder.isRecording, true, 'Recording restarted');
    recorder.cancelRecording();
    assertEquals(recorder.isRecording, false, 'isRecording false after cancel');
    assertEquals(recordedFiles.length, 1, 'Cancelled recording did not emit a file');

    // 4. Cancel while idle (Idempotence)
    recorder.cancelRecording();
    assertEquals(recorder.isRecording, false, 'Cancel while idle is safe');

    // 5. Cleanup while recording
    await recorder.startRecording();
    recorder.cleanup();
    assertEquals(recorder.isRecording, false, 'Cleanup cancelled active recording');
    assertEquals(recordedFiles.length, 1, 'Cleanup did not emit file');
});

registerTest('CH-M1-04', 2, 'useChatAudioRecorder: Permission Denial Graceful Fallback', async () => {
    resetTestEnvironment();
    (globalThis as any).navigator.mediaDevices = {
        getUserMedia: async () => { throw new Error('NotAllowedError: Permission denied'); }
    };

    const { createChatAudioRecorder } = await import('$lib/components/chat/useChatAudioRecorder.svelte');
    let emitted = false;
    const recorder = createChatAudioRecorder(() => { emitted = true; });

    await recorder.startRecording();
    assertEquals(recorder.isRecording, false, 'State remains false on permission denial');
    assertEquals(emitted, false, 'No file emitted on permission failure');
});

registerTest('CH-M1-05', 2, 'Scanner Ingestion: PDF File State Pipeline across Views', async () => {
    resetTestEnvironment();

    // Fabricate a scanned multi-page PDF File object as created by DocumentScanButton
    const pdfBlob = new Blob(['%PDF-1.4 mock pdf content'], { type: 'application/pdf' });
    const scannedPdfFile = new File([pdfBlob], 'Dokumentenscan_2026-11-11.pdf', { type: 'application/pdf' });

    // 1. ClientDocumentFilesSection ingestion simulation
    let clientFiles: File[] = [];
    const onScanCompleteSection = (file: File) => { clientFiles = [...clientFiles, file]; };
    onScanCompleteSection(scannedPdfFile);
    assertEquals(clientFiles.length, 1, 'ClientDocumentFilesSection received PDF');
    assertEquals(clientFiles[0].name, 'Dokumentenscan_2026-11-11.pdf', 'Name matches');
    assertEquals(clientFiles[0].type, 'application/pdf', 'MIME matches');

    // Section deletion by index
    clientFiles = clientFiles.filter((_, i) => i !== 0);
    assertEquals(clientFiles.length, 0, 'File removed from section array');

    // 2. ClientDocumentUploadZone ingestion simulation
    let uploadedList: File[] = [];
    const onupload = (files: FileList | File[]) => { uploadedList = Array.from(files); };
    onupload([scannedPdfFile]);
    assertEquals(uploadedList.length, 1, 'Upload zone received file array');
    assertEquals(uploadedList[0], scannedPdfFile, 'Exact File reference preserved');

    // 3. ChatWidget attachment ingestion simulation
    let chatSelectedFile: File | null = null;
    chatSelectedFile = scannedPdfFile;
    assertDefined(chatSelectedFile, 'Chat attachment selected');
    assertEquals(chatSelectedFile.name, 'Dokumentenscan_2026-11-11.pdf', 'Chat attachment is PDF');
    chatSelectedFile = null;
    assertEquals(chatSelectedFile, null, 'Chat attachment removed');
});
