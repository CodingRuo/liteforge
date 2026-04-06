// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type IconNode = any[][];

export function icon(data: IconNode, cls = 'w-[15px] h-[15px] shrink-0'): SVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '15');
  svg.setAttribute('height', '15');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('class', cls);
  for (const [tag, attrs] of data) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
    svg.appendChild(el);
  }
  return svg;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const IC: Record<string, IconNode> = {
  zap:           [['path',{d:'M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z'}]],
  box:           [['path',{d:'M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z'}],['polyline',{points:'3.29 7 12 12 20.71 7'}],['line',{x1:'12',y1:'22',x2:'12',y2:'12'}]],
  refreshcw:     [['path',{d:'M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8'}],['path',{d:'M21 3v5h-5'}],['path',{d:'M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16'}],['path',{d:'M8 16H3v5'}]],
  gitbranch:     [['line',{x1:'6',y1:'3',x2:'6',y2:'15'}],['circle',{cx:'18',cy:'6',r:'3'}],['circle',{cx:'6',cy:'18',r:'3'}],['path',{d:'M18 9a9 9 0 0 1-9 9'}]],
  database:      [['ellipse',{cx:'12',cy:'5',rx:'9',ry:'3'}],['path',{d:'M3 5V19A9 3 0 0 0 21 19V5'}],['path',{d:'M3 12A9 3 0 0 0 21 12'}]],
  navigation:    [['polygon',{points:'3 11 22 2 13 21 11 13 3 11'}]],
  clouddownload: [['path',{d:'M12 13v8l-4-4'}],['path',{d:'M12 21l4-4'}],['path',{d:'M4.393 15.269A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.436 8.284'}]],
  globe:         [['circle',{cx:'12',cy:'12',r:'10'}],['path',{d:'M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20'}],['path',{d:'M2 12h20'}]],
  clipboardlist: [['rect',{width:'8',height:'4',x:'8',y:'2',rx:'1',ry:'1'}],['path',{d:'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2'}],['path',{d:'M12 11h4'}],['path',{d:'M12 16h4'}],['path',{d:'M8 11h.01'}],['path',{d:'M8 16h.01'}]],
  table2:        [['path',{d:'M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18'}]],
  layers:        [['path',{d:'m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z'}],['path',{d:'m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65'}],['path',{d:'m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65'}]],
  bell:          [['path',{d:'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9'}],['path',{d:'M10.3 21a1.94 1.94 0 0 0 3.4 0'}]],
  messagesquare: [['path',{d:'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'}]],
  calendardays:  [['path',{d:'M8 2v4'}],['path',{d:'M16 2v4'}],['rect',{width:'18',height:'18',x:'3',y:'4',rx:'2'}],['path',{d:'M3 10h18'}],['path',{d:'M8 14h.01'}],['path',{d:'M12 14h.01'}],['path',{d:'M16 14h.01'}],['path',{d:'M8 18h.01'}],['path',{d:'M12 18h.01'}],['path',{d:'M16 18h.01'}]],
  languages:     [['path',{d:'m5 8 6 6'}],['path',{d:'m4 14 6-6 2-3'}],['path',{d:'M2 5h12'}],['path',{d:'M7 2h1'}],['path',{d:'m22 22-5-10-5 10'}],['path',{d:'M14 18h6'}]],
  shield:        [['path',{d:'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z'}]],
  wrench:        [['path',{d:'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z'}]],
  barchart2:     [['line',{x1:'18',y1:'20',x2:'18',y2:'10'}],['line',{x1:'12',y1:'20',x2:'12',y2:'4'}],['line',{x1:'6',y1:'20',x2:'6',y2:'14'}]],
  rocket:        [['path',{d:'M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z'}],['path',{d:'m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z'}],['path',{d:'M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0'}],['path',{d:'M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5'}]],
  chevrondown:   [['path',{d:'m6 9 6 6 6-6'}]],
  chevronright:  [['path',{d:'m9 18 6-6-6-6'}]],
  sun:           [['circle',{cx:'12',cy:'12',r:'4'}],['path',{d:'M12 2v2'}],['path',{d:'M12 20v2'}],['path',{d:'m4.93 4.93 1.41 1.41'}],['path',{d:'m17.66 17.66 1.41 1.41'}],['path',{d:'M2 12h2'}],['path',{d:'M20 12h2'}],['path',{d:'m6.34 17.66-1.41 1.41'}],['path',{d:'m19.07 4.93-1.41 1.41'}]],
  moon:          [['path',{d:'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z'}]],
  panelleft:     [['rect',{width:'18',height:'18',x:'3',y:'3',rx:'2'}],['path',{d:'M9 3v18'}]],
  panelright:    [['rect',{width:'18',height:'18',x:'3',y:'3',rx:'2'}],['path',{d:'M15 3v18'}]],
};
