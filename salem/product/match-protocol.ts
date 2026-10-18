/* Salem server-authoritative client projections. Never mix another player's secret data. */
export type SalemPhase='lobby'|'town_hall'|'role_reveal'|'sleep'|'witch_vote'|'sunrise'|'turn'|'night'|'trial'|'finished';
export type SalemTeam='town'|'witch';
export type ConnectionState='connecting'|'online'|'reconnecting'|'offline';
export type PlayerPresence='online'|'away'|'disconnected';

export interface PublicPlayer{
 id:string;
 name:string;
 portraitUrl:string;
 characterId:string|null;
 alive:boolean;
 accusations:number;
 revealedTryals:readonly ('witch'|'constable'|'innocent')[];
 effects:readonly string[];
 hasBlackCat:boolean;
 presence:PlayerPresence;
}
export interface PublicMatch{
 matchId:string;
 stateVersion:number;
 phaseVersion:number;
 phase:SalemPhase;
 phaseDeadline:string|null;
 turnNumber:number;
 currentSpeakerId:string|null;
 players:readonly PublicPlayer[];
 discardCount:number;
 deckCount:number;
 winner:SalemTeam|null;
 publicEvents:readonly PublicEvent[];
}
export interface PublicEvent{
 id:string;
 occurredAt:string;
 kind:'turn'|'card_played'|'card_drawn'|'cat_moved'|'tryal_revealed'|'phase'|'win'|'presence'|'system';
 message:string;
 actorId?:string;
 targetId?:string;
}
export interface PrivateMatch{
 playerId:string;
 hand:readonly {instanceId:string;cardId:string}[];
 tryals:readonly {instanceId:string;kind:'witch'|'constable'|'innocent';revealed:boolean}[];
 offeredCharacters:readonly string[];
 witchTeammateIds?:readonly string[];
 selfBlackCatVote?:string|null;
 abilityCharges:Readonly<Record<string,number>>;
}
export type SalemSnapshot={
 public:PublicMatch;
 private:null|PrivateMatch;
 viewer:'player'|'spectator';
 serverTime:string;
};
export type SalemRealtimeMessage=
 | {type:'snapshot';state:SalemSnapshot}
 | {type:'phase_changed';version:number;phaseVersion:number}
 | {type:'state_changed';version:number}
 | {type:'pong';serverTime:string}
 | {type:'command_ack';commandId:string;version:number};
export type SalemCommand=
 | {kind:'choose_character';characterId:string}
 | {kind:'black_cat_vote';targetPlayerId:string|null}
 | {kind:'play_card';cardInstanceId:string;targetPlayerId:string}
 | {kind:'draw_two'}
 | {kind:'end_turn'}
 | {kind:'reveal_tryal';targetPlayerId:string;tryalInstanceId:string}
 | {kind:'night_action';action:'protect'|'attack'|'confess';targetPlayerId:string|null};
export interface SalemCommandEnvelope{
 matchId:string;commandId:string;expectedStateVersion:number;expectedPhaseVersion:number;action:SalemCommand;
}
/* Reject accidental inclusion of secret fields in the PUBLIC projection. This is
   defense in depth on the client; server must sanitize before sending. */
const PRIVATE_KEYS=new Set(['tryals','witchTeammateIds','witchTeam','deck','hands','hand','privateVotes','roles','role','rngSeed']);
export function assertSafePublicPayload(value:unknown):asserts value is PublicMatch{
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid public match payload');
 const walk=(item:unknown):void=>{
  if(!item||typeof item!=='object')return;
  if(Array.isArray(item)){item.forEach(walk);return;}
  for(const [key,v] of Object.entries(item as Record<string,unknown>)){
   if(PRIVATE_KEYS.has(key))throw new Error('Private field in public payload: '+key);
   walk(v);
  }
 };
 walk(value);
 const p=value as PublicMatch;
 if(typeof p.matchId!=='string'||typeof p.stateVersion!=='number'||!Array.isArray(p.players)||typeof p.phase!=='string')throw new Error('Malformed public state');
}
export function parseSnapshot(message:unknown, viewerId?:string):SalemSnapshot{
 if(!message||typeof message!=='object')throw new Error('Malformed snapshot');
 const candidate=message as Partial<SalemSnapshot>;
 assertSafePublicPayload(candidate.public);
 if(candidate.private&&viewerId&&candidate.private.playerId!==viewerId)throw new Error('Private state identity mismatch');
 if(candidate.viewer==='spectator'&&candidate.private!==null)throw new Error('Spectator received private data');
 return candidate as SalemSnapshot;
}
export function permittedAction(phase:SalemPhase,command:SalemCommand){
 const allowed:Record<SalemPhase,readonly SalemCommand['kind'][]>={
  lobby:[],town_hall:['choose_character'],role_reveal:[],
  sleep:[],witch_vote:['black_cat_vote'],sunrise:[],
  turn:['play_card','draw_two','end_turn'],night:['night_action'],
  trial:['reveal_tryal'],finished:[]
 };
 return allowed[phase].includes(command.kind);
}
export function upcomingPlayers(match:PublicMatch,count=4):PublicPlayer[]{
 const alive=match.players.filter(p=>p.alive);
 const index=alive.findIndex(p=>p.id===match.currentSpeakerId);
 if(index<0)return alive.slice(0,count);
 return Array.from({length:Math.min(count,alive.length)},(_,n)=>alive[(index+n)%alive.length]);
}
export function remainingSeconds(deadline:string|null,now:number){
 if(!deadline)return null;
 const timestamp=Date.parse(deadline);
 return Number.isFinite(timestamp)?Math.max(0,Math.ceil((timestamp-now)/1000)):null;
}
