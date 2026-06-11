import React, { useEffect, useRef, useState, useCallback } from 'react'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import css from 'highlight.js/lib/languages/css'
import xml from 'highlight.js/lib/languages/xml'
import json from 'highlight.js/lib/languages/json'
import bash from 'highlight.js/lib/languages/bash'
import http from 'highlight.js/lib/languages/http'
import 'highlight.js/styles/atom-one-dark.css'
import './code.css'
import './mobile.css'

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('css', css)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('json', json)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('http', http)
const HL_SUBSET = ['typescript', 'javascript', 'css', 'xml', 'json', 'bash', 'http']
const LANG_LABEL = { typescript: 'ts', javascript: 'js', xml: 'html', css: 'css', json: 'json', bash: 'sh', http: 'http' }

function enhanceCodeBlocks(root) {
  root.querySelectorAll('pre.code').forEach(pre => {
    if (pre.dataset.enh) return
    pre.dataset.enh = '1'
    const code = pre.querySelector('code')
    if (!code) return
    const raw = code.textContent
    let lang = ''
    try { const res = hljs.highlightAuto(raw, HL_SUBSET); code.innerHTML = res.value; lang = res.language || '' } catch { }
    code.classList.add('hljs')
    // wrap in figure with header
    const fig = document.createElement('figure')
    fig.className = 'codeblock'
    const head = document.createElement('figcaption')
    head.className = 'code-head'
    head.innerHTML = `<span class="code-dots"><i></i><i></i><i></i></span><span class="code-lang">${LANG_LABEL[lang] || 'code'}</span>`
    const btn = document.createElement('button')
    btn.className = 'copy-btn'
    btn.type = 'button'
    btn.innerHTML = COPY_SVG + '<span>Copy</span>'
    btn.onclick = () => {
      navigator.clipboard.writeText(raw).then(() => {
        btn.classList.add('ok'); btn.innerHTML = CHECK_SVG + '<span>Copied</span>'
        setTimeout(() => { btn.classList.remove('ok'); btn.innerHTML = COPY_SVG + '<span>Copy</span>' }, 1600)
      })
    }
    head.appendChild(btn)
    pre.parentNode.insertBefore(fig, pre)
    fig.appendChild(head)
    fig.appendChild(pre)
  })
}
const COPY_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>'
const CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>'

const CATS = ['Plan', 'Core', 'Design', 'Advanced', 'Catalog']
const CATLABEL = {
  Plan: 'Plan & People', Core: 'Core Engineering', Design: 'Design & Problem-Solving',
  Advanced: 'Advanced / Production', Catalog: 'Tooling Catalogs',
}
const WEIGHT = [
  ['React + JavaScript / TS internals', 25, '#7c5cff'],
  ['Frontend system design', 25, '#22d3ee'],
  ['DSA / coding (medium–hard, JS)', 20, '#34d399'],
  ['Performance · a11y · testing', 10, '#fbbf24'],
  ['Behavioral / leadership', 15, '#fb7185'],
  ['Backend / full-stack awareness', 8, '#a78bfa'],
]
const PKEY = 'fePrep.progress.v1', RKEY = 'fePrep.recall.v1', MKEY = 'fePrep.mode.v1'
// mode-aware: 'all' = every topic; 'interview' = only iv-flagged
const docSecs = (d, mode) => d.toc.filter(t => t.l === 2 && (mode === 'all' || t.iv)).map(t => t.id)
const docVisible = (d, mode) => mode === 'all' || d.ivVisible
const visDocs = (DOCS, mode) => DOCS.filter(d => docVisible(d, mode))
const tocVis = (t, mode) => mode === 'all' || t.iv
const docPartsCount = (d, mode) => d.toc.filter(t => t.l === 1 && (mode === 'all' || t.iv) && /^(Part|Case|Appendix)/.test(t.t)).length || d.nParts

