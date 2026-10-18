export type SalemPhase = 'room_setup'|'character_selection'|'role_reveal'|'opening_sleep'|'witch_vote'|'sunrise'|'turn'|'night'|'finished';
export type VoiceChannel = 'witch-night'|'day-speaker'|'day-listen';
export type SalemVoiceAccess = {
  matchId: string;
  phase: SalemPhase;
  phaseVersion: number;
  authenticatedPlayerId: string;
  isWitch: boolean; // server-filtered PRIVATE projection, never client-trusted!
  currentSpeakerId: string|null;
  isAlive: boolean;
};
export type SalemVoiceTokenResponse = {
  server_url: string;      // wss:// LiveKit endpoint
  participant_token: string;  // short-lived access token signed on backend
  expires_at: string;
};
export function permittedChannel(state:SalemVoiceAccess):VoiceChannel|null {
  if (!state.isAlive) return null;
  if (state.phase==='witch_vote'&&state.isWitch) return 'witch-night';
  if (state.phase==='turn') return state.currentSpeakerId===state.authenticatedPlayerId ? 'day-speaker' : 'day-listen';
  return null;
}
