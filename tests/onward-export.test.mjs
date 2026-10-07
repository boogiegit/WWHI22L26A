import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
await import('../js/services/onward-export.js');
const base={plan:'flying',name:'Synthetic flight',airport:'Paris CDG',flightDate:'2026-10-22',flightTime:'10:31',terminal:'Not known',airline:'Example Air',flightNumber:'EX123',transferType:'complimentary'};
const records=[base,{...base,name:'Synthetic private',flightTime:'07:00',transferType:'private'},
  {...base,name:'Synthetic own',flightTime:'08:00',transferType:'own'},
  {...base,name:'Synthetic legacy cutoff',flightTime:'10:30'},
  {...base,name:'=HYPERLINK("synthetic") & <text>',flightTime:'13:00'},
  {name:'Synthetic staying',plan:'staying'},
  {name:'Synthetic rail',plan:'eurostar',eurostarDate:'2026-10-22',eurostarTime:'09:00',eurostarRef:'EX-test',londonFlying:'yes',londonAirport:'Heathrow',londonFlightDate:'2026-10-23',londonFlightTime:'13:00',londonTerminal:'5',londonAirline:'Example Air',londonFlightNumber:'EX456'},
  {name:'Synthetic rail only',plan:'eurostar',eurostarDate:'2026-10-22',eurostarTime:'11:00',londonFlying:'no',londonAirport:'Must not export inactive field'}];
assert.deepEqual(OnwardExport.flyers(records).map(r=>r.group),[1,1,2,3,4]);
assert.equal(OnwardExport.eurostar(records).length,2);
assert.equal(OnwardExport.flyers(records).length,5);
assert.equal(OnwardExport.values(OnwardExport.flyers(records)[0])[6],'Complimentary');
const output=path.join(import.meta.dirname,'.runtime','onward-export-synthetic.xlsx');
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,OnwardExport.workbook(records));
fs.writeFileSync(path.join(path.dirname(output),'onward-export-empty.xlsx'),OnwardExport.workbook([]));
// The dependency-free ZIP writer stores uncompressed XML. Check actual exported content.
for (const dataset of [records, [], Array.from({length:80},(_,i)=>({...base,name:'Synthetic '+i}))]) {
  const contents=new TextDecoder().decode(OnwardExport.workbook(dataset));
  assert.equal((contents.match(/paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="1"/g)||[]).length,1);
  assert.ok(!contents.includes('landscape'));
  assert.ok(!contents.includes('AIRPORT') && !contents.includes('AIRLINE'));
  assert.ok(!contents.includes('Paris CDG') && !contents.includes('Example Air'));
  assert.ok(contents.includes('A1:G1'));
  assert.ok(!contents.includes('<f>'),'Guest text cannot become an Excel formula');
}
assert.equal(OnwardExport.headers.length,7);
console.log('PASS: single transfer, strict 10:30 boundary, private/own sorting, legacy review group, Eurostar inclusion and staying inclusion. Synthetic workbooks written only under ignored tests/.runtime.');

assert.equal(OnwardExport.travellers(records).length,8);
assert.deepEqual(OnwardExport.values(OnwardExport.eurostar(records)[0]),["Synthetic rail","Eurostar","2026-10-23","13:00","EX456","5","—"]);
const exported=new TextDecoder().decode(OnwardExport.workbook(records));
assert.ok(!exported.includes("sheet2.xml"));
assert.ok(exported.includes("Synthetic staying"));
for (const col of ["A","B","C","D","E","F","G"]) assert.ok(exported.includes(`<c r="${col}10" s="5"`));
assert.ok(exported.includes("No flight") && !exported.includes("Must not export inactive field"));
assert.ok(exported.includes("_xlnm.Print_Area") && exported.includes("$A$1:$G$17"));
assert.deepEqual(OnwardExport.tallies(records).map(t=>t.count),[2,1,2,1,1,1]);
assert.deepEqual(OnwardExport.tallies([]).map(t=>t.count),[0,0,0,0]);
assert.deepEqual(OnwardExport.tallies([{plan:'staying',name:'Synthetic staying'}]).map(t=>t.count),[0,0,0,1]);
assert.ok(exported.includes('Staying in Paris — 1 guest'));
assert.ok(exported.includes('Eurostar — 2 guests'));
for (const column of ['C','D','E','F']) {
  assert.ok(exported.includes(`<c r="${column}8" s="6"`),'London flight cells use their own font');
  assert.ok(!exported.includes(`<c r="${column}9" s="6"`),'Eurostar without flight does not imply London flight details');
  assert.ok(!exported.includes(`<c r="${column}3" s="6"`),'Paris flights retain normal font');
}
assert.ok(exported.includes('<name val="Georgia"/>') && exported.includes('<i/>'));

const couples=[{...base,name:'Synthetic Alex and Sam Example',partySize:2},{plan:'staying',name:'Synthetic couple',partySize:2},{...records[6],partySize:2}];
assert.deepEqual(OnwardExport.tallies(couples).map(t=>t.count),[2,0,2,2]);
assert.equal(OnwardExport.travellers(couples).length,3);
assert.equal(OnwardExport.values(OnwardExport.flyers(couples)[0])[0],'Synthetic Alex and Sam Example (2 people)');
console.log('PASS: couples remain together and count as two in all tallies.');

const repeated = [...couples, {...couples[0], name:'  SYNTHETIC Alex and Sam Example ', sharedKey:'other-session', submittedAt:'later'}, {...couples[1]}, {...couples[2]}];
assert.equal(OnwardExport.travellers(repeated).length,3);
assert.deepEqual(OnwardExport.tallies(repeated).map(t=>t.count),[2,0,2,2]);
assert.equal(OnwardExport.uniqueRecords([base,{...base,flightTime:'12:00'},{...base,name:'Different guest'}]).length,3);
assert.equal(OnwardExport.uniqueRecords([base,{...base,partySize:2}]).length,2);
console.log('PASS: repeated submissions count once; distinct guests, journeys and party sizes are retained.');