export default function App() {
  const [db, setDb] = useState(null)
  const [hash, setHash] = useState(window.location.hash || '#dashboard')
  const [query, setQuery] = useState('')
  const [navOpen, setNavOpen] = useState(false)
  const [mode, setMode] = useState(localStorage.getItem(MKEY) || 'all')
  const [ver, setVer] = useState(0) // bump to refresh progress-derived UI
  const progress = useRef(new Set(JSON.parse(localStorage.getItem(PKEY) || '[]')))
  const recall = useRef(JSON.parse(localStorage.getItem(RKEY) || '{}'))
  const contentRef = useRef(null)
  const searchTimer = useRef(null)

  useEffect(() => {
    fetch('data.json').then(r => r.json()).then(setDb)
  }, [])
  useEffect(() => {
    const on = () => { setHash(window.location.hash || '#dashboard'); setNavOpen(false) }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  useEffect(() => { document.body.classList.toggle('nav-open', navOpen) }, [navOpen])

  const saveP = () => localStorage.setItem(PKEY, JSON.stringify([...progress.current]))
  const saveR = () => localStorage.setItem(RKEY, JSON.stringify(recall.current))
  const bump = () => setVer(v => v + 1)

  if (!db) return <Loading />

  const DOCS = db.docs
  const byId = Object.fromEntries(DOCS.map(d => [d.id, d]))
  const docPct = (d) => { const s = docSecs(d, mode); if (!s.length) return 0; return Math.round(s.filter(id => progress.current.has(id)).length / s.length * 100) }
  const overall = () => { let done = 0, tot = 0; visDocs(DOCS, mode).forEach(d => { const s = docSecs(d, mode); tot += s.length; done += s.filter(id => progress.current.has(id)).length }); return tot ? Math.round(done / tot * 100) : 0 }
  const changeMode = (m) => { setMode(m); localStorage.setItem(MKEY, m) }

  const go = (h) => { if (window.location.hash === h) setHash(h + ''); window.location.hash = h }

  const onSearch = (v) => {
    setQuery(v)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      if (v.trim().length >= 2) { if (window.location.hash !== '#search') window.location.hash = '#search'; else setHash('#search?' + v) }
      else if (window.location.hash === '#search') window.history.back()
    }, 180)
  }

  // route parse
  let view
  if (hash.startsWith('#doc/')) {
    const [id, anchor] = hash.slice(5).split('/')
    view = <Reader key={id + mode} doc={byId[id]} anchor={anchor} mode={mode} progress={progress} saveP={saveP} bump={bump} contentRef={contentRef} go={go} />
  } else if (hash === '#lib') view = <Library DOCS={DOCS} mode={mode} docPct={docPct} go={go} />
  else if (hash === '#roadmap') view = <Reader key={'roadmap-01' + mode} doc={byId['01']} roadmap mode={mode} progress={progress} saveP={saveP} bump={bump} contentRef={contentRef} go={go} />
  else if (hash === '#recall') view = <Recall DOCS={DOCS} mode={mode} recall={recall} saveR={saveR} go={go} />
  else if (hash === '#search') view = <Search DOCS={DOCS} mode={mode} query={query} go={go} />
  else view = <Dashboard db={db} DOCS={DOCS} mode={mode} docPct={docPct} overall={overall()} progress={progress} go={go} />

  const activeTab = hash.startsWith('#doc/') ? '' : hash === '#lib' ? 'lib' : hash === '#roadmap' ? 'roadmap' : hash === '#recall' ? 'recall' : hash === '#search' ? '' : 'dashboard'

  return (
    <>
      <Topbar query={query} onSearch={onSearch} overall={overall()} go={go} activeTab={activeTab} onMenu={() => setNavOpen(o => !o)} />
      <div className="app">
        <Sidebar DOCS={DOCS} mode={mode} changeMode={changeMode} docPct={docPct} curHash={hash} navOpen={navOpen} go={go} />
        <div className="scrim" onClick={() => setNavOpen(false)} />
        <main className="content" ref={contentRef} onScroll={(e) => { const b = document.getElementById('fabTop'); if (b) b.style.display = e.target.scrollTop > 500 ? 'block' : 'none' }}>
          <div className="wrap">{view}</div>
        </main>
      </div>
      <button className="fab-top" id="fabTop" onClick={() => contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}>↑</button>
      <BottomNav activeTab={activeTab} go={go} />
    </>
  )
}

