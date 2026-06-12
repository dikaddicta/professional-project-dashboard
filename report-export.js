(function(){
  const BRAND = {
    navy: '#0f2747',
    ink: '#10233f',
    blue: '#2b6cb0',
    blue2: '#39a9dc',
    slate: '#64748b',
    muted: '#8aa0bd',
    light: '#eef6ff',
    soft: '#f8fbff',
    line: '#d7e5f5',
    green: '#22a06b',
    amber: '#c58a00',
    red: '#d64550',
    gray: '#94a3b8',
    white: '#ffffff'
  };

  function safe(value, fallback = '-'){
    const text = String(value ?? '').trim();
    return text || fallback;
  }

  function normalizeBranding(payload = {}){
    const project = payload.project || {};
    const raw = payload.branding || project.branding || {};
    const client = safe(raw.preparedFor || project.clientName || project.code || 'Client', 'Client');
    const accent = /^#[0-9a-f]{6}$/i.test(String(raw.brandAccentColor || '')) ? raw.brandAccentColor : BRAND.blue;
    return {
      clientLogoUrl: raw.clientLogoUrl || raw.client_logo_url || '',
      brandAccentColor: accent,
      preparedFor: client,
      preparedBy: safe(raw.preparedBy || raw.prepared_by || 'Professional Project Team'),
      confidentialityLabel: safe(raw.confidentialityLabel || raw.confidentiality_label || `Confidential — Prepared for ${client}`),
      reportFooterText: safe(raw.reportFooterText || raw.report_footer_text || 'This report is intended solely for authorized stakeholders.'),
      reportLanguage: String(payload.reportLanguage || raw.reportLanguage || raw.report_language || 'id').toLowerCase() === 'en' ? 'en' : 'id',
      showClientLogo: raw.showClientLogo !== false && raw.show_client_logo !== false,
      showCywaLogo: raw.showCywaLogo !== false && raw.show_cywa_logo !== false
    };
  }

  function isDataImage(value){
    return /^data:image\//i.test(String(value || ''));
  }

  async function resolveReportLogos(payload){
    const branding = normalizeBranding(payload);
    const cywaLogo = branding.showCywaLogo !== false ? await imageToDataUrl('assets/professional-dashboard-logo.png') : null;
    let clientLogo = null;
    if(branding.showClientLogo !== false && branding.clientLogoUrl){
      clientLogo = isDataImage(branding.clientLogoUrl) ? branding.clientLogoUrl : await imageToDataUrl(branding.clientLogoUrl);
    }
    return { branding, cywaLogo, clientLogo };
  }

  function brandedLogoBlock(branding, logos, width = 98){
    if(logos?.clientLogo){ return { image: logos.clientLogo, width, margin: [0, 0, 0, 0] }; }
    if(logos?.cywaLogo){ return { image: logos.cywaLogo, width, margin: [0, 0, 0, 0] }; }
    return { text: branding.showCywaLogo === false ? safe(branding.preparedFor).slice(0, 18) : 'PPD', style: 'coverLogo', color: branding.brandAccentColor || BRAND.blue };
  }

  function brandFooterText(payload, reportName){
    const branding = normalizeBranding(payload);
    return `${reportName} · ${branding.confidentialityLabel} · ${branding.reportFooterText}`;
  }

  function reportLang(payload){
    return normalizeBranding(payload).reportLanguage === 'en' ? 'en' : 'id';
  }
  function tr(payload, idText, enText){
    return reportLang(payload) === 'en' ? enText : idText;
  }
  function reportLocale(payload){
    return reportLang(payload) === 'en' ? 'en-US' : 'id-ID';
  }

  function isEnglish(payload){
    return reportLang(payload) === 'en';
  }

  function normalizeDateText(value, payload){
    const text = safe(value, '-');
    if(text === '-') return text;
    if(!isEnglish(payload)) return text;
    const months = {
      'Januari':'January', 'Februari':'February', 'Maret':'March', 'April':'April', 'Mei':'May', 'Juni':'June',
      'Juli':'July', 'Agustus':'August', 'September':'September', 'Oktober':'October', 'November':'November', 'Desember':'December'
    };
    return Object.keys(months).reduce((out, key) => out.replace(new RegExp(key, 'g'), months[key]), text);
  }

  function formatDateForReport(value, payload, options = { day:'2-digit', month:'short', year:'numeric' }){
    const parsed = parseDate(value);
    if(parsed) return parsed.toLocaleDateString(reportLocale(payload), options);
    return normalizeDateText(value, payload);
  }

  function monthLabel(date, payload){
    return date ? date.toLocaleDateString(reportLocale(payload), { month:'long', year:'numeric' }) : '-';
  }

  function reportTypeLabel(value, payload){
    const raw = String(value || '').trim();
    const s = raw.toLowerCase();
    if(s.includes('hold')) return isEnglish(payload) ? 'Hold' : 'Hold';
    if(s.includes('report')) return isEnglish(payload) ? 'Reporting' : 'Reporting';
    if(s.includes('assessment')) return isEnglish(payload) ? 'Assessment' : 'Assessment';
    return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : '-';
  }

  function cleanAgendaTitle(value, payload){
    let text = safe(value, '-').replace(/\s+/g, ' ').trim();
    text = text.replace(/^\[(?:Cywa\s*)?Kick\s*Off\s*Meeting\]\s*/i, isEnglish(payload) ? 'Kick-off Meeting — ' : 'Kick-off Meeting — ');
    text = text.replace(/^\[Invitation\]\s*/i, '');
    text = text.replace(/^\[Quick Discussion\]\s*/i, isEnglish(payload) ? 'Quick Discussion — ' : 'Quick Discussion — ');
    if(isEnglish(payload)){
      text = text
        .replace(/Konsultasi dan Sertifikasi ISO 27001:2022/i, 'ISO 27001:2022 Consultation and Certification')
        .replace(/Re-Sertifikasi/g, 'Re-Certification')
        .replace(/Pre\uFFADAudit/g, 'Pre-Audit')
        .replace(/Pre￾Audit/g, 'Pre-Audit')
        .replace(/Dokumen/g, 'Document')
        .replace(/dokumen/g, 'document');
    }
    return text;
  }

  function cleanBusinessText(value, payload, maxChars = 520){
    let text = safe(value, '-');
    text = text
      .replace(/\r/g, '')
      .replace(/\s+:/g, ':')
      .replace(/complience/gi, 'compliance')
      .replace(/Threat Intelegent/gi, 'Threat Intelligence')
      .replace(/Intelegent/gi, 'Intelligence')
      .replace(/Aread of Concern/gi, 'Area of Concern')
      .replace(/parimeter/gi, 'perimeter')
      .replace(/menejemen/gi, 'manajemen')
      .replace(/blush email/gi, 'broadcast email')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    if(text.length > maxChars) text = text.slice(0, maxChars - 1).replace(/\s+\S*$/, '') + '…';
    return text || '-';
  }

  function businessUpdateSummary(item, payload){
    const raw = `${item?.note || item?.update || ''}\n${item?.action || ''}`;
    const lower = raw.toLowerCase();
    if(isEnglish(payload)){
      if(lower.includes('audit stage ii day 2') || (lower.includes('dinyatakan lulus') && lower.includes('improvement'))){
        return 'Audit Stage II Day 2 was completed successfully. The audit result was positive, with improvement items recorded for periodic policy review and off-premises asset security follow-up.';
      }
      if(lower.includes('audit stage ii day 1')){
        return 'Audit Stage II Day 1 was completed without critical findings. Remaining document and annex follow-up items are being coordinated with the related teams.';
      }
      if(lower.includes('pre-audit i') || lower.includes('pre-audit stage i')){
        return 'Pre-Audit Stage I was completed and the required document adjustments have been coordinated with the client team.';
      }
      if(lower.includes('management review')){
        return 'Management review has been completed. Preparation for the next audit activity is being aligned with the related divisions.';
      }
      if(lower.includes('gap assessment')){
        return 'Gap assessment follow-up has been reviewed and the remaining document improvements are being coordinated.';
      }
      if(lower.includes('mom') || lower.includes('doc list')){
        return 'Meeting minutes and document list updates have been prepared and shared through the project workspace.';
      }
    }
    return cleanBusinessText(raw, payload, isEnglish(payload) ? 360 : 520);
  }

  function businessNextStep(item, payload){
    const action = String(item?.action || '').trim();
    if(action && action !== '-') return cleanBusinessText(action, payload, 220);
    if(isEnglish(payload)) return 'Follow-up ownership and closure evidence will be confirmed by the project team.';
    return 'Kepemilikan tindak lanjut dan bukti penyelesaian akan dikonfirmasi oleh tim project.';
  }

  function riskReasonText(value, payload){
    const raw = safe(value, '-');
    if(!isEnglish(payload)) return raw;
    const match = raw.match(/Belum dimulai padahal timeline start\s+(.+?)\s+sudah lewat/i);
    if(match) return `The activity has not started, although the planned start date of ${normalizeDateText(match[1], payload)} has passed.`;
    return normalizeDateText(raw
      .replace(/End aktual melewati timeline/i, 'Actual end date exceeded the baseline')
      .replace(/Start aktual melewati timeline/i, 'Actual start date exceeded the baseline')
      .replace(/Belum ada catatan PM \/ next action\./i, 'PM follow-up note has not been provided.'), payload);
  }

  function pmNoteText(value, payload){
    const raw = safe(value, '-');
    if(!isEnglish(payload)) return raw;
    if(/Belum ada catatan PM/i.test(raw)) return 'PM follow-up note has not been provided.';
    return normalizeDateText(raw, payload);
  }

  function number(value, fallback = 0){
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function pct(value){
    const n = number(value, 0);
    return `${Math.max(0, Math.min(100, Math.round(n)))}%`;
  }

  function sanitizeFileName(value){
    return String(value || 'PPD_Report')
      .replace(/[^a-z0-9\-_]+/gi, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 120);
  }

  async function imageToDataUrl(url){
    try{
      const res = await fetch(url);
      if(!res.ok) return null;
      const blob = await res.blob();
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    }catch(_err){
      return null;
    }
  }

  function healthColor(health){
    const tone = String(health?.tone || health?.label || '').toLowerCase();
    if(tone.includes('healthy')) return BRAND.green;
    if(tone.includes('attention')) return BRAND.amber;
    if(tone.includes('critical')) return BRAND.red;
    return BRAND.slate;
  }

  function statusBucket(status){
    const s = String(status || '').toLowerCase();
    if(s.includes('complete') || s.includes('selesai')) return 'Completed';
    if(s.includes('progress') || s.includes('berlangsung')) return 'In Progress';
    if(s.includes('hold')) return 'Hold';
    if(s.includes('block')) return 'Blocked';
    return 'Not Started';
  }

  function statusColor(label){
    const s = String(label || '').toLowerCase();
    if(s.includes('complete')) return BRAND.green;
    if(s.includes('progress')) return BRAND.blue;
    if(s.includes('hold')) return BRAND.amber;
    if(s.includes('block')) return BRAND.red;
    if(s.includes('risk')) return BRAND.red;
    return BRAND.gray;
  }

  function sectionTitle(title, subtitle){
    const stack = [{ text: title, style: 'sectionTitle', margin: [0, 18, 0, subtitle ? 2 : 8] }];
    if(subtitle) stack.push({ text: subtitle, style: 'sectionSubtitle', margin: [0, 0, 0, 8] });
    return { stack };
  }

  function badge(text, color){
    return {
      table: { widths: ['auto'], body: [[{ text: safe(text), color, bold: true, fontSize: 9, margin: [8, 4, 8, 4] }]] },
      layout: {
        hLineColor: () => color,
        vLineColor: () => color,
        fillColor: () => '#ffffff',
        paddingLeft: () => 0,
        paddingRight: () => 0,
        paddingTop: () => 0,
        paddingBottom: () => 0
      }
    };
  }

  function progressCanvas(value, width = 150, color = BRAND.blue, height = 8){
    const p = Math.max(0, Math.min(100, number(value, 0)));
    return {
      canvas: [
        { type: 'rect', x: 0, y: 0, w: width, h: height, color: '#e6eef8' },
        { type: 'rect', x: 0, y: 0, w: Math.max(1, width * (p / 100)), h: height, color }
      ],
      margin: [0, 3, 0, 2]
    };
  }

  function premiumCard(stack, options = {}){
    return {
      table: {
        widths: ['*'],
        body: [[{ stack, margin: options.margin || [12, 10, 12, 10] }]]
      },
      layout: {
        hLineColor: () => options.border || BRAND.line,
        vLineColor: () => options.border || BRAND.line,
        fillColor: () => options.fill || '#ffffff',
        paddingLeft: () => 0,
        paddingRight: () => 0,
        paddingTop: () => 0,
        paddingBottom: () => 0
      },
      margin: options.outerMargin || [0, 0, 0, 0]
    };
  }

  function metricCard(label, value, subtext, color = BRAND.blue){
    return premiumCard([
      { text: label, style: 'metricLabel' },
      { text: safe(value, '0'), style: 'metricValueLarge', color, margin: [0, 2, 0, 0] },
      subtext ? { text: subtext, style: 'smallText', margin: [0, 2, 0, 0] } : { text: ' ', fontSize: 1 }
    ], { fill: BRAND.soft });
  }

  function statGrid(items){
    const rows = [];
    for(let i = 0; i < items.length; i += 3){
      rows.push([
        items[i] || { text: '' },
        items[i + 1] || { text: '' },
        items[i + 2] || { text: '' }
      ]);
    }
    return {
      table: { widths: ['*', '*', '*'], body: rows },
      layout: 'noBorders',
      margin: [0, 4, 0, 8]
    };
  }

  function keyValueGrid(items){
    const rows = [];
    for(let i = 0; i < items.length; i += 2){
      const left = items[i] || ['', ''];
      const right = items[i + 1] || ['', ''];
      rows.push([
        { stack: [{ text: left[0], style: 'metricLabel' }, { text: left[1], style: 'metricValue' }], margin: [10, 8, 10, 8] },
        { stack: [{ text: right[0], style: 'metricLabel' }, { text: right[1], style: 'metricValue' }], margin: [10, 8, 10, 8] }
      ]);
    }
    return {
      table: { widths: ['*', '*'], body: rows },
      layout: {
        hLineColor: () => BRAND.line,
        vLineColor: () => BRAND.line,
        fillColor: () => '#f8fbff',
        paddingLeft: () => 0,
        paddingRight: () => 0,
        paddingTop: () => 0,
        paddingBottom: () => 0
      },
      margin: [0, 4, 0, 10]
    };
  }

  function makeTable(headers, rows, widths, options = {}){
    const body = [headers.map(h => ({ text: h, style: 'tableHeader' }))];
    (rows || []).forEach(row => body.push(row.map(cell => ({ text: safe(cell), style: options.small ? 'tableCellSmall' : 'tableCell' }))));
    return {
      table: { headerRows: 1, widths, body },
      layout: {
        hLineColor: () => BRAND.line,
        vLineColor: () => BRAND.line,
        fillColor: (rowIndex) => rowIndex === 0 ? BRAND.light : (rowIndex % 2 === 0 ? '#fbfdff' : null),
        paddingLeft: () => 6,
        paddingRight: () => 6,
        paddingTop: () => options.small ? 4 : 6,
        paddingBottom: () => options.small ? 4 : 6
      },
      margin: [0, 4, 0, 8]
    };
  }

  function bulletList(items, emptyText){
    const list = (items || []).filter(Boolean).slice(0, 8);
    if(!list.length) return { text: emptyText || 'Tidak ada data.', style: 'smallText', margin: [0, 2, 0, 8] };
    return {
      ul: list.map(text => ({ text, margin: [0, 2, 0, 2] })),
      margin: [0, 2, 0, 8]
    };
  }

  function taskStatusSummary(tasks){
    const counts = { Completed:0, 'In Progress':0, 'Not Started':0, Hold:0, Blocked:0 };
    (tasks || []).forEach(task => { counts[statusBucket(task.status)] += 1; });
    const total = Object.values(counts).reduce((a,b) => a + b, 0);
    return { counts, total };
  }

  function stackedStatusBar(summary, width = 460){
    const total = summary.total || 1;
    const order = ['Completed', 'In Progress', 'Not Started', 'Hold', 'Blocked'];
    let x = 0;
    const bars = [];
    order.forEach(label => {
      const count = summary.counts[label] || 0;
      if(!count) return;
      const w = Math.max(8, width * (count / total));
      bars.push({ type: 'rect', x, y: 0, w, h: 12, color: statusColor(label) });
      x += w;
    });
    return {
      stack: [
        { canvas: [{ type: 'rect', x: 0, y: 0, w: width, h: 12, color: '#e6eef8' }, ...bars], margin: [0, 4, 0, 6] },
        {
          columns: order.map(label => ({
            width: '*',
            stack: [
              { canvas: [{ type: 'rect', x: 0, y: 2, w: 9, h: 9, color: statusColor(label) }] },
              { text: `${label}: ${summary.counts[label] || 0}`, style: 'legendText', margin: [13, -10, 0, 0] }
            ]
          }))
        }
      ],
      margin: [0, 2, 0, 8]
    };
  }

  function timelineRiskStrip(payload, width = 460){
    const tasks = payload.tasks || [];
    const active = payload.activeRisks?.length || 0;
    const closedLate = payload.closedLate?.length || 0;
    const hold = tasks.filter(t => statusBucket(t.status) === 'Hold').length;
    const blocked = tasks.filter(t => statusBucket(t.status) === 'Blocked').length;
    const completed = tasks.filter(t => statusBucket(t.status) === 'Completed').length;
    const base = [
      ['On Track / Closed', completed, BRAND.green],
      ['Active Risk', active, BRAND.red],
      ['Closed Late', closedLate, BRAND.amber],
      ['Hold / Blocked', hold + blocked, BRAND.slate]
    ];
    const total = Math.max(1, base.reduce((sum, item) => sum + item[1], 0));
    let x = 0;
    const bars = [];
    base.forEach(([label, count, color]) => {
      if(!count) return;
      const w = Math.max(10, width * (count / total));
      bars.push({ type: 'rect', x, y: 0, w, h: 14, color });
      x += w;
    });
    return {
      stack: [
        { canvas: [{ type: 'rect', x: 0, y: 0, w: width, h: 14, color: '#e6eef8' }, ...bars], margin: [0, 4, 0, 7] },
        {
          columns: base.map(([label, count, color]) => ({
            width: '*',
            stack: [
              { canvas: [{ type: 'rect', x: 0, y: 2, w: 9, h: 9, color }] },
              { text: `${label}: ${count}`, style: 'legendText', margin: [13, -10, 0, 0] }
            ]
          }))
        }
      ],
      margin: [0, 2, 0, 10]
    };
  }

  function healthGauge(health, width = 230, payload = {}){
    const score = Math.max(0, Math.min(100, number(health?.score, 0)));
    const color = healthColor(health);
    return premiumCard([
      { text: tr(payload, 'KESEHATAN PROJECT', 'PROJECT HEALTH'), style: 'metricLabel' },
      { text: `${safe(health?.label)} · ${score}%`, style: 'metricValueLarge', color, margin: [0, 2, 0, 6] },
      progressCanvas(score, width, color, 10),
      { text: score >= 82 ? tr(payload, 'Project berada pada kondisi aman.', 'The project is in a healthy condition.') : score >= 60 ? tr(payload, 'Project membutuhkan monitoring aktif.', 'The project requires active monitoring.') : tr(payload, 'Project membutuhkan perhatian prioritas.', 'The project requires priority attention.'), style: 'smallText', margin: [0, 4, 0, 0] }
    ], { fill: '#fffefe', border: color, margin: [12, 10, 12, 10] });
  }

  function documentCompletionBlock(doc, width = 230, payload = {}){
    const total = number(doc.total, 0);
    const completed = number(doc.completed, 0);
    const rate = total ? Math.round((completed / total) * 100) : 0;
    return premiumCard([
      { text: tr(payload, 'KELENGKAPAN DOKUMEN', 'DOCUMENT LIST COMPLETION'), style: 'metricLabel' },
      { text: `${completed}/${total}`, style: 'metricValueLarge', color: BRAND.blue, margin: [0, 2, 0, 6] },
      progressCanvas(rate, width, BRAND.blue2, 10),
      { text: tr(payload, `${rate}% selesai · Document Output tidak dihitung.`, `${rate}% complete · Document Output is not counted.`), style: 'smallText', margin: [0, 4, 0, 0] }
    ], { fill: BRAND.soft });
  }

  function executiveNarrative(payload){
    const health = payload.health || {};
    const metrics = payload.metrics || {};
    const active = payload.activeRisks?.length || 0;
    const closedLate = payload.closedLate?.length || 0;
    const current = safe(payload.currentPhase?.label || payload.currentPhase?.task, tr(payload, 'fase berjalan belum ditentukan', 'the current phase has not been defined'));
    const next = safe(payload.nextMilestone?.label, tr(payload, 'milestone berikutnya belum ditentukan', 'the next milestone has not been defined'));
    const progress = pct(metrics.projectProgress);
    if(reportLang(payload) === 'en'){
      if(active > 0) return `The project remains in a ${safe(health.label).toLowerCase()} position, with overall progress recorded at ${progress}. The current focus is ${current}, while ${next} remains the next milestone. ${active} follow-up ${active === 1 ? 'item requires' : 'items require'} PM attention to maintain closure readiness.`;
      if(closedLate > 0) return `The project remains in a ${safe(health.label).toLowerCase()} position, with overall progress recorded at ${progress}. No major open risk is recorded in this report, while ${closedLate} closed schedule variance ${closedLate === 1 ? 'entry should' : 'entries should'} be reviewed as timeline control lessons learned.`;
      return `The project remains in a ${safe(health.label).toLowerCase()} position, with overall progress recorded at ${progress}. No major open risk is recorded in this report. The next focus is to keep ${next} aligned with the agreed baseline.`;
    }
    if(active > 0) return `Project saat ini berada pada status ${safe(health.label)} dengan progress ${progress}. Fokus utama berada pada ${current}, sementara milestone berikutnya adalah ${next}. Terdapat ${active} active risk yang membutuhkan tindak lanjut PM agar baseline timeline tetap terkendali.`;
    if(closedLate > 0) return `Project saat ini berada pada status ${safe(health.label)} dengan progress ${progress}. Tidak ada active risk utama saat report dibuat, namun terdapat ${closedLate} schedule variance yang sudah tertutup dan perlu menjadi pembelajaran untuk kontrol timeline berikutnya.`;
    return `Project saat ini berada pada status ${safe(health.label)} dengan progress ${progress}. Tidak ada active risk utama saat report dibuat. Fokus berikutnya adalah memastikan ${next} berjalan sesuai baseline timeline.`;
  }

  function keyHighlights(payload){
    const m = payload.metrics || {};
    const doc = payload.documentMetrics || {};
    const highlights = [];
    if(reportLang(payload) === 'en'){
      highlights.push(`Project progress is ${pct(m.projectProgress)}, with ${safe(m.completed, 0)} of ${safe(m.total, 0)} tasks completed.`);
      highlights.push(`Document List completion: ${safe(doc.completed, 0)}/${safe(doc.total, 0)} documents.`);
      if(payload.currentPhase) highlights.push(`Current phase: ${safe(payload.currentPhase.label || payload.currentPhase.task)}.`);
      if(payload.nextMilestone) highlights.push(`Next milestone: ${safe(payload.nextMilestone.label)}.`);
      if((payload.outputs || []).length) highlights.push(`${payload.outputs.length} Document Output entries have been recorded for supporting deliverables.`);
      return highlights;
    }
    highlights.push(`Progress project berada di ${pct(m.projectProgress)} dengan ${safe(m.completed, 0)} dari ${safe(m.total, 0)} task selesai.`);
    highlights.push(`Document List completion: ${safe(doc.completed, 0)}/${safe(doc.total, 0)} dokumen.`);
    if(payload.currentPhase) highlights.push(`Current phase: ${safe(payload.currentPhase.label || payload.currentPhase.task)}.`);
    if(payload.nextMilestone) highlights.push(`Next milestone: ${safe(payload.nextMilestone.label)}.`);
    if((payload.outputs || []).length) highlights.push(`${payload.outputs.length} Document Output sudah tercatat dalam dashboard.`);
    return highlights;
  }

  function attentionItems(payload){
    const items = [];
    const active = payload.activeRisks || [];
    const decisions = (payload.meetings || []).filter(m => String(m.type || '').toLowerCase().includes('decision'));
    if(reportLang(payload) === 'en'){
      if(active.length) items.push(`${active.length} open risk requires clear PM reason and next action.`);
      if(decisions.length) items.push(`${decisions.length} decision or update entries should be monitored from the update log.`);
      if(payload.closedLate?.length) items.push(`${payload.closedLate.length} closed schedule variance entries are recorded as timeline lessons learned.`);
      if(!items.length) items.push('No critical attention item is detected at report generation.');
      return items;
    }
    if(active.length) items.push(`${active.length} active risk membutuhkan alasan/next action yang jelas dari PM.`);
    if(decisions.length) items.push(`${decisions.length} decision/update item perlu dimonitor dari update log.`);
    if(payload.closedLate?.length) items.push(`${payload.closedLate.length} closed late / schedule variance tercatat sebagai pembelajaran timeline.`);
    if(!items.length) items.push('Tidak ada perhatian kritikal yang terdeteksi pada saat report dibuat.');
    return items;
  }

  function recommendedActions(payload){
    const actions = [];
    const risksWithoutNotes = (payload.activeRisks || []).filter(item => !item.notes || item.notes === 'Belum ada catatan PM / next action.').length;
    if(reportLang(payload) === 'en'){
      if(risksWithoutNotes) actions.push('Complete PM follow-up notes for open-risk tasks so the reason, owner, and closure plan are clear.');
      if(payload.activeRisks?.length) actions.push('Prioritize follow-up for activities that are beyond the baseline timeline or have not started after the planned start date.');
      if(payload.nextMilestone) actions.push(`Confirm readiness for the next milestone: ${safe(payload.nextMilestone.label)}.`);
      if(!actions.length) actions.push('Continue periodic monitoring and update the dashboard after the next progress movement.');
      return actions;
    }
    if(risksWithoutNotes) actions.push('Lengkapi PM Notes pada task Active Risk agar executive reader memahami alasan dan rencana tindak lanjut.');
    if(payload.activeRisks?.length) actions.push('Prioritaskan follow-up terhadap task yang melewati baseline timeline atau belum dimulai setelah start date.');
    if(payload.nextMilestone) actions.push(`Pastikan readiness untuk milestone berikutnya: ${safe(payload.nextMilestone.label)}.`);
    if(!actions.length) actions.push('Lanjutkan monitoring berkala dan update dashboard setelah progress berikutnya.');
    return actions;
  }

  function timelineSnapshot(items, payload = {}){
    const rows = (items || []).slice(0, 18).map(item => [
      safe(item.name),
      formatDateForReport(item.startDate, payload),
      formatDateForReport(item.endDate, payload),
      reportTypeLabel(item.type, payload)
    ]);
    if(!rows.length) return { text: tr(payload, 'Timeline belum tersedia.', 'Timeline is not available yet.'), style: 'smallText' };
    return makeTable([tr(payload, 'Timeline', 'Timeline'), tr(payload, 'Mulai', 'Start'), tr(payload, 'Selesai', 'End'), tr(payload, 'Tipe', 'Type')], rows, ['*', 60, 60, 72], { small: true });
  }



  function parseDate(value){
    if(!value) return null;
    if(value instanceof Date && !Number.isNaN(value.getTime())) return new Date(value.getFullYear(), value.getMonth(), value.getDate());
    const raw = String(value).trim();
    let d = null;
    const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if(iso) d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    else {
      const parsed = new Date(raw);
      if(!Number.isNaN(parsed.getTime())) d = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    }
    return d && !Number.isNaN(d.getTime()) ? d : null;
  }

  function addDays(date, days){
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    d.setDate(d.getDate() + days);
    return d;
  }

  function dateKey(date){
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  }

  function formatShortDate(date, payload = {}){
    if(!date) return '-';
    return date.toLocaleDateString(reportLocale(payload), { day:'2-digit', month:'short', year:'numeric' });
  }

  function normalizeTimelineForPdf(project){
    const sourceItems = project?.timelinePlan || [];
    return sourceItems.map((item) => {
      const rawPhases = item.phases && item.phases.length ? item.phases : [{
        label: item.task || item.name || 'Timeline',
        type: item.type || 'assessment',
        startDate: item.startDate,
        endDate: item.endDate
      }];
      const phases = rawPhases.map(phase => {
        const start = parseDate(phase.startDate || item.startDate);
        const end = parseDate(phase.endDate || item.endDate) || start;
        if(!start && !end) return null;
        const cleanStart = start || end;
        const cleanEnd = end && cleanStart && end < cleanStart ? cleanStart : (end || cleanStart);
        return {
          task: item.task || item.name || 'Timeline',
          label: phase.label || item.task || 'Timeline',
          type: String(phase.type || item.type || 'assessment').toLowerCase(),
          start: cleanStart,
          end: cleanEnd,
          startDate: dateKey(cleanStart),
          endDate: dateKey(cleanEnd)
        };
      }).filter(Boolean);
      return { task: item.task || item.name || 'Timeline', phases };
    }).filter(item => item.phases.length);
  }

  function timelineTone(type){
    const s = String(type || '').toLowerCase();
    if(s.includes('hold')) return BRAND.amber;
    if(s.includes('report')) return BRAND.blue2;
    if(s.includes('assessment')) return BRAND.blue;
    return BRAND.slate;
  }

  function phaseOverlaps(phase, day){
    const d = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    return d >= phase.start && d <= phase.end;
  }

  function buildMonthChunks(items, payload = {}){
    const allDates = [];
    items.forEach(item => item.phases.forEach(phase => allDates.push(phase.start, phase.end)));
    if(!allDates.length) return [];
    const min = new Date(Math.min(...allDates.map(d => d.getTime())));
    const max = new Date(Math.max(...allDates.map(d => d.getTime())));
    const chunks = [];
    const cursor = new Date(min.getFullYear(), min.getMonth(), 1);
    while(cursor <= max){
      const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
      const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
      const days = [];
      let d = new Date(start);
      while(d <= end){ days.push(new Date(d)); d = addDays(d, 1); }
      const rows = items.map(item => {
        const phases = item.phases.filter(phase => phase.end >= start && phase.start <= end);
        return phases.length ? { ...item, phases } : null;
      }).filter(Boolean);
      if(rows.length){
        chunks.push({
          label: monthLabel(start, payload),
          start,
          end,
          days,
          rows
        });
      }
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return chunks;
  }

  function timelineVisualTable(chunk, payload = {}){
    const taskWidth = 150;
    const dayWidth = Math.max(9, Math.min(18, Math.floor(560 / chunk.days.length)));
    const widths = [taskWidth, ...chunk.days.map(() => dayWidth)];
    const body = [];
    body.push([
      { text: tr(payload, 'Task', 'Task'), rowSpan: 2, style: 'timelineHead', fillColor: BRAND.light, margin: [4, 10, 4, 4] },
      { text: chunk.label, colSpan: chunk.days.length, style: 'timelineMonth', fillColor: BRAND.light, alignment: 'center', margin: [0, 4, 0, 4] },
      ...chunk.days.slice(1).map(() => ({}))
    ]);
    body.push([
      {},
      ...chunk.days.map(day => ({
        text: String(day.getDate()),
        style: 'timelineDay',
        alignment: 'center',
        fillColor: day.getDay() === 0 || day.getDay() === 6 ? '#f4f8fc' : BRAND.white,
        margin: [0, 3, 0, 3]
      }))
    ]);

    chunk.rows.forEach(item => {
      const cells = chunk.days.map(day => {
        const phases = item.phases.filter(phase => phaseOverlaps(phase, day));
        if(!phases.length){
          return { text: '', fillColor: BRAND.white };
        }
        const phase = phases[0];
        return {
          text: '',
          fillColor: timelineTone(phase.type),
          borderColor: [BRAND.line, timelineTone(phase.type), BRAND.line, timelineTone(phase.type)]
        };
      });
      body.push([
        { text: safe(item.task), style: 'timelineTask', fillColor: '#fbfdff', margin: [4, 5, 4, 5] },
        ...cells
      ]);
    });

    return {
      table: { widths, body, dontBreakRows: true },
      layout: {
        hLineWidth: () => 0.6,
        vLineWidth: () => 0.6,
        hLineColor: () => BRAND.line,
        vLineColor: () => BRAND.line,
        paddingLeft: () => 0,
        paddingRight: () => 0,
        paddingTop: () => 0,
        paddingBottom: () => 0
      },
      margin: [0, 8, 0, 8]
    };
  }

  function timelineMonthSummary(chunk, payload){
    const rows = chunk.rows.length;
    const start = formatShortDate(chunk.start, payload);
    const end = formatShortDate(chunk.end, payload);
    return premiumCard([
      { text: tr(payload, 'Ringkasan Bulan', 'Monthly Summary'), style: 'metricLabel' },
      { text: tr(payload, `${rows} aktivitas ditampilkan untuk periode ${start} — ${end}.`, `${rows} scheduled activities are shown for ${start} — ${end}.`), style: 'smallText', margin: [0, 3, 0, 0] }
    ], { fill: '#fbfdff', outerMargin: [0, 0, 0, 12], margin: [10, 8, 10, 8] });
  }

  function buildTimelineDocDefinition(payload, logos){
    const project = payload.project || {};
    const branding = normalizeBranding(payload);
    const items = normalizeTimelineForPdf(project);
    const chunks = buildMonthChunks(items, payload);
    const periodStart = chunks[0]?.start || null;
    const periodEnd = chunks[chunks.length - 1]?.end || null;
    const content = [];

    content.push({
      columns: [
        brandedLogoBlock(branding, logos, 92),
        { stack: [
          { text: tr(payload, 'Timeline Project', 'Project Timeline'), style: 'timelineCoverTitle' },
          { text: safe(project.name), style: 'coverProject', margin: [0, 4, 0, 0] },
          { text: `${safe(project.code)} · ${tr(payload, 'Disiapkan untuk', 'Prepared for')} ${safe(branding.preparedFor)} · ${periodStart ? formatShortDate(periodStart, payload) : '-'} — ${periodEnd ? formatShortDate(periodEnd, payload) : '-'}`, style: 'smallText', margin: [0, 3, 0, 0] }
        ]},
        { text: branding.confidentialityLabel, alignment: 'right', color: branding.brandAccentColor, bold: true, fontSize: 8, margin: [0, 6, 0, 0] }
      ],
      columnGap: 12,
      margin: [0, 0, 0, 16]
    });

    content.push({
      columns: [
        metricCard(tr(payload, 'Total Aktivitas Timeline', 'Timeline Activities'), String(items.length), tr(payload, 'Jumlah aktivitas terjadwal', 'Scheduled activity rows')),
        metricCard(tr(payload, 'Periode', 'Period'), `${periodStart ? formatShortDate(periodStart, payload) : '-'} — ${periodEnd ? formatShortDate(periodEnd, payload) : '-'}`, tr(payload, 'Baseline jadwal', 'Baseline schedule')),
        metricCard(tr(payload, 'Tanggal Dokumen', 'Document Date'), new Date().toLocaleDateString(reportLocale(payload), { day:'2-digit', month:'long', year:'numeric' }), tr(payload, 'Tanggal dokumen dibuat', 'Document generated date'))
      ],
      columnGap: 10,
      margin: [0, 0, 0, 10]
    });

    content.push({
      columns: [
        { text: tr(payload, 'Legenda:', 'Legend:'), bold: true, fontSize: 8, color: BRAND.slate, width: 50 },
        { canvas: [{ type:'rect', x:0, y:2, w:14, h:7, color: BRAND.blue, r:2 }], width: 18 }, { text:'Assessment', fontSize: 8, color: BRAND.slate, width: 70 },
        { canvas: [{ type:'rect', x:0, y:2, w:14, h:7, color: BRAND.blue2, r:2 }], width: 18 }, { text:'Reporting', fontSize: 8, color: BRAND.slate, width: 70 },
        { canvas: [{ type:'rect', x:0, y:2, w:14, h:7, color: BRAND.amber, r:2 }], width: 18 }, { text:'Hold', fontSize: 8, color: BRAND.slate, width: 60 },
        { text:'', width:'*' }
      ],
      margin: [0, 0, 0, 8]
    });

    if(!chunks.length){
      content.push({ text: tr(payload, 'Timeline belum tersedia.', 'Timeline is not available yet.'), style: 'smallText' });
    }else{
      chunks.forEach((chunk, index) => {
        if(index > 0) content.push({ text: '', pageBreak: 'before' });
        content.push({ text: chunk.label, style: 'sectionTitle', margin: [0, index ? 0 : 4, 0, 2] });
        content.push({ text: tr(payload, 'Tampilan bulanan atas rencana aktivitas dan cakupan milestone project.', 'Monthly view of planned project activities and milestone coverage.'), style: 'sectionSubtitle', margin: [0, 0, 0, 4] });
        content.push(timelineVisualTable(chunk, payload));
        content.push(timelineMonthSummary(chunk, payload));
      });
    }

    return {
      pageSize: 'A4',
      pageOrientation: 'landscape',
      pageMargins: [30, 34, 30, 34],
      info: {
        title: `Professional Project Timeline - ${safe(project.name)}`,
        author: 'Professional Project Dashboard',
        subject: 'Timeline Project'
      },
      footer: function(currentPage, pageCount){
        return {
          columns: [
            { text: brandFooterText(payload, 'Project Timeline'), color: BRAND.slate, fontSize: 8, margin: [30, 0, 0, 0] },
            { text: `${currentPage} / ${pageCount}`, alignment: 'right', color: BRAND.slate, fontSize: 8, margin: [0, 0, 30, 0] }
          ]
        };
      },
      content,
      defaultStyle: { font: 'Roboto', fontSize: 8, color: BRAND.navy, lineHeight: 1.2 },
      styles: {
        coverLogo: { fontSize: 20, bold: true, color: BRAND.blue },
        coverProject: { fontSize: 12, bold: true, color: BRAND.navy },
        timelineCoverTitle: { fontSize: 22, bold: true, color: BRAND.navy, characterSpacing: 0.3 },
        sectionTitle: { fontSize: 12, bold: true, color: BRAND.navy },
        sectionSubtitle: { fontSize: 8, color: BRAND.slate },
        smallText: { fontSize: 8, color: BRAND.slate },
        metricLabel: { fontSize: 7.5, color: BRAND.slate, bold: true, characterSpacing: 0.8 },
        metricValue: { fontSize: 10, color: BRAND.navy, bold: true },
        timelineHead: { bold: true, color: BRAND.navy, fontSize: 8 },
        timelineMonth: { bold: true, color: BRAND.navy, fontSize: 9 },
        timelineDay: { color: BRAND.slate, fontSize: 7 },
        timelineTask: { bold: true, color: BRAND.navy, fontSize: 7.2 }
      }
    };
  }

  function buildDocDefinition(payload, logos){
    const project = payload.project || {};
    const branding = normalizeBranding(payload);
    const metrics = payload.metrics || {};
    const health = payload.health || {};
    const doc = payload.documentMetrics || {};
    const reportDate = payload.reportDate || new Date().toLocaleDateString(reportLocale(payload), { day:'2-digit', month:'long', year:'numeric' });
    const hColor = healthColor(health);
    const latestUpdate = latestClientUpdates(payload, 1)[0];

    const content = [];

    content.push({
      columns: [
        brandedLogoBlock(branding, logos, 98),
        { stack: [
          { text: branding.confidentialityLabel, alignment: 'right', color: branding.brandAccentColor, bold: true, fontSize: 9 },
          { text: branding.reportLanguage === 'id' ? 'Ringkasan Eksekutif PDF' : 'Executive Summary PDF', alignment: 'right', color: BRAND.slate, fontSize: 9, margin: [0, 6, 0, 0] }
        ], margin: [0, 6, 0, 0] }
      ]
    });
    content.push({ text: branding.reportLanguage === 'id' ? 'RINGKASAN EKSEKUTIF' : 'EXECUTIVE SUMMARY', style: 'coverTitle', margin: [0, 56, 0, 4] });
    content.push({ text: safe(project.name), style: 'coverProject' });
    content.push({ text: `${safe(project.code)} · ${tr(payload, 'Disiapkan untuk', 'Prepared for')} ${safe(branding.preparedFor)}`, style: 'coverClient', margin: [0, 4, 0, 18] });
    content.push({ canvas: [{ type: 'rect', x: 0, y: 0, w: 515, h: 3, color: branding.brandAccentColor }, { type: 'rect', x: 170, y: 0, w: 180, h: 3, color: BRAND.blue2 }, { type: 'rect', x: 350, y: 0, w: 165, h: 3, color: hColor }] });
    content.push(keyValueGrid([
      [tr(payload, 'Tanggal Report', 'Report Date'), reportDate],
      [tr(payload, 'Bahasa Report', 'Report Language'), branding.reportLanguage === 'en' ? 'English' : 'Bahasa Indonesia'],
      [tr(payload, 'Disiapkan untuk', 'Prepared for'), branding.preparedFor],
      [tr(payload, 'Disiapkan oleh', 'Prepared by'), branding.preparedBy],
      [tr(payload, 'Tipe Dokumen', 'Document Type'), tr(payload, 'Ringkasan eksekutif untuk manajemen', 'Board-ready executive summary')],
      [tr(payload, 'Tujuan Penggunaan', 'Intended Use'), tr(payload, 'Update singkat untuk stakeholder / manajemen', 'Fast stakeholder update / management brief')],
      [tr(payload, 'Kesehatan Project', 'Project Health'), `${safe(health.label)} · ${safe(health.score, 0)}%`],
      [tr(payload, 'Progress Keseluruhan', 'Overall Progress'), pct(metrics.projectProgress)],
      [tr(payload, 'Fase Saat Ini', 'Current Phase'), safe(payload.currentPhase?.label || payload.currentPhase?.task)],
      [tr(payload, 'Milestone Berikutnya', 'Next Milestone'), safe(payload.nextMilestone?.label)]
    ]));
    content.push(premiumCard([
      { text: tr(payload, 'RUANG LINGKUP RINGKASAN', 'SUMMARY SCOPE'), style: 'metricLabel' },
      { text: tr(payload, 'Dokumen ini disusun ringkas untuk pembacaan cepat oleh manajemen. Detail operasional, daftar task lengkap, dokumen, risiko, dan kesiapan handover tersedia di Paket Laporan Lengkap.', 'This document is intentionally concise for quick management review. Operational details, full task list, documents, risks, and handover readiness are available in the Full Report Pack.'), style: 'narrativeText', margin: [0, 4, 0, 0] }
    ], { fill: BRAND.soft, outerMargin: [0, 20, 0, 0] }));
    content.push({ text: '', pageBreak: 'after' });

    content.push(sectionTitle(tr(payload, 'Ringkasan Keputusan Eksekutif', 'Executive Decision Snapshot'), tr(payload, 'Ringkasan status, perhatian utama, dan keputusan/tindak lanjut yang perlu dimonitor.', 'Summary of status, key attention items, and decisions/follow-up actions to monitor.')));
    content.push({
      columns: [
        { width: '50%', stack: [healthGauge(health, 205, payload)] },
        { width: '50%', stack: [documentCompletionBlock(doc, 205, payload)] }
      ],
      columnGap: 12,
      margin: [0, 0, 0, 8]
    });

    content.push(statGrid([
      metricCard(tr(payload, 'Progress Keseluruhan', 'Overall Progress'), pct(metrics.projectProgress), tr(payload, `${safe(metrics.completed, 0)} / ${safe(metrics.total, 0)} task selesai`, `${safe(metrics.completed, 0)} / ${safe(metrics.total, 0)} task completed`), BRAND.blue),
      metricCard(tr(payload, 'Risiko Aktif', 'Active Risk'), payload.activeRisks?.length || 0, tr(payload, 'Risiko terbuka / item perhatian', 'Open risk / attention item'), payload.activeRisks?.length ? BRAND.red : BRAND.green),
      metricCard(tr(payload, 'Selesai Terlambat', 'Closed Late'), payload.closedLate?.length || 0, tr(payload, 'Selesai dengan deviasi jadwal', 'Completed with schedule variance'), payload.closedLate?.length ? BRAND.amber : BRAND.green),
      metricCard('Document List', `${safe(doc.completed, 0)}/${safe(doc.total, 0)}`, tr(payload, 'Kelengkapan dokumen terkendali', 'Controlled document completion'), BRAND.blue2),
      metricCard(tr(payload, 'Fase Saat Ini', 'Current Phase'), safe(payload.currentPhase?.label || payload.currentPhase?.task), formatDateForReport(payload.currentPhase?.startDate || '', payload), BRAND.navy),
      metricCard(tr(payload, 'Milestone Berikutnya', 'Next Milestone'), safe(payload.nextMilestone?.label), formatDateForReport(payload.nextMilestone?.date || '', payload), BRAND.navy)
    ]));

    content.push(premiumCard([
      { text: tr(payload, 'NARASI EKSEKUTIF', 'EXECUTIVE NARRATIVE'), style: 'metricLabel' },
      { text: executiveNarrative(payload), style: 'narrativeText', margin: [0, 4, 0, 0] }
    ], { fill: '#ffffff', outerMargin: [0, 2, 0, 10] }));

    content.push({ columns: [
      { width: '33%', stack: [
        { text: tr(payload, 'Sorotan Utama', 'Key Highlights'), style: 'subTitle' },
        bulletList(keyHighlights(payload).slice(0, 4), 'Tidak ada highlight.')
      ], margin: [0,0,8,0] },
      { width: '33%', stack: [
        { text: tr(payload, 'Perhatian Eksekutif', 'Executive Attention'), style: 'subTitle' },
        bulletList(attentionItems(payload).slice(0, 4), 'Tidak ada attention item.')
      ], margin: [4,0,8,0] },
      { width: '34%', stack: [
        { text: tr(payload, 'Keputusan / Tindak Lanjut', 'Decision / Next Action'), style: 'subTitle' },
        bulletList(recommendedActions(payload).slice(0, 4), 'Tidak ada rekomendasi.')
      ], margin: [4,0,0,0] }
    ], columnGap: 6 });

    content.push({ text: tr(payload, 'Update Terbaru', 'Latest Project Update'), style: 'subTitle', margin: [0, 12, 0, 4] });
    if(latestUpdate){
      content.push(makeTable(
        [tr(payload, 'Tanggal', 'Date'), 'Type', 'Update', tr(payload, 'Tindak Lanjut', 'Next Step')],
        [latestUpdate],
        [62, 68, '*', '*'],
        { small: true }
      ));
    } else {
      content.push({ text: tr(payload, 'Belum ada update project terbaru yang tersedia.', 'No project updates are available yet.'), style: 'smallText', margin: [0, 2, 0, 8] });
    }

    const execScheduleRows = scheduleRows(payload, 4, { futureOnly: true });
    content.push({ text: tr(payload, 'Agenda Project Mendatang', 'Upcoming Project Agenda'), style: 'subTitle', margin: [0, 12, 0, 4] });
    if(execScheduleRows.length){
      content.push(makeTable(
        [tr(payload, 'Tanggal', 'Date'), tr(payload, 'Waktu', 'Time'), 'Agenda', 'Type', 'Mode', tr(payload, 'Lokasi / Link', 'Location / Link')],
        execScheduleRows,
        [58, 48, '*', 62, 48, '*'],
        { small: true }
      ));
    } else {
      content.push({ text: tr(payload, 'Belum ada agenda project terdekat.', 'No upcoming project agenda is available yet.'), style: 'smallText', margin: [0, 2, 0, 8] });
    }

    content.push(premiumCard([
      { text: tr(payload, 'PANDUAN PENGGUNAAN REPORT', 'REPORT USAGE GUIDE'), style: 'metricLabel' },
      { text: tr(payload, 'Gunakan Paket Laporan Lengkap untuk laporan berkala, handover, closing meeting, atau review operasional yang membutuhkan rincian progress, status dokumen, risiko/issue, dan kesiapan tindak lanjut.', 'Use the Full Report Pack for periodic reporting, handover, closing meetings, or operational reviews that require project progress, document status, risk/issue, and follow-up readiness details.'), style: 'smallText', margin: [0, 4, 0, 0] }
    ], { fill: BRAND.soft, outerMargin: [0, 10, 0, 0] }));

    return {
      pageSize: 'A4',
      pageMargins: [40, 48, 40, 48],
      info: {
        title: `Professional Project Executive Summary - ${safe(project.name)}`,
        author: 'Professional Project Dashboard',
        subject: 'Executive Summary PDF'
      },
      footer: function(currentPage, pageCount){
        return {
          columns: [
            { text: brandFooterText(payload, 'Executive Summary PDF'), color: BRAND.slate, fontSize: 8, margin: [40, 0, 0, 0] },
            { text: `${currentPage} / ${pageCount}`, alignment: 'right', color: BRAND.slate, fontSize: 8, margin: [0, 0, 40, 0] }
          ]
        };
      },
      content,
      defaultStyle: {
        font: 'Roboto',
        fontSize: 9,
        color: BRAND.navy,
        lineHeight: 1.24
      },
      styles: {
        coverLogo: { fontSize: 24, bold: true, color: BRAND.blue },
        coverTitle: { fontSize: 28, bold: true, color: BRAND.navy, characterSpacing: 0.4 },
        coverProject: { fontSize: 15, bold: true, color: BRAND.navy },
        coverClient: { fontSize: 11, color: BRAND.slate },
        sectionTitle: { fontSize: 15, bold: true, color: BRAND.navy },
        sectionSubtitle: { fontSize: 8.5, color: BRAND.slate },
        subTitle: { fontSize: 10.5, bold: true, color: BRAND.blue },
        metricLabel: { fontSize: 7.5, color: BRAND.slate, bold: true, characterSpacing: 0.9 },
        metricValue: { fontSize: 10.5, color: BRAND.navy, bold: true },
        metricValueLarge: { fontSize: 17, color: BRAND.navy, bold: true, margin: [0,2,0,2] },
        narrativeText: { fontSize: 10, color: BRAND.navy, lineHeight: 1.35 },
        smallText: { fontSize: 8, color: BRAND.slate },
        legendText: { fontSize: 7, color: BRAND.slate },
        tableHeader: { bold: true, color: BRAND.navy, fontSize: 8 },
        tableCell: { color: BRAND.navy, fontSize: 8 },
        tableCellSmall: { color: BRAND.navy, fontSize: 7.4 }
      }
    };
  }

  function loadScript(src){
    return new Promise((resolve, reject) => {
      const existing = [...document.scripts].find(script => script.src === src);
      if(existing){
        existing.addEventListener('load', resolve, {once:true});
        existing.addEventListener('error', reject, {once:true});
        if(existing.dataset.loaded === 'true' || (window.pdfMake && src.includes('pdfmake'))) resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => { script.dataset.loaded = 'true'; resolve(); };
      script.onerror = () => reject(new Error(`Gagal memuat library PDF: ${src}`));
      document.head.appendChild(script);
    });
  }

  async function ensurePdfMake(){
    if(window.pdfMake && window.pdfMake.createPdf) return;
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.10/pdfmake.min.js');
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.10/vfs_fonts.min.js');
    if(!window.pdfMake || !window.pdfMake.createPdf){
      throw new Error('Fitur PDF belum siap. Muat ulang halaman lalu coba kembali.');
    }
  }

  function downloadBlob(blob, filename){
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  }


  function moduleDivider(numberLabel, title, subtitle){
    return premiumCard([
      { text: numberLabel, style: 'metricLabel', color: BRAND.blue },
      { text: title, style: 'packModuleTitle', margin: [0, 3, 0, 2] },
      subtitle ? { text: subtitle, style: 'smallText' } : { text: ' ', fontSize: 1 }
    ], { fill: BRAND.soft, border: BRAND.line, outerMargin: [0, 0, 0, 10] });
  }

  function latestClientUpdates(payload, limit = 8){
    return (payload.meetings || [])
      .slice(0, limit)
      .map(item => [
        formatDateForReport(item.date, payload),
        safe(item.type, 'Update'),
        businessUpdateSummary(item, payload),
        businessNextStep(item, payload)
      ]);
  }

  function scheduleRows(payload, limit = 8, options = {}){
    const reportDate = parseDate(payload.reportDate) || new Date();
    return (payload.schedules || [])
      .filter(item => {
        if(!options.futureOnly) return true;
        const d = parseDate(item.date);
        return d ? d >= reportDate : true;
      })
      .slice(0, limit)
      .map(item => [formatDateForReport(item.date, payload), item.time || '-', cleanAgendaTitle(item.title, payload), item.type || '-', item.mode || '-', item.location || '-']);
  }

  function documentRows(payload, limit = 40){
    return (payload.documents || []).slice(0, limit).map((doc, index) => [
      doc.no && doc.no !== '-' ? doc.no : index + 1,
      doc.name,
      doc.status,
      doc.reviewStatus || '-',
      formatDateForReport(doc.date || '-', payload)
    ]);
  }

  function handoverReadiness(payload){
    const risks = payload.activeRisks?.length || 0;
    const docs = payload.documentMetrics || {};
    const metrics = payload.metrics || {};
    const updates = payload.meetings?.length || 0;
    const items = [];
    if(reportLang(payload) === 'en'){
      items.push(`Project health is recorded as ${safe(payload.health?.label)} with ${pct(metrics.projectProgress)} progress.`);
      items.push(`${safe(metrics.completed, 0)} of ${safe(metrics.total, 0)} tasks have been completed.`);
      items.push(`${safe(docs.completed, 0)} of ${safe(docs.total, 0)} Document List items are completed.`);
      items.push(`${updates} project update entries are available for stakeholder communication.`);
      items.push(risks ? `${risks} open follow-up ${risks === 1 ? 'item requires' : 'items require'} action before full handover.` : 'No major active risk is recorded at report generation.');
      return items;
    }
    items.push(`Project health tercatat ${safe(payload.health?.label)} dengan progress ${pct(metrics.projectProgress)}.`);
    items.push(`${safe(metrics.completed, 0)} dari ${safe(metrics.total, 0)} task sudah selesai.`);
    items.push(`${safe(docs.completed, 0)} dari ${safe(docs.total, 0)} Document List berstatus completed.`);
    items.push(`${updates} update project tersedia untuk komunikasi stakeholder.`);
    items.push(risks ? `${risks} active risk masih perlu tindak lanjut sebelum handover penuh.` : 'Tidak ada active risk utama saat report dibuat.');
    return items;
  }

  function buildCommercialPackDocDefinition(payload, logos){
    const project = payload.project || {};
    const branding = normalizeBranding(payload);
    const metrics = payload.metrics || {};
    const health = payload.health || {};
    const doc = payload.documentMetrics || {};
    const reportDate = payload.reportDate || new Date().toLocaleDateString(reportLocale(payload), { day:'2-digit', month:'long', year:'numeric' });
    const taskSummary = taskStatusSummary(payload.tasks || []);
    const hColor = healthColor(health);
    const content = [];

    content.push({
      columns: [
        brandedLogoBlock(branding, logos, 104),
        { stack: [
          { text: branding.confidentialityLabel, alignment: 'right', color: branding.brandAccentColor, bold: true, fontSize: 9 },
          { text: branding.reportLanguage === 'id' ? 'Paket Laporan Lengkap' : 'Commercial Reporting Pack', alignment: 'right', color: BRAND.slate, fontSize: 9, margin: [0, 6, 0, 0] }
        ], margin: [0, 6, 0, 0] }
      ]
    });
    content.push({ text: branding.reportLanguage === 'id' ? 'PAKET LAPORAN LENGKAP' : 'COMMERCIAL REPORTING PACK', style: 'packCoverTitle', margin: [0, 48, 0, 4] });
    content.push({ text: safe(project.name), style: 'coverProject' });
    content.push({ text: `${safe(project.code)} · ${tr(payload, 'Disiapkan untuk', 'Prepared for')} ${safe(branding.preparedFor)}`, style: 'coverClient', margin: [0, 4, 0, 18] });
    content.push({ canvas: [{ type: 'rect', x: 0, y: 0, w: 515, h: 3, color: branding.brandAccentColor }, { type: 'rect', x: 170, y: 0, w: 180, h: 3, color: BRAND.blue2 }, { type: 'rect', x: 350, y: 0, w: 165, h: 3, color: hColor }] });
    content.push(keyValueGrid([
      [tr(payload, 'Tanggal Report', 'Report Date'), reportDate],
      [tr(payload, 'Bahasa Report', 'Report Language'), branding.reportLanguage === 'en' ? 'English' : 'Bahasa Indonesia'],
      [tr(payload, 'Disiapkan untuk', 'Prepared for'), branding.preparedFor],
      [tr(payload, 'Disiapkan oleh', 'Prepared by'), branding.preparedBy],
      [tr(payload, 'Kesehatan Project', 'Project Health'), `${safe(health.label)} · ${safe(health.score, 0)}%`],
      [tr(payload, 'Progress Keseluruhan', 'Overall Progress'), pct(metrics.projectProgress)],
      [tr(payload, 'Fase Saat Ini', 'Current Phase'), safe(payload.currentPhase?.label || payload.currentPhase?.task)],
      [tr(payload, 'Milestone Berikutnya', 'Next Milestone'), safe(payload.nextMilestone?.label)],
      ['Project Lead', safe(project.picCywa || payload.picCywa)],
      [tr(payload, 'PIC Client', 'Client PIC'), safe(project.picClient || payload.picClient)]
    ]));
    content.push({ text: tr(payload, 'Isi paket: Ringkasan Eksekutif, Progress Project, Status Dokumen, Ringkasan Risiko & Issue, dan Kesiapan Handover Client.', 'Pack contents: Executive Summary, Project Progress, Document Status, Risk & Issue Summary, and Client Handover Readiness.'), style: 'smallText', margin: [0, 18, 0, 0] });
    content.push({ text: '', pageBreak: 'after' });

    content.push(moduleDivider('MODULE 01', tr(payload, 'Ringkasan Eksekutif', 'Executive Summary'), tr(payload, 'Ringkasan kondisi, progress, fokus saat ini, dan tindak lanjut berikutnya untuk manajemen.', 'Board-ready summary of health, progress, current focus, and next actions.')));
    content.push({ columns: [
      { width: '50%', stack: [healthGauge(health, 205, payload)] },
      { width: '50%', stack: [documentCompletionBlock(doc, 205, payload)] }
    ], columnGap: 12, margin: [0, 0, 0, 8] });
    content.push(statGrid([
      metricCard(tr(payload, 'Progress Keseluruhan', 'Overall Progress'), pct(metrics.projectProgress), tr(payload, `${safe(metrics.completed, 0)} / ${safe(metrics.total, 0)} task selesai`, `${safe(metrics.completed, 0)} / ${safe(metrics.total, 0)} task completed`), BRAND.blue),
      metricCard(tr(payload, 'Risiko Aktif', 'Active Risk'), payload.activeRisks?.length || 0, tr(payload, 'Risiko terbuka / item perhatian', 'Open risk / attention item'), payload.activeRisks?.length ? BRAND.red : BRAND.green),
      metricCard(tr(payload, 'Selesai Terlambat', 'Closed Late'), payload.closedLate?.length || 0, tr(payload, 'Selesai dengan deviasi jadwal', 'Completed with schedule variance'), payload.closedLate?.length ? BRAND.amber : BRAND.green),
      metricCard('Document Output', payload.outputs?.length || 0, 'Situational deliverables', BRAND.blue2),
      metricCard(tr(payload, 'Fase Saat Ini', 'Current Phase'), safe(payload.currentPhase?.label || payload.currentPhase?.task), formatDateForReport(payload.currentPhase?.startDate || '', payload), BRAND.navy),
      metricCard(tr(payload, 'Milestone Berikutnya', 'Next Milestone'), safe(payload.nextMilestone?.label), formatDateForReport(payload.nextMilestone?.date || '', payload), BRAND.navy)
    ]));
    content.push(premiumCard([{ text: tr(payload, 'NARASI EKSEKUTIF', 'EXECUTIVE NARRATIVE'), style: 'metricLabel' }, { text: executiveNarrative(payload), style: 'narrativeText', margin: [0, 4, 0, 0] }], { fill: '#ffffff', outerMargin: [0, 2, 0, 10] }));
    content.push({ columns: [
      { width: '33%', stack: [{ text: tr(payload, 'Sorotan Utama', 'Key Highlights'), style: 'subTitle' }, bulletList(keyHighlights(payload), tr(payload, 'Tidak ada highlight.', 'No highlights.'))], margin: [0,0,8,0] },
      { width: '33%', stack: [{ text: tr(payload, 'Perhatian Eksekutif', 'Executive Attention'), style: 'subTitle' }, bulletList(attentionItems(payload), tr(payload, 'Tidak ada attention item.', 'No attention item.'))], margin: [4,0,8,0] },
      { width: '34%', stack: [{ text: 'Recommended Next Action', style: 'subTitle' }, bulletList(recommendedActions(payload), tr(payload, 'Tidak ada rekomendasi.', 'No recommendation.'))], margin: [4,0,0,0] }
    ], columnGap: 6 });
    content.push({ text: '', pageBreak: 'after' });

    content.push(moduleDivider('MODULE 02', tr(payload, 'Laporan Progress Project', 'Project Progress Report'), tr(payload, 'Distribusi progress, snapshot timeline, dan status task operasional.', 'Progress distribution, timeline snapshot, and operational task status.')));
    content.push({ text: tr(payload, 'Distribusi Status Task', 'Task Status Distribution'), style: 'subTitle', margin: [0, 0, 0, 4] });
    content.push(stackedStatusBar(taskSummary, 515));
    content.push({ text: tr(payload, 'Ringkasan Risiko Timeline', 'Timeline Risk Strip'), style: 'subTitle', margin: [0, 10, 0, 4] });
    content.push(timelineRiskStrip(payload, 515));
    content.push({ text: tr(payload, 'Snapshot Timeline & Milestone', 'Timeline & Milestone Snapshot'), style: 'subTitle', margin: [0, 12, 0, 4] });
    content.push(timelineSnapshot(payload.timeline || [], payload));
    content.push({ text: tr(payload, 'Ringkasan Task Tracker', 'Task Tracker Summary'), style: 'subTitle', margin: [0, 10, 0, 4] });
    content.push(makeTable(
      ['No', 'Task', 'Status', tr(payload, 'Mulai', 'Start'), tr(payload, 'Selesai', 'End'), 'Progress'],
      (payload.tasks || []).slice(0, 28).map((t, i) => [i + 1, t.task, t.status, formatDateForReport(t.startDate, payload), formatDateForReport(t.endDate, payload), t.progress]),
      [24, '*', 68, 58, 58, 48],
      { small: true }
    ));
    content.push({ text: '', pageBreak: 'after' });

    content.push(moduleDivider('MODULE 03', tr(payload, 'Laporan Status Dokumen', 'Document Status Report'), tr(payload, 'Progress Document List dan ringkasan Document Output.', 'Document List progress and Document Output overview.')));
    content.push(statGrid([
      metricCard('Document List', doc.total || 0, 'Total controlled documents', BRAND.blue),
      metricCard('Completed', doc.completed || 0, 'Completed documents', BRAND.green),
      metricCard('In Progress', doc.inProgress || 0, 'In progress documents', BRAND.blue2),
      metricCard('In Review', doc.inReview || 0, 'Under review', BRAND.amber),
      metricCard('Hold / Pending', (doc.hold || 0) + (doc.notStarted || 0), 'Hold or not started', BRAND.slate),
      metricCard('Document Output', payload.outputs?.length || 0, 'Separate from Document List KPI', BRAND.navy)
    ]));
    const docRows = documentRows(payload, Math.max(45, Number(doc.total || 0)));
    if(docRows.length && Number(doc.total || 0) > docRows.length){
      content.push({ text: tr(payload, `Menampilkan ${docRows.length} dari ${doc.total} dokumen terkendali.`, `Showing ${docRows.length} of ${doc.total} controlled documents.`), style: 'smallText', margin: [0, 0, 0, 4] });
    }
    content.push(docRows.length ? makeTable(['No', 'Document', 'Status', 'Review', tr(payload, 'Tanggal', 'Date')], docRows, [28, '*', 70, 62, 62], { small: true }) : { text: tr(payload, 'Document List belum tersedia.', 'Document List is not available yet.'), style: 'smallText', margin: [0, 4, 0, 8] });
    if((payload.outputs || []).length){
      content.push({ text: 'Document Output', style: 'subTitle', margin: [0, 8, 0, 4] });
      content.push(makeTable(['No', 'Output', tr(payload, 'Tanggal', 'Date'), 'Status'], payload.outputs.slice(0, 14).map((o, i) => [i + 1, o.name, o.date, o.status]), [28, '*', 78, 70], { small: true }));
    }
    content.push({ text: '', pageBreak: 'after' });

    content.push(moduleDivider('MODULE 04', tr(payload, 'Ringkasan Risiko & Issue', 'Risk & Issue Summary'), tr(payload, 'Risiko aktif, schedule variance, dan rekomendasi aksi kontrol.', 'Active risk, schedule variance, and recommended control actions.')));
    if(payload.activeRisks?.length){
      content.push(makeTable(
        ['No', 'Task', 'Status', tr(payload, 'Trigger / Alasan', 'Trigger / Reason'), tr(payload, 'Catatan PM / Tindak Lanjut', 'PM Notes / Next Action')],
        payload.activeRisks.slice(0, 15).map((item, i) => [i + 1, item.task, item.status, riskReasonText(item.reason, payload), pmNoteText(item.notes, payload)]),
        [24, '*', 58, '*', '*'],
        { small: true }
      ));
    } else {
      content.push(premiumCard([{ text: tr(payload, 'Tidak ada active risk saat report dibuat.', 'No active risk is recorded at report generation.'), color: BRAND.green, bold: true }], { fill: '#f3fbf7', outerMargin: [0, 0, 0, 8] }));
    }
    if(payload.closedLate?.length){
      content.push({ text: tr(payload, 'Selesai Terlambat / Schedule Variance', 'Closed Late / Schedule Variance'), style: 'subTitle', margin: [0, 10, 0, 4] });
      content.push(makeTable(['No', 'Task', tr(payload, 'Alasan', 'Reason')], payload.closedLate.slice(0, 12).map((item, i) => [i + 1, item.task, riskReasonText(item.reason, payload)]), [24, '*', '*'], { small: true }));
    }
    content.push({ text: tr(payload, 'Rekomendasi Aksi Kontrol', 'Recommended Control Actions'), style: 'subTitle', margin: [0, 10, 0, 4] });
    content.push(bulletList(recommendedActions(payload), tr(payload, 'Tidak ada rekomendasi tambahan.', 'No additional recommendation.')));
    content.push({ text: '', pageBreak: 'after' });

    content.push(moduleDivider('MODULE 05', tr(payload, 'Kesiapan Handover', 'Handover Readiness'), tr(payload, 'Ringkasan penutupan project, update, agenda, dan kesiapan tindak lanjut.', 'Project closure summary, updates, agenda, and follow-up readiness.')));
    content.push({ text: tr(payload, 'Ringkasan Kesiapan Handover', 'Handover Readiness Summary'), style: 'subTitle', margin: [0, 0, 0, 4] });
    content.push(bulletList(handoverReadiness(payload), tr(payload, 'Belum ada ringkasan handover.', 'No handover summary is available yet.')));
    content.push({ text: tr(payload, 'Update Project Terbaru', 'Latest Project Updates'), style: 'subTitle', margin: [0, 10, 0, 4] });
    const updateRows = latestClientUpdates(payload, 6);
    content.push(updateRows.length ? makeTable([tr(payload, 'Tanggal', 'Date'), 'Type', 'Update', tr(payload, 'Tindak Lanjut', 'Next Step')], updateRows, [62, 68, '*', '*'], { small: true }) : { text: tr(payload, 'Belum ada update project terbaru yang tersedia.', 'No project updates are available yet.'), style: 'smallText' });
    content.push({ text: tr(payload, 'Ringkasan Agenda Project', 'Project Agenda Summary'), style: 'subTitle', margin: [0, 10, 0, 4] });
    const agendaRows = scheduleRows(payload, 12);
    content.push(agendaRows.length ? makeTable([tr(payload, 'Tanggal', 'Date'), tr(payload, 'Waktu', 'Time'), 'Agenda', 'Type', 'Mode', tr(payload, 'Lokasi / Link', 'Location / Link')], agendaRows, [54, 44, '*', 58, 44, '*'], { small: true }) : { text: tr(payload, 'Belum ada agenda project mendatang yang tersedia.', 'No upcoming project agenda is available yet.'), style: 'smallText' });
    content.push({ text: tr(payload, 'Catatan Handover', 'Handover Notes'), style: 'subTitle', margin: [0, 10, 0, 4] });
    content.push(premiumCard([
      { text: tr(payload, 'Paket ini disiapkan untuk mendukung pemantauan project dan komunikasi kepada stakeholder. Final handover perlu dikonfirmasi berdasarkan acceptance criteria, penerimaan deliverable, dan kepemilikan tindak lanjut yang disepakati.', 'This pack is prepared to support project monitoring and stakeholder communication. Final handover should be confirmed with project-specific acceptance criteria, deliverable receipt, and agreed follow-up ownership.'), style: 'narrativeText' }
    ], { fill: BRAND.soft }));

    return {
      pageSize: 'A4',
      pageMargins: [40, 48, 40, 48],
      info: {
        title: `Professional Project Reporting Pack - ${safe(project.name)}`,
        author: 'Professional Project Dashboard',
        subject: 'Commercial Reporting Pack'
      },
      footer: function(currentPage, pageCount){
        return {
          columns: [
            { text: brandFooterText(payload, 'Commercial Reporting Pack'), color: BRAND.slate, fontSize: 8, margin: [40, 0, 0, 0] },
            { text: `${currentPage} / ${pageCount}`, alignment: 'right', color: BRAND.slate, fontSize: 8, margin: [0, 0, 40, 0] }
          ]
        };
      },
      content,
      defaultStyle: { font: 'Roboto', fontSize: 9, color: BRAND.navy, lineHeight: 1.24 },
      styles: {
        coverLogo: { fontSize: 24, bold: true, color: BRAND.blue },
        packCoverTitle: { fontSize: 27, bold: true, color: BRAND.navy, characterSpacing: 0.35 },
        coverProject: { fontSize: 15, bold: true, color: BRAND.navy },
        coverClient: { fontSize: 11, color: BRAND.slate },
        packModuleTitle: { fontSize: 18, bold: true, color: BRAND.navy },
        sectionTitle: { fontSize: 15, bold: true, color: BRAND.navy },
        sectionSubtitle: { fontSize: 8.5, color: BRAND.slate },
        subTitle: { fontSize: 10.5, bold: true, color: BRAND.blue },
        metricLabel: { fontSize: 7.5, color: BRAND.slate, bold: true, characterSpacing: 0.9 },
        metricValue: { fontSize: 10.5, color: BRAND.navy, bold: true },
        metricValueLarge: { fontSize: 17, color: BRAND.navy, bold: true, margin: [0,2,0,2] },
        narrativeText: { fontSize: 10, color: BRAND.navy, lineHeight: 1.35 },
        smallText: { fontSize: 8, color: BRAND.slate },
        legendText: { fontSize: 7, color: BRAND.slate },
        tableHeader: { bold: true, color: BRAND.navy, fontSize: 8 },
        tableCell: { color: BRAND.navy, fontSize: 8 },
        tableCellSmall: { color: BRAND.navy, fontSize: 7.25 }
      }
    };
  }

  async function generate(payload){
    await ensurePdfMake();
    const logos = await resolveReportLogos(payload);
    const docDefinition = buildDocDefinition(payload, logos);
    const project = payload.project || {};
    const date = new Date().toISOString().slice(0, 10);
    const brand = normalizeBranding(payload);
    const filename = sanitizeFileName(`${brand.preparedFor || project.code || 'Client'}_Executive_Summary_${brand.reportLanguage.toUpperCase()}_${project.name || ''}_${date}`) + '.pdf';

    return new Promise((resolve, reject) => {
      try{
        const pdf = window.pdfMake.createPdf(docDefinition);
        pdf.getBlob((blob) => {
          try{
            downloadBlob(blob, filename);
            resolve(filename);
          }catch(err){
            reject(err);
          }
        });
      }catch(err){
        reject(err);
      }
    });
  }



  async function generateCommercialPack(payload){
    await ensurePdfMake();
    const logos = await resolveReportLogos(payload);
    const docDefinition = buildCommercialPackDocDefinition(payload, logos);
    const project = payload.project || {};
    const date = new Date().toISOString().slice(0, 10);
    const brand = normalizeBranding(payload);
    const filename = sanitizeFileName(`${brand.preparedFor || project.code || 'Client'}_Full_Report_Pack_${brand.reportLanguage.toUpperCase()}_${project.name || ''}_${date}`) + '.pdf';

    return new Promise((resolve, reject) => {
      try{
        const pdf = window.pdfMake.createPdf(docDefinition);
        pdf.getBlob((blob) => {
          try{
            downloadBlob(blob, filename);
            resolve(filename);
          }catch(err){
            reject(err);
          }
        });
      }catch(err){
        reject(err);
      }
    });
  }


  async function generateTimeline(payload){
    await ensurePdfMake();
    const logos = await resolveReportLogos(payload);
    const docDefinition = buildTimelineDocDefinition(payload, logos);
    const project = payload.project || {};
    const date = new Date().toISOString().slice(0, 10);
    const brand = normalizeBranding(payload);
    const filename = sanitizeFileName(`${brand.preparedFor || project.code || 'Client'}_Timeline_Project_${brand.reportLanguage.toUpperCase()}_${project.name || ''}_${date}`) + '.pdf';

    return new Promise((resolve, reject) => {
      try{
        const pdf = window.pdfMake.createPdf(docDefinition);
        pdf.getBlob((blob) => {
          try{
            downloadBlob(blob, filename);
            resolve(filename);
          }catch(err){
            reject(err);
          }
        });
      }catch(err){
        reject(err);
      }
    });
  }


  window.PPDReportExporter = { generate, generateCommercialPack, generateTimeline };
})();
