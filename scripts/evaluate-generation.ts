import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const labels=await readFile('evals/questions.json','utf8');
const questions:{id:string;kind:string;query:string;expected:string[]}[]=JSON.parse(labels).questions;
const reference=await readFile('evidence/retrieval-eval.json','utf8');
const rows: {id:string;mode:string;kind:string;expected:string[];query:string;elapsedMs:number;events:Record<string,unknown>[];error?:string}[]=[];
const summary=[];
const metadata={startedAt:new Date().toISOString(),status:'partial',model:'qwen2.5-coder:7b via local Ollama; generation results are provisional for tomorrow\'s hosted model',retrievalReferenceSha256:createHash('sha256').update(reference).digest('hex'),labelsSha256:createHash('sha256').update(labels).digest('hex'),concurrency:1,k:5,maxOutputTokens:320,contextTokens:4096,temperature:0};
for(const mode of ['keyword','vector','hybrid']){
 for(const question of questions){
  // The coordinator can pause further inference between bounded requests for a measurement window.
  while(true){const window=await readFile('../../coordination/performance-window.json','utf8').then(JSON.parse).catch(()=>({state:'released'}));if(window.state!=='requested')break;await writeFile('.cache/generation-paused.json',JSON.stringify({requestId:window.requestId,state:'idle',at:new Date().toISOString()}));await new Promise(resolve=>setTimeout(resolve,2000));}
  const started=performance.now();let events:Record<string,unknown>[]=[];let error:string|undefined;
  try{const response=await fetch('http://127.0.0.1:3300/api/answer',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:question.query,mode,k:5}),signal:AbortSignal.timeout(240000)});const text=await response.text();events=text.trim().split('\n').filter(Boolean).map(line=>JSON.parse(line));if(!response.ok)error=`HTTP ${response.status}`;}catch(failure){error=failure instanceof Error?failure.message:'Request failed';}
  rows.push({...question,mode,elapsedMs:performance.now()-started,events,...(error?{error}:{})});
  await writeFile('evidence/generation-eval-progress.json',JSON.stringify({...metadata,completed:rows.length,total:60,updatedAt:new Date().toISOString(),rows},null,2));
  console.log(`${mode} ${question.id}: ${events.some(e=>e.type==='final')?'final':'failed'} (${rows.length}/60)`);
 }
 const modeRows=rows.filter(row=>row.mode===mode);const answerable=modeRows.filter(row=>row.expected.length>0);const controls=modeRows.filter(row=>!row.expected.length);
 const finalFor=(row:typeof rows[number])=>row.events.find(event=>event.type==='final') as {citations:{chunkId:string}[];model:string}|undefined;
 const covered=answerable.filter(row=>finalFor(row)?.citations.some(citation=>row.expected.includes(citation.chunkId))).length;
 const paired=answerable.filter(row=>row.kind==='two-source');
 summary.push({mode,citationCoverageNumerator:covered,citationCoverageDenominator:answerable.length,citationCoverage:covered/answerable.length,completeTwoSourceNumerator:paired.filter(row=>row.expected.every(id=>finalFor(row)?.citations.some(c=>c.chunkId===id))).length,completeTwoSourceDenominator:paired.length,unsupportedAbstentionNumerator:controls.filter(row=>finalFor(row)?.citations.length===0).length,unsupportedDenominator:controls.length,validatedFinals:modeRows.filter(row=>finalFor(row)).length,totalRequests:modeRows.length,actualModelCalls:modeRows.filter(row=>finalFor(row)?.model==='qwen2.5-coder:7b'||row.events.some(e=>e.type==='draft'||e.type==='error')).length});
}
if(createHash('sha256').update(await readFile('evidence/retrieval-eval.json','utf8')).digest('hex')!==metadata.retrievalReferenceSha256)throw new Error('Frozen retrieval results changed during generation evaluation');
await writeFile('evidence/generation-eval.json',JSON.stringify({...metadata,status:'complete local generation pass; rerun for hosted chat model',completed:rows.length,finishedAt:new Date().toISOString(),summary,rows,note:'Citation coverage checks expected source IDs after schema/exact-quote validation. It is not a semantic entailment or overall answer-accuracy metric. Failures stay in the denominator.'},null,2));console.table(summary);