function BottomNav({ activeTab, go }) {
  const items = [
    ['dashboard', '#dashboard', 'Home', <><path d="M3 11l9-8 9 8" /><path d="M5 10v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V10" /></>],
    ['lib', '#lib', 'Library', <><rect x="3" y="4" width="6" height="16" rx="1" /><rect x="11" y="4" width="6" height="16" rx="1" /><path d="M19 5l2 14" /></>],
    ['roadmap', '#roadmap', 'Roadmap', <><circle cx="6" cy="6" r="2" /><circle cx="6" cy="18" r="2" /><path d="M6 8v8" /><path d="M11 6h6a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2H9a2 2 0 0 0-2 2" /></>],
    ['recall', '#recall', 'Recall', <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></>],
  ]
  return <nav className="bottomnav">
    {items.map(([k, h, label, icon]) =>
      <button key={k} className={activeTab === k ? 'active' : ''} onClick={() => go(h)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
        {label}
      </button>)}
  </nav>
}

function Loading() {
  return <div style={{ display: 'grid', placeItems: 'center', height: '100vh', color: '#98a2cc', fontFamily: 'Inter,sans-serif' }}>
    <div style={{ textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto 16px', width: 40, height: 40, border: '3px solid #27315e', borderTopColor: '#7c5cff', borderRadius: '50%', animation: 'spin .9s linear infinite' }} />Loading 674 topics…</div>
  </div>
}

function Ring({ pct, onClick }) {
  const len = 88
  return <div className="ring" onClick={onClick} title="Overall progress">
    <svg width="34" height="34" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx="17" cy="17" r="14" stroke="#27315e" strokeWidth="4" fill="none" />
      <circle cx="17" cy="17" r="14" stroke="#22d3ee" strokeWidth="4" fill="none" strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len - len * pct / 100} />
    </svg>
    <span className="pct">{pct}%</span>
  </div>
}

function Topbar({ query, onSearch, overall, go, activeTab, onMenu }) {
  const tabs = [['dashboard', 'Dashboard', '#dashboard'], ['lib', 'Library', '#lib'], ['roadmap', 'Roadmap', '#roadmap'], ['recall', 'Recall', '#recall']]
  return <header className="topbar">
    <button className="menu-btn" onClick={onMenu}>☰</button>
    <div className="brand" onClick={() => go('#dashboard')}>
      <div className="logo">⚡</div><span>Senior FE Prep<span className="gr"> · Avinash</span></span>
    </div>
    <nav className="tabs">
      {tabs.map(([k, label, h]) => <div key={k} className={'tab' + (activeTab === k ? ' active' : '')} onClick={() => go(h)}>{label}</div>)}
    </nav>
    <div className="spacer" />
    <div className="searchbox">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
      <input value={query} placeholder="Search all topics…" autoComplete="off" onChange={(e) => onSearch(e.target.value)} />
    </div>
    <Ring pct={overall} onClick={() => go('#dashboard')} />
  </header>
}

function ModeToggle({ mode, changeMode, compact }) {
  return <div className={'modeseg' + (compact ? ' compact' : '')} role="tablist" aria-label="Content mode">
    <button className={mode === 'interview' ? 'on' : ''} onClick={() => changeMode('interview')} title="Curated core set">🎯 Interview</button>
    <button className={mode === 'all' ? 'on' : ''} onClick={() => changeMode('all')} title="Every topic, as-is">📚 All</button>
  </div>
}

function Sidebar({ DOCS, mode, changeMode, docPct, curHash, navOpen, go }) {
  return <aside className="sidebar">
    <div className="side-mode">
      <ModeToggle mode={mode} changeMode={changeMode} />
      <p className="side-mode-hint">{mode === 'interview' ? 'Curated set — what panels actually test.' : 'Full corpus — every topic & tool.'}</p>
    </div>
    {CATS.map(cat => {
      const ds = DOCS.filter(d => d.cat === cat && docVisible(d, mode)); if (!ds.length) return null
      return <div key={cat}>
        <div className="side-group">{CATLABEL[cat]}</div>
        {ds.map(d => {
          const pct = docPct(d)
          const open = curHash.startsWith('#doc/' + d.id) || (d.id === '01' && curHash === '#roadmap')
          const active = open
          return <div key={d.id} className={'doc-item' + (open ? ' open' : '') + (active ? ' active' : '')}>
            <div className="doc-head" onClick={() => go('#doc/' + d.id)}>
              <span className="doc-ic">{d.icon}</span>
              <span className="doc-nm"><span className="num">{d.num}</span>{d.short}</span>
              <span className={'doc-pct' + (pct === 100 ? ' done' : '')}>{pct}%</span>
            </div>
            <div className="toc">
              {d.toc.filter(t => t.l <= 2 && tocVis(t, mode)).map(t =>
                <a key={t.id} className={(t.l === 2 ? 'l2' : '') + (curHash.endsWith('/' + t.id) ? ' cur' : '')}
                  href={'#doc/' + d.id + '/' + t.id} onClick={(e) => e.stopPropagation()}>{t.t}</a>)}
            </div>
          </div>
        })}
      </div>
    })}
  </aside>
}

function DocCard({ d, pct, mode, go }) {
  const secs = docSecs(d, mode).length
  const partial = mode === 'interview' && d.ivVisible && secs < d.nSecs
  return <div className="card" onClick={() => go('#doc/' + d.id)}>
    <div className="cnum"><span>DOC {d.num}</span><span className="cic">{d.icon}</span></div>
    <h3>{d.title}</h3>
    <div className="cmeta">{secs} topics{partial ? ` of ${d.nSecs}` : ''} · {pct}% done{partial ? ' · core slice' : ''}</div>
    <div className="tags">{d.tags.map(t => <span key={t} className="tag">{t}</span>)}</div>
    <div className="mini"><i style={{ width: pct + '%' }} /></div>
  </div>
}

function Dashboard({ db, DOCS, mode, docPct, overall, progress, go }) {
  const vis = visDocs(DOCS, mode)
  const iv = mode === 'interview'
  const totalTopics = iv ? db.totalInterviewTopics : db.totalTopics
  const doneDocs = vis.filter(d => docPct(d) === 100).length
  const doneTopics = vis.reduce((a, d) => a + docSecs(d, mode).filter(id => progress.current.has(id)).length, 0)
  const reset = () => { if (confirm('Reset all topic progress? This cannot be undone.')) { progress.current = new Set(); localStorage.setItem(PKEY, '[]'); go('#dashboard'); window.location.reload() } }
  return <>
    <div className="hero">
      <div className="badge">{iv ? '🎯 Interview mode · curated core' : '📚 All mode · full corpus'} · Senior FE / React</div>
      <h1>{iv ? 'Focused Interview Prep' : 'Your Complete Prep Hub'}</h1>
      <p>{iv
        ? 'The curated set senior panels actually test — JS/TS internals, React 19, system design, DSA, behavioral, plus the highest-signal advanced topics. Switch to “All” for the full corpus.'
        : 'Every topic from 12 deep-dive playbooks — React internals, system design, DSA, performance, behavioral, and the full 2026 production toolchain — in one trackable workspace.'}</p>
      <div className="statrow">
        <Stat n={vis.length} l="Playbooks" /><Stat n={totalTopics} l="Topics" /><Stat n={iv ? '~120' : '12'} l={iv ? 'Hrs focus' : 'Weeks'} /><Stat n={iv ? 'P0–P1' : '674'} l={iv ? 'Priority' : 'All topics'} />
      </div>
    </div>
    <div className="section-title">Your progress</div>
    <div className="progress-card">
      <div className="flexb"><div><b style={{ fontSize: 15 }}>{overall}% complete</b> <span style={{ color: 'var(--muted)', fontSize: 13 }}>· {doneTopics}/{totalTopics} topics · {doneDocs}/{vis.length} playbooks finished</span></div>
        <span className="reset-link" onClick={reset}>reset</span></div>
      <div className={'pbar' + (overall > 60 ? ' good' : '')}><i style={{ width: overall + '%' }} /></div>
    </div>
    <div className="section-title">Where senior panels spend time</div>
    <div className="progress-card">
      {WEIGHT.map(w => <div className="weight-row" key={w[0]}><div className="lbl"><b>{w[0]}</b></div>
        <div className="wbar"><i style={{ width: w[1] * 3.4 + '%', background: w[2] }} /></div><div className="wv">{w[1]}%</div></div>)}
      <p style={{ color: 'var(--faint)', fontSize: 12.5, margin: '12px 0 0' }}>Candidates over-invest DSA and under-invest system design + behavioral — that's where seniors get leveled up or down.</p>
    </div>
    <div className="section-title">Playbooks</div>
    <div className="grid">{vis.map(d => <DocCard key={d.id} d={d} pct={docPct(d)} mode={mode} go={go} />)}</div>
  </>
}
const Stat = ({ n, l }) => <div className="stat"><div className="n">{n}</div><div className="l">{l}</div></div>

function Library({ DOCS, mode, docPct, go }) {
  const vis = visDocs(DOCS, mode)
  return <>
    <div className="section-title" style={{ marginTop: 8 }}>{mode === 'interview' ? 'Interview playbooks' : 'All playbooks'} · {vis.length}</div>
    {CATS.map(cat => {
      const ds = vis.filter(d => d.cat === cat); if (!ds.length) return null
      return <div key={cat}>
        <h2 style={{ fontSize: 16, color: 'var(--muted)', margin: '22px 0 12px', fontWeight: 700 }}>{CATLABEL[cat]}</h2>
        <div className="grid">{ds.map(d => <DocCard key={d.id} d={d} pct={docPct(d)} mode={mode} go={go} />)}</div>
      </div>
    })}
  </>
}

function Reader({ doc, anchor, roadmap, mode, progress, saveP, bump, contentRef, go }) {
  const bodyRef = useRef(null)

  useEffect(() => {
    const body = bodyRef.current; if (!body || !doc) return
    // Interview mode: hide parts not flagged iv
    if (mode === 'interview') {
      const hidden = new Set(doc.toc.filter(t => t.l === 1 && !t.iv).map(t => t.id))
      if (hidden.size) {
        body.querySelectorAll('h2.h1').forEach(hd => {
          if (!hidden.has(hd.id)) return
          let el = hd
          while (el) { el.style.display = 'none'; const nx = el.nextElementSibling; if (!nx || nx.classList?.contains('h1')) break; el = nx }
        })
      }
    }
    enhanceCodeBlocks(body)
    // checkboxes per topic (h3.h2)
    body.querySelectorAll('h3.h2').forEach(hd => {
      if (hd.querySelector('.chk')) return
      const id = hd.id
      const chk = document.createElement('button')
      chk.className = 'chk' + (progress.current.has(id) ? ' on' : '')
      chk.title = 'Mark topic done'
      chk.onclick = (e) => {
        e.stopPropagation()
        if (progress.current.has(id)) progress.current.delete(id); else progress.current.add(id)
        chk.classList.toggle('on'); saveP(); bump(); updateParts()
      }
      hd.insertBefore(chk, hd.firstChild)
    })
    // part complete chips (h2.h1)
    const updaters = []
    body.querySelectorAll('h2.h1').forEach(hd => {
      let span = hd.querySelector('.part-done')
      if (!span) { span = document.createElement('span'); span.className = 'part-done'; hd.appendChild(span) }
      let sib = hd.nextElementSibling, ids = []
      while (sib && !sib.classList?.contains('h1')) { if (sib.classList?.contains('h2')) ids.push(sib.id); sib = sib.nextElementSibling }
      const upd = () => { const dn = ids.filter(i => progress.current.has(i)).length; span.textContent = ids.length ? `${dn}/${ids.length} ✓ mark part` : ''; span.dataset.all = (dn === ids.length && ids.length > 0) ? '1' : '0' }
      span.onclick = () => { const all = span.dataset.all === '1'; ids.forEach(i => all ? progress.current.delete(i) : progress.current.add(i)); saveP(); bump(); body.querySelectorAll('.chk').forEach((c, idx) => { }); refreshChecks(); updaters.forEach(u => u()) }
      updaters.push(upd); upd()
    })
    function updateParts() { updaters.forEach(u => u()) }
    function refreshChecks() { body.querySelectorAll('h3.h2').forEach(hd => { const c = hd.querySelector('.chk'); if (c) c.classList.toggle('on', progress.current.has(hd.id)) }) }

    // scroll spy
    const heads = [...body.querySelectorAll('h2.h1,h3.h2')]
    const obs = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) document.querySelectorAll('.toc a').forEach(a => a.classList.toggle('cur', a.getAttribute('href')?.endsWith('/' + e.target.id))) }),
      { root: contentRef.current, rootMargin: '-10% 0px -80% 0px' })
    heads.forEach(h => obs.observe(h))

    // scroll to anchor / top
    setTimeout(() => {
      if (anchor) { const t = document.getElementById(anchor); if (t) contentRef.current?.scrollTo({ top: t.offsetTop - 12 }) }
      else contentRef.current?.scrollTo({ top: 0 })
    }, 30)
    return () => obs.disconnect()
  }, [doc?.id, anchor, mode])

  if (!doc) return <div className="empty">Not found.</div>
  const refHidden = mode === 'interview' && !doc.ivVisible
  const partialDoc = mode === 'interview' && doc.ivVisible && doc.ivSecs < doc.nSecs
  return <>
    {refHidden && <div className="mode-banner ref">This playbook is a <b>reference catalog</b> — hidden in Interview mode. Showing it anyway. Switch to <b>All</b> for the rest of the corpus.</div>}
    {partialDoc && <div className="mode-banner">Interview mode · showing the <b>core {doc.ivSecs} of {doc.nSecs}</b> topics. Switch to <b>All</b> for everything in this playbook.</div>}
    {roadmap
      ? <div className="doc-hd"><div className="crumb">Doc 01 · study plan</div><h1>🗺️ 12-Week Roadmap & Skills Inventory</h1>
        <p style={{ color: 'var(--muted)', margin: '6px 0 0' }}>The week-by-week path that sequences every playbook. Check off topics inside each doc — progress flows back to your dashboard.</p></div>
      : <div className="doc-hd"><div className="crumb">Doc {doc.num} · {doc.nParts} parts · {doc.nSecs} topics</div>
        <h1>{doc.icon} {doc.title}</h1><div className="tags">{doc.tags.map(t => <span key={t} className="tag">{t}</span>)}</div></div>}
    <div className="content-body" ref={bodyRef} dangerouslySetInnerHTML={{ __html: doc.html }} />
  </>
}

