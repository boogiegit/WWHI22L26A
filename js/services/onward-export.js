/* A small, dependency-free Excel writer. Guest text is always an inline string, never a formula. */
(function (global) {
  'use strict';
  const headers = ['NAME', 'JOURNEY', 'FLIGHT DATE', 'TIME', 'FLIGHT NO.', 'TERMINAL', 'TRANSFER'];
  const people = row => row.partySize === 2 ? 2 : 1;
  const totalPeople = rows => rows.reduce((total,row)=>total+people(row),0);
  // Ignore submission IDs/timestamps; compare only active travel details.
  function uniqueRecords(rows) {
    const seen = new Set();
    const normalize = value => String(value ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
    return rows.filter(row => {
      const fields = row.plan === 'flying'
        ? ['airport','flightDate','flightTime','flightNumber','terminal','airline','transferType']
        : row.plan === 'eurostar' ? ['eurostarDate','eurostarTime','eurostarRef','londonFlying', ...(row.londonFlying === 'yes' ? ['londonAirport','londonFlightDate','londonFlightTime','londonFlightNumber','londonTerminal','londonAirline'] : [])] : [];
      const key = JSON.stringify([normalize(row.name), people(row), row.plan, ...fields.map(field => normalize(row[field]))]);
      if (seen.has(key)) return false;
      seen.add(key); return true;
    });
  }
  function group(row) { return row.transferType === 'private' ? 2 : row.transferType === 'own' ? 3 : row.transferType === 'complimentary' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(row.flightTime) && row.flightTime > '10:30' ? 1 : 4; }
  function flyers(rows) {
    return uniqueRecords(rows).filter(row => row.plan === 'flying').map(row => ({...row, group: group(row)})).sort((a,b) => a.group-b.group || String(a.flightDate || '').localeCompare(String(b.flightDate || '')) || String(a.flightTime || '').localeCompare(String(b.flightTime || '')) || String(a.name || '').localeCompare(String(b.name || '')));
  }
  function values(row) {
    const names=people(row)===2 ? `${row.name} (2 people)` : row.name;
    if (row.plan === 'staying') return [names, 'Staying in Paris', '', '', '', '', '—'];
    if (row.plan === 'eurostar') return [names, 'Eurostar', ...(row.londonFlying === 'yes'
      ? [row.londonFlightDate, row.londonFlightTime, row.londonFlightNumber, row.londonTerminal]
      : ['', '', 'No flight', '']), '—'];
    return [names, 'Paris flight', row.flightDate, row.flightTime, row.flightNumber, row.terminal,
      ['','Complimentary','PT / private','Own','Review'][row.group || group(row)]];
  }
  function eurostar(rows) { return uniqueRecords(rows).filter(r=>r.plan==='eurostar').sort((a,b)=>String(a.eurostarDate||'').localeCompare(String(b.eurostarDate||'')) || String(a.eurostarTime||'').localeCompare(String(b.eurostarTime||'')) || String(a.name||'').localeCompare(String(b.name||''))); }
  function travellers(rows) { return [...flyers(rows), ...eurostar(rows).map(row=>({...row,group:3})), ...uniqueRecords(rows).filter(r=>r.plan==='staying').sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''))).map(row=>({...row,group:4}))]; }
  function tallies(records) {
    records=uniqueRecords(records);
    const flights=flyers(records);
    const counts=[
      {label:'Complimentary transfer · flights after 10:30',count:totalPeople(flights.filter(r=>r.group===1)),style:2},
      {label:'Private transfers',count:totalPeople(flights.filter(r=>r.group===2)),style:3},
      {label:'Eurostar',count:totalPeople(eurostar(records)),style:4},
      {label:'Staying in Paris',count:totalPeople(records.filter(r=>r.plan==='staying')),style:5}
    ];
    for (const [group,label] of [[3,'Own arrangements'],[4,'Review transfer arrangements']]) {
      const count=totalPeople(flights.filter(r=>r.group===group));
      if(count)counts.push({label,count,style:group+1});
    }
    return counts;
  }
  const xml = value => String(value ?? '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  function zip(files) {
    const encoder = new TextEncoder(), parts = [], entries = [];
    let offset = 0;
    const table = Array.from({length:256}, (_,n) => {for(let k=0;k<8;k++) n=n&1 ? 0xedb88320^(n>>>1) : n>>>1; return n>>>0;});
    const crc32 = data => {let crc=0xffffffff; for(const b of data) crc=table[(crc^b)&255]^(crc>>>8); return (crc^0xffffffff)>>>0;};
    function header(size, values) {const a=new Uint8Array(size),v=new DataView(a.buffer); for(const [at,n,bytes] of values) bytes===2?v.setUint16(at,n,true):v.setUint32(at,n,true);return a;}
    for (const [path, text] of Object.entries(files)) {
      const name=encoder.encode(path), data=encoder.encode(text), crc=crc32(data);
      const local=header(30, [[0,0x04034b50,4],[4,20,2],[6,0x800,2],[12,33,2],[14,crc,4],[18,data.length,4],[22,data.length,4],[26,name.length,2]]);
      parts.push(local,name,data);
      const central=header(46,[[0,0x02014b50,4],[4,20,2],[6,20,2],[8,0x800,2],[14,33,2],[16,crc,4],[20,data.length,4],[24,data.length,4],[28,name.length,2],[42,offset,4]]);
      entries.push(central,name); offset+=local.length+name.length+data.length;
    }
    const centralSize=entries.reduce((sum,a)=>sum+a.length,0);
    const end=header(22,[[0,0x06054b50,4],[8,Object.keys(files).length,2],[10,Object.keys(files).length,2],[12,centralSize,4],[16,offset,4]]);
    const all=[...parts,...entries,end], result=new Uint8Array(offset+centralSize+22); let pos=0;
    for(const a of all){result.set(a,pos);pos+=a.length;} return result;
  }
  function workbook(records) {
    const rows=travellers(records), end=rows.length+2;
    const cell=(value,col,row,style=0)=>`<c r="${String.fromCharCode(65+col)}${row}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
    const title=`<row r="1" ht="24" customHeight="1">${cell('ONWARD TRAVEL · WWHI22L26A',0,1,1)}</row>`;
    const heading=`<row r="2" ht="23" customHeight="1">${headers.map((h,c)=>cell(h,c,2,1)).join('')}</row>`;
    const widths=[24,14,13,8,12,10,17];
    const body=rows.map((r,i)=>{
      const cells=values(r);
      const lines=Math.max(1,...cells.map((v,c)=>Math.ceil(String(v || '').length / (widths[c]-2))));
      return `<row r="${i+3}" ht="${Math.max(18,lines*13)}" customHeight="1">${cells.map((v,c)=>cell(v,c,i+3,r.plan==='eurostar' && r.londonFlying==='yes' && c>=2 && c<=5 ? 6 : r.group+1)).join('')}</row>`;
    }).join('');
    const counts=tallies(records), lastRow=end+1+counts.length;
    const summary=`<row r="${end+1}" ht="22" customHeight="1">${cell('Italic flight details = London flights after Eurostar. Couples stay together and count as two people.',0,end+1,0)}</row>`+
      counts.map((item,i)=>`<row r="${end+2+i}" ht="20" customHeight="1">${cell(`${item.label} — ${item.count} guest${item.count===1?'':'s'}`,0,end+2+i,item.style)}</row>`).join('');
    const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
    const styles=`<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="${ns}"><fonts count="3"><font><sz val="10"/><name val="Calibri"/></font><font><b/><sz val="10"/><name val="Calibri"/></font><font><b/><i/><sz val="10"/><color rgb="FF17365D"/><name val="Georgia"/></font></fonts><fills count="7"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>${['F15B32','92D050','FFFF00','00B0F0','FCE4D6'].map(c=>`<fill><patternFill patternType="solid"><fgColor rgb="FF${c}"/><bgColor indexed="64"/></patternFill></fill>`).join('')}</fills><borders count="2"><border/><border><left style="thin"/><right style="thin"/><top style="thin"/><bottom style="thin"/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="7"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>${[2,3,4,5,6].map((f,i)=>`<xf numFmtId="0" fontId="${i===0?1:0}" fillId="${f}" borderId="1" xfId="0" applyFill="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>`).join('')}<xf numFmtId="0" fontId="2" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
    const sheet=`<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="${ns}"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><sheetViews><sheetView workbookViewId="0"><pane ySplit="2" topLeftCell="A3" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${title}${heading}${body}${summary}</sheetData><autoFilter ref="A2:G${Math.max(2,end)}"/><mergeCells count="${counts.length+2}"><mergeCell ref="A1:G1"/>${Array.from({length:counts.length+1},(_,i)=>`<mergeCell ref="A${end+1+i}:G${end+1+i}"/>`).join("")}</mergeCells><pageMargins left="0.25" right="0.25" top="0.4" bottom="0.4" header="0.2" footer="0.2"/><pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="1"/></worksheet>`;
    return zip({
      '[Content_Types].xml':'<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
      '_rels/.rels':'<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
      'xl/workbook.xml':`<?xml version="1.0"?><workbook xmlns="${ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Onward travel" sheetId="1" r:id="rId1"/></sheets><definedNames><definedName name="_xlnm.Print_Area" localSheetId="0">&apos;Onward travel&apos;!$A$1:$G$${lastRow}</definedName></definedNames></workbook>`,
      'xl/_rels/workbook.xml.rels':'<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
      'xl/styles.xml':styles, 'xl/worksheets/sheet1.xml':sheet
    });
  }
  global.OnwardExport={uniqueRecords,flyers,eurostar,travellers,tallies,values,workbook,headers};
})(typeof window === 'undefined' ? globalThis : window);
