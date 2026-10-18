import test from 'node:test';
import assert from 'node:assert/strict';
import {assertSafePublicPayload,parseSnapshot,permittedAction,remainingSeconds,upcomingPlayers} from '../match-protocol';
import {permittedChannel} from '../voice-contract';
import type {PublicMatch,SalemSnapshot} from '../match-protocol';
import type {SalemVoiceAccess} from '../voice-contract';

const publicMatch:PublicMatch={
 matchId:'match-test',stateVersion:6,phaseVersion:3,phase:'turn',phaseDeadline:'2026-10-18T12:01:00Z',
 turnNumber:4,currentSpeakerId:'p1',discardCount:2,deckCount:30,winner:null,publicEvents:[],
 players:[
  {id:'p1',name:'A',portraitUrl:'',characterId:'mary',alive:true,accusations:0,revealedTryals:[],effects:[],hasBlackCat:false,presence:'online'},
  {id:'p2',name:'B',portraitUrl:'',characterId:'giles',alive:true,accusations:0,revealedTryals:[],effects:[],hasBlackCat:true,presence:'online'}
 ]
};
const privateView={
 playerId:'p1',hand:[],tryals:[{instanceId:'x',kind:'innocent' as const,revealed:false}],
 offeredCharacters:[],witchTeammateIds:[] as string[],abilityCharges:{}
};
test('rejects secret fields anywhere in public state, even nested objects',()=>{
 assert.doesNotThrow(()=>assertSafePublicPayload(publicMatch));
 assert.throws(()=>assertSafePublicPayload({...publicMatch,deck:['witch','night']}),/Private field/);
 assert.throws(()=>assertSafePublicPayload({...publicMatch,players:[{...publicMatch.players[0],hand:['secret']}]}),/Private field/);
});
test('rejects spectator state with personal Tryal cards',()=>{
 const leak:SalemSnapshot={public:publicMatch,private:privateView,viewer:'spectator',serverTime:'2026-10-18T12:00:00Z'};
 assert.throws(()=>parseSnapshot(leak,'p1'),/Spectator received private data/);
});
test('rejects client mismatch between session player and incoming private state',()=>{
 const state:SalemSnapshot={public:publicMatch,private:privateView,viewer:'player',serverTime:'2026-10-18T12:00:00Z'};
 assert.throws(()=>parseSnapshot(state,'p2'),/identity mismatch/);
 assert.equal(parseSnapshot(state,'p1').public.stateVersion,6);
});
test('commands remain phase-specific and the server still owns validation',()=>{
 assert.equal(permittedAction('town_hall',{kind:'choose_character',characterId:'mary'}),true);
 assert.equal(permittedAction('sleep',{kind:'black_cat_vote',targetPlayerId:'p2'}),false);
 assert.equal(permittedAction('witch_vote',{kind:'black_cat_vote',targetPlayerId:null}),true);
 assert.equal(permittedAction('turn',{kind:'draw_two'}),true);
 assert.equal(permittedAction('finished',{kind:'end_turn'}),false);
});
test('LiveKit grants do not cross roles, phases or active-speaker boundary',()=>{
 const a:SalemVoiceAccess={
  matchId:'match-test',phase:'witch_vote',phaseVersion:7,authenticatedPlayerId:'p1',isWitch:false,currentSpeakerId:null,isAlive:true
 };
 assert.equal(permittedChannel(a),null,'non-witch is barred from Witch channel');
 assert.equal(permittedChannel({...a,isWitch:true}),'witch-night');
 assert.equal(permittedChannel({...a,phase:'turn',currentSpeakerId:'p2'}),'day-listen');
 assert.equal(permittedChannel({...a,phase:'turn',currentSpeakerId:'p1'}),'day-speaker');
 assert.equal(permittedChannel({...a,isAlive:false,phase:'turn',currentSpeakerId:'p1'}),null);
});
test('clock derives from server deadline and turn queue does not expose secrets',()=>{
 assert.equal(remainingSeconds('2026-10-18T12:01:00Z',Date.parse('2026-10-18T12:00:30Z')),30);
 assert.equal(remainingSeconds(null,Date.now()),null);
 assert.deepEqual(upcomingPlayers(publicMatch).map(p=>p.id),['p1','p2']);
});