function Recall({ DOCS, mode, recall, saveR, go }) {
  const all = useRef(null)
  if (!all.current) {
    const cards = []
    DOCS.forEach(d => {
      const ivSet = new Set(d.toc.filter(t => t.l === 2 && t.iv).map(t => t.id))
      const tmp = document.createElement('div'); tmp.innerHTML = d.html
      const nodes = [...tmp.children]
      nodes.forEach((n, i) => {
        if (n.tagName === 'H3' && n.classList.contains('h2')) {
          const title = n.textContent.replace(/^\d+(\.\d+)*\s*/, '').trim()
          let ans = ''
          for (let j = i + 1; j < nodes.length; j++) { const m = nodes[j]; if (m.tagName === 'H2' || m.tagName === 'H3') break; ans += m.textContent.trim() + '\n'; if (ans.length > 520) break }
          cards.push({ q: title, a: ans.trim().slice(0, 520), doc: d.id, docName: d.short, cat: d.cat, sec: n.id, iv: ivSet.has(n.id) })
        }
      })
    })
    all.current = cards
  }
  const ALL = all.current.filter(c => mode === 'all' || c.iv)
  const [filter, setFilter] = useState('all')
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [, force] = useState(0)
  const deck = useRef([])
  const buildDeck = (f) => {
    const arr = (f === 'all' ? ALL : ALL.filter(c => c.cat === f)).slice()
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[arr[i], arr[j]] = [arr[j], arr[i]] }
    deck.current = arr; setIdx(0); setFlipped(false)
  }
  useEffect(() => { setFilter('all') }, [mode])
  useEffect(() => { buildDeck(filter) }, [filter, mode])
  const d = deck.current[idx]
  const rate = (v) => { if (d) { recall.current[d.q] = v; saveR() } setIdx(i => (i + 1) % deck.current.length); setFlipped(false); force(x => x + 1) }
  const next = () => { setIdx(i => (i + 1) % deck.current.length); setFlipped(false) }
  const prev = () => { setIdx(i => (i - 1 + deck.current.length) % deck.current.length); setFlipped(false) }
  const got = deck.current.filter(c => recall.current[c.q] === 'good').length
  const again = deck.current.filter(c => recall.current[c.q] === 'again').length
  const cats = ['all', ...CATS.filter(c => ALL.some(x => x.cat === c))]
  return <>
    <div className="section-title" style={{ marginTop: 8 }}>Active recall · {ALL.length} {mode === 'interview' ? 'core' : 'topic'} cards</div>
    <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: -4 }}>{mode === 'interview' ? 'Core topics only — the curated interview set.' : 'One card per topic across all 12 playbooks.'} Read the cue, explain it aloud, flip to check, then rate yourself. Re-drill the "again" pile.</p>
    <div className="pill-row">{cats.map(c => <span key={c} className={'pill' + (c === filter ? ' active' : '')} onClick={() => setFilter(c)}>{c === 'all' ? 'All' : CATLABEL[c] || c}</span>)}</div>
    <div className="flashwrap">
      <div className={'flash' + (flipped ? ' flipped' : '')} onClick={() => setFlipped(f => !f)}>
        {!d ? <div className="q">No cards in this set.</div> : <>
          <div className="qlabel">DOC {d.doc} · {d.docName}{recall.current[d.q] ? ' · ' + recall.current[d.q].toUpperCase() : ''}</div>
          <div className="q">{d.q}</div>
          <div className="a" dangerouslySetInnerHTML={{ __html: (d.a || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>') + `<div style="margin-top:12px"><a href="#doc/${d.doc}/${d.sec}" onclick="event.stopPropagation()">Open full topic in Doc ${d.doc} →</a></div>` }} />
          <div className="hint">click to reveal · {idx + 1} / {deck.current.length}</div>
        </>}
      </div>
      <div className="flash-ctrl">
        <button className="fbtn again" onClick={() => rate('again')}>↺ Again</button>
        <button className="fbtn" onClick={prev}>‹ Prev</button>
        <button className="fbtn good" onClick={() => rate('good')}>✓ Got it</button>
        <button className="fbtn" onClick={next}>Next ›</button>
      </div>
      <div className="recall-bar">{got} marked got-it · {again} to review</div>
    </div>
  </>
}

function Search({ DOCS, mode, query, go }) {
  const q = query.trim()
  if (q.length < 2) return <div className="empty">Type at least 2 characters to search.</div>
  const ql = q.toLowerCase()
  const res = []
  visDocs(DOCS, mode).forEach(d => {
    d.toc.forEach(t => { if (tocVis(t, mode) && t.t.toLowerCase().includes(ql)) res.push({ d, t, type: 'h' }) })
    const i = d.search.toLowerCase().indexOf(ql); if (i >= 0) res.push({ d, idx: i, type: 'c' })
  })
  const hl = (t) => { const i = t.toLowerCase().indexOf(ql); if (i < 0) return t; return <>{t.slice(0, i)}<mark>{t.slice(i, i + q.length)}</mark>{t.slice(i + q.length)}</> }
  return <>
    <div className="section-title" style={{ marginTop: 8 }}>Search · "{q}" · {res.length} matches</div>
    {!res.length && <div className="empty">No matches. Try another term.</div>}
    {res.slice(0, 80).map((r, k) => r.type === 'h'
      ? <div key={k} className="sr" onClick={() => go('#doc/' + r.d.id + '/' + r.t.id)}>
        <div className="sr-doc">DOC {r.d.num} · {r.d.short}{r.t.l === 2 ? ' › topic' : ' › part'}</div><h4>{hl(r.t.t)}</h4></div>
      : <div key={k} className="sr" onClick={() => go('#doc/' + r.d.id)}>
        <div className="sr-doc">DOC {r.d.num} · {r.d.short} › content</div><h4>{r.d.short}</h4>
        <p>…{hl(r.d.search.slice(Math.max(0, r.idx - 60), r.idx + 120))}…</p></div>)}
  </>
}
