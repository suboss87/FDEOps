'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const contract = path.resolve(__dirname, '../evals/delivery/intent-continuity/contract.cjs')
// Evaluator calibration only. Never supply this implementation to task executors.
const valid = `exports.createWorkflow = ({send}) => {
 const drafts = new Map();
 const auth = s => { if (!s || typeof s.operatorId !== 'string' || !s.operatorId.trim() || s.canReview !== true) throw Error('denied') };
 return {
 createDraft(d) { drafts.set(d.id, {...d, revision:0, approved:null}) },
 reviseDraft(id,text) { const d=drafts.get(id);d.text=text;d.revision++; },
 approveDraft(id,s) {auth(s);const d=drafts.get(id);d.approved=d.revision;},
 async sendDraft(id,request,s) {auth(s);const d=drafts.get(id);
 if(d.approved!==d.revision) throw Error('review required');
 await send({draftId:id,recipient:d.recipient,text:d.text});return {status:'sent'};
 }
 };
};`
function run(t, source) {
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'fde-intent-contract-'))
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}))
 const candidate=path.join(root,'workflow.js');fs.writeFileSync(candidate,source)
 const result=spawnSync(process.execPath,[contract,candidate],{cwd:root,encoding:'utf8',timeout:7000})
 return {...result, passed: result.status===0 && result.stdout.split(/\r?\n/).includes('INTENT_CONTRACT_COMPLETE 7')}
}
test('intent contract exercises allowed and denied sends', t=> {
 const result=run(t,valid);assert.equal(result.passed,true,result.stderr)
 assert.equal(result.stdout.split('\n').filter(l=>l.startsWith('PASS ')).length,7)
})
for (const [name, source] of [
 ['unreviewed send', valid.replace("if(d.approved!==d.revision) throw Error('review required');",'')],
 ['stale approval after edit', valid.replace('d.revision++;','')],
 ['client approval claim', valid.replace("if(d.approved!==d.revision)","if(request.approved) d.approved=d.revision; if(d.approved!==d.revision)")],
 ['client recipient override', valid.replace('recipient:d.recipient','recipient:request.recipient || d.recipient')],
 ['missing identity check', valid.replace("typeof s.operatorId !== 'string' || !s.operatorId.trim() || ", '')],
 ['single hardcoded operator', valid.replace("!s ||", "!s || s.operatorId !== 'op-1' ||")],
 ['request identity fallback', valid.replace('async sendDraft(id,request,s) {auth(s);', 'async sendDraft(id,request,s) {auth(s || request.session);')],
 ['unauthorized reviewer', valid.replace('approveDraft(id,s) {auth(s);','approveDraft(id,s) {')],
 ['all operations blocked', "exports.createWorkflow=()=>({createDraft(){},reviseDraft(){},approveDraft(){},sendDraft(){return {status:'blocked'}}})"],
 ['early clean exit', 'process.exit(0)'],
]) test(`intent contract rejects ${name}`,t=>assert.equal(run(t,source).passed,false))

test('intent contract accepts explicit tamper rejection',t=> {
 const source=valid.replace('async sendDraft(id,request,s) {auth(s);', "async sendDraft(id,request,s) {if(request.recipient || request.text) throw Error('tampered');auth(s);")
 const result=run(t,source);assert.equal(result.passed,true,result.stderr)
})
