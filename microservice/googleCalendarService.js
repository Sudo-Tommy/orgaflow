import {
    APP_DISPLAY_NAME,
    DEFAULT_SCOPES,
    scheduleGoogleApiCall,
    fetchWithRetry,
    resolveEffectiveUserId,
    getGoogleCredentials,
    generateAuthUrl,
    handleOAuthCallback as _handleOAuthCallback,
    getValidAccessToken,
    disconnectGoogleCalendar
} from './src/services/calendar/googleOAuthService.js';

import {
    isRecentSelfUpdate,
    syncAppointmentToGoogle,
    deleteAppointmentFromGoogle,
    syncAllUpcomingAppointments
} from './src/services/calendar/googleCalendarSyncService.js';

import {
    fetchExternalGoogleEvents,
    sendEmailViaGmailOAuth2
} from './src/services/calendar/googleCalendarEventsService.js';

export async function handleOAuthCallback(code, state, pbAdmin) {
    return await _handleOAuthCallback(code, state, pbAdmin, syncAllUpcomingAppointments);
}

export {
    APP_DISPLAY_NAME,
    DEFAULT_SCOPES,
    scheduleGoogleApiCall,
    fetchWithRetry,
    resolveEffectiveUserId,
    getGoogleCredentials,
    generateAuthUrl,
    getValidAccessToken,
    disconnectGoogleCalendar,
    isRecentSelfUpdate,
    syncAppointmentToGoogle,
    deleteAppointmentFromGoogle,
    syncAllUpcomingAppointments,
    fetchExternalGoogleEvents,
    sendEmailViaGmailOAuth2
};
