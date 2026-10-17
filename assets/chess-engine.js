/* BoardGame Chess: local legal-move engine, no external dependencies.
   UI/game demo only; not a server-authoritative multiplayer implementation. */
(function(root){
'use strict';
const FILES='abcdefgh';
const WHITE='w',BLACK='b';
const opposite=s=>s==='w'?'b':'w';
const inB=(x,y)=>x>=0&&x<8&&y>=0&&y<8;
const xy=s=>({x:FILES.indexOf(s[0]),y:8-Number(s[1])});
const sq=(x,y)=>FILES[x]+(8-y);
const value={p:100,n:320,b:330,r:500,q:900,k:20000};
const setup=()=>{
 const b={};for(let x=0;x<8;x++){
  const piece='rnbqkbnr'[x];b[sq(x,0)]='b'+piece;b[sq(x,1)]='bp';b[sq(x,6)]='wp';b[sq(x,7)]='w'+piece;
 }return b;
};
class ChessGame {
 constructor(fen){this.reset(fen);}
 reset(fen){this.board=setup();this.turn='w';this.castling='KQkq';this.ep='-';this.halfmove=0;this.fullmove=1;this.history=[];this.positions={};this.result=null;
  if(fen)this.load(fen);this.positions[this.key()]=1;
 }
 snapshot(){return {board:{...this.board},turn:this.turn,castling:this.castling,ep:this.ep,halfmove:this.halfmove,fullmove:this.fullmove,positions:{...this.positions},result:this.result};}
 restore(st){this.board={...st.board};this.turn=st.turn;this.castling=st.castling;this.ep=st.ep;this.halfmove=st.halfmove;this.fullmove=st.fullmove;this.positions={...st.positions};this.result=st.result;}
 load(fen){const [board,side,castle,ep,half,full]=fen.split(' ');const rows=board.split('/');if(rows.length!==8)throw Error('Invalid FEN');const b={};rows.forEach((row,y)=>{let x=0;for(const ch of row){if(/\d/.test(ch))x+=Number(ch);else {if(!inB(x,y)||!/[pnbrqk]/i.test(ch))throw Error('Invalid piece');b[sq(x++,y)]=(ch===ch.toUpperCase()?'w':'b')+ch.toLowerCase();}}if(x!==8)throw Error('Invalid row');});this.board=b;this.turn=side||'w';this.castling=castle||'-';this.ep=ep||'-';this.halfmove=Number(half)||0;this.fullmove=Number(full)||1;this.history=[];this.positions={};this.result=null;this.positions[this.key()]=1;}
 fen(){let rows=[];for(let y=0;y<8;y++){let row='',n=0;for(let x=0;x<8;x++){const p=this.board[sq(x,y)];if(!p){n++;continue}if(n){row+=n;n=0;}row+=p[0]==='w'?p[1].toUpperCase():p[1];}if(n)row+=n;rows.push(row)}return `${rows.join('/')} ${this.turn} ${this.castling||'-'} ${this.ep} ${this.halfmove} ${this.fullmove}`;}
 key(){return this.fen().split(' ').slice(0,4).join(' ')}
 kingSquare(side,b=this.board){return Object.keys(b).find(s=>b[s]===side+'k')||null;}
 attacked(target,bySide,b=this.board){const t=xy(target);
  for(const [from,p] of Object.entries(b)){if(p[0]!==bySide)continue;const c=xy(from),dx=t.x-c.x,dy=t.y-c.y,absX=Math.abs(dx),absY=Math.abs(dy),kind=p[1];
   if(kind==='p'&&dy===(bySide==='w'?-1:1)&&absX===1)return true;
   if(kind==='n'&&((absX===1&&absY===2)||(absX===2&&absY===1)))return true;
   if(kind==='k'&&Math.max(absX,absY)===1)return true;
   if(kind==='p'||kind==='n'||kind==='k')continue;
   if(!((kind==='b'||kind==='q')&&absX===absY && absX>0) && !((kind==='r'||kind==='q')&&((dx===0&&dy!==0)||(dy===0&&dx!==0))))continue;
   const sx=Math.sign(dx),sy=Math.sign(dy);let x=c.x+sx,y=c.y+sy,blocked=false;
   while(x!==t.x||y!==t.y){if(b[sq(x,y)]){blocked=true;break}x+=sx;y+=sy;}if(!blocked)return true;
  }
  return false;
 }
 inCheck(side=this.turn){const k=this.kingSquare(side);return !k||this.attacked(k,opposite(side));}
 pseudo(side=this.turn){const moves=[],b=this.board,enemy=opposite(side);
  for(const [from,piece] of Object.entries(b)){
   if(piece[0]!==side)continue;const t=piece[1],{x,y}=xy(from),add=(nx,ny,flags='')=>{
     if(!inB(nx,ny))return false;const to=sq(nx,ny),occ=b[to];if(occ&&occ[0]===side)return false;if(occ&&occ[1]==='k')return false;
     const promotion=t==='p'&&(ny===0||ny===7);for(const promot of (promotion?['q','r','b','n']:[null]))moves.push({from,to,piece,flags:(occ?'c':'')+flags,promotion:promot});return !occ;
   };
   if(t==='p'){
    const dir=side==='w'?-1:1,initial=side==='w'?6:1;
    if(inB(x,y+dir)&&!b[sq(x,y+dir)]){add(x,y+dir);if(y===initial&&!b[sq(x,y+2*dir)])add(x,y+2*dir,'b');}
    for(const nx of [x-1,x+1]){if(!inB(nx,y+dir))continue;const to=sq(nx,y+dir),dest=b[to];if(dest&&dest[0]===enemy)add(nx,y+dir);else if(to===this.ep&&!dest)moves.push({from,to,piece,flags:'e',promotion:null});}
   } else if(t==='n'){for(const [dx,dy] of [[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]])add(x+dx,y+dy);}
   else if(t==='k'){
    for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)if(dx||dy)add(x+dx,y+dy);
    if(!this.inCheck(side)){
     const rank=side==='w'?'1':'8',king='e'+rank;
     if(from===king){
       for(const [right,rook,empty,passes,destination,flag] of (side==='w'?[['K','h1',['f1','g1'],['f1','g1'],'g1','k'],['Q','a1',['d1','c1','b1'],['d1','c1'],'c1','q']]:[['k','h8',['f8','g8'],['f8','g8'],'g8','k'],['q','a8',['d8','c8','b8'],['d8','c8'],'c8','q']])){
        if(this.castling.includes(right)&&b[rook]===side+'r'&&empty.every(s=>!b[s])&&passes.every(s=>!this.attacked(s,enemy)))moves.push({from,to:destination,piece,flags:flag,promotion:null});
       }
     }
    }
   } else {
    const dirs={b:[[1,1],[-1,1],[1,-1],[-1,-1]],r:[[1,0],[-1,0],[0,1],[0,-1]],q:[[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]]}[t];
    for(const [dx,dy] of dirs){let nx=x+dx,ny=y+dy;while(inB(nx,ny)){const target=b[sq(nx,ny)];if(target&&target[0]===side)break;if(target&&target[1]==='k')break;const cont=add(nx,ny);if(!cont)break;nx+=dx;ny+=dy;}}
   }
  }
  return moves;
 }
 apply(m){const p=this.board[m.from],captured=m.flags.includes('e')?this.board[m.to[0]+m.from[1]]:this.board[m.to]||null;
  delete this.board[m.from];if(m.flags.includes('e'))delete this.board[m.to[0]+m.from[1]];
  if(m.flags.includes('k')||m.flags.includes('q')){const rank=p[0]==='w'?'1':'8',short=m.flags.includes('k'),rookFrom=(short?'h':'a')+rank,rookTo=(short?'f':'d')+rank;this.board[rookTo]=this.board[rookFrom];delete this.board[rookFrom];}
  this.board[m.to]=m.promotion?p[0]+m.promotion:p;
  if(p[1]==='k')this.castling=this.castling.replace(p[0]==='w'?/[KQ]/g:/[kq]/g,'');
  if(m.from==='a1'||m.to==='a1')this.castling=this.castling.replace('Q','');if(m.from==='h1'||m.to==='h1')this.castling=this.castling.replace('K','');
  if(m.from==='a8'||m.to==='a8')this.castling=this.castling.replace('q','');if(m.from==='h8'||m.to==='h8')this.castling=this.castling.replace('k','');
  this.ep=(p[1]==='p'&&Math.abs(Number(m.to[1])-Number(m.from[1]))===2)?p[0]==='w'?m.from[0]+'3':m.from[0]+'6':'-';
  this.halfmove=p[1]==='p'||captured?0:this.halfmove+1;
  if(this.turn==='b')this.fullmove++;this.turn=opposite(this.turn);return captured;
 }
 legal(side=this.turn){const pseudo=this.pseudo(side),legal=[];for(const m of pseudo){const state=this.snapshot();this.apply(m);if(!this.inCheck(side))legal.push(m);this.restore(state);}return legal;}
 move(opts){const legal=this.legal();const m=legal.find(x=>x.from===opts.from&&x.to===opts.to&&(x.promotion||null)===(opts.promotion||null))||(!opts.promotion&&legal.find(x=>x.from===opts.from&&x.to===opts.to&&x.promotion==='q'));
  if(!m)return null;
  const oldSide=this.turn, before=this.snapshot(), alternatives=legal.filter(x=>x.piece[1]===m.piece[1]&&x.to===m.to&&x.from!==m.from);
  const capture=m.flags.includes('c')||m.flags.includes('e');let san='';
  if(m.flags.includes('k'))san='O-O';else if(m.flags.includes('q'))san='O-O-O';else{
   const letter=m.piece[1]==='p'?'':m.piece[1].toUpperCase();
   let disambig='';if(alternatives.length){disambig=alternatives.some(x=>x.from[0]===m.from[0])?m.from[1]:m.from[0]; if(alternatives.some(x=>x.from[1]===m.from[1])&&alternatives.some(x=>x.from[0]===m.from[0]))disambig=m.from;}
   if(m.piece[1]==='p'&&capture)disambig=m.from[0];san=letter+disambig+(capture?'x':'')+m.to+(m.promotion?'='+m.promotion.toUpperCase():'');
  }
  const taken=this.apply(m), check=this.inCheck(), future=this.legal();
  if(check)san+=future.length?'\u002b':'#';
  const record={...m,color:oldSide,san,captured:taken,before};this.history.push(record);
  this.positions[this.key()]=(this.positions[this.key()]||0)+1;
  return record;
 }
 undo(){const last=this.history.pop();if(!last)return null;this.restore(last.before);return last;}
 insufficient(){const pieces=Object.values(this.board).filter(p=>p[1]!=='k');if(!pieces.length)return true;if(pieces.length===1&&['n','b'].includes(pieces[0][1]))return true;if(pieces.length===2&&pieces.every(p=>p[1]==='b')){const bishops=Object.keys(this.board).filter(s=>this.board[s][1]==='b');const cols=bishops.map(s=>{const c=xy(s);return (c.x+c.y)%2});if(cols[0]===cols[1])return true;}return false;}
 status(){const legal=this.legal(),check=this.inCheck();if(!legal.length)return {over:true,reason:check?'checkmate':'stalemate',winner:check?opposite(this.turn):null,check};if(this.halfmove>=100)return {over:true,reason:'fifty-move',winner:null,check};if((this.positions[this.key()]||0)>=3)return {over:true,reason:'repetition',winner:null,check};if(this.insufficient())return {over:true,reason:'insufficient',winner:null,check};return {over:false,reason:'playing',winner:null,check};}
 pgn(){const moves=this.history.map((r,i)=>i%2===0?`${Math.floor(i/2)+1}. ${r.san}`:r.san).join(' ');const s=this.status();return `[Event "BoardGame Local Demo"]\n[Site "Offline"]\n[Result "${s.over?(s.winner==='w'?'1-0':s.winner==='b'?'0-1':'1/2-1/2'):'*'}"]\n\n${moves} ${s.over?(s.winner==='w'?'1-0':s.winner==='b'?'0-1':'1/2-1/2'):'*'}`;}
 legalSquares(from){return this.legal().filter(m=>m.from===from);}
 evaluate(perspective='w'){let total=0;for(const [s,p] of Object.entries(this.board)){const c=xy(s),central=3.5-Math.abs(c.x-3.5),bonus=p[1]==='p'?central*3:p[1]==='n'?central*5:0;total+=(p[0]==='w'?1:-1)*(value[p[1]]+bonus);}return perspective==='w'?total:-total;}
 botMove(difficulty='medium'){
  const options=this.legal();if(!options.length)return null;
  if(difficulty==='easy')return options[Math.floor(Math.random()*options.length)];
  const side=this.turn;
  const assess=(m)=>{const snap=this.snapshot(); const capture=this.board[m.to];this.apply(m); const after=this.status(); let score=this.evaluate(side)+(capture?value[capture[1]]*.12:0);if(after.over&&after.winner===side)score+=100000;
   if(difficulty==='hard'&&!after.over){const oppMoves=this.legal();let worst=Infinity;for(const om of oppMoves){const st=this.snapshot();this.apply(om);const e=this.evaluate(side);worst=Math.min(worst,e);this.restore(st);}if(worst<Infinity)score=worst+(capture?value[capture[1]]*.08:0);}this.restore(snap);return score;};
  return options.map(m=>({m,score:assess(m)})).sort((a,b)=>b.score-a.score+Math.random()*.01)[0].m;
 }
}
root.BoardgameChessEngine=ChessGame;
if(typeof module!=='undefined'&&module.exports)module.exports=ChessGame;
})(typeof window!=='undefined'?window:globalThis);
