#!/usr/bin/env bun
import { readdirSync, readFileSync, existsSync, mkdirSync, writeFileSync, appendFileSync } from 'fs';
import { join, dirname } from 'path';

const SKILL_DIR = join(import.meta.dir, '..');
const SKILLS_DIR = join(SKILL_DIR, '..');
const DATA_DIR = join(SKILL_DIR, 'data');
const ANALYTICS_FILE = join(process.env.HOME || '', '.gstack/analytics/skill-usage.jsonl');
const LOCAL_LOG = join(DATA_DIR, 'usage-log.jsonl');
const CACHE_FILE = join(DATA_DIR, 'translations.json');
const OUTPUT_JSON = join(DATA_DIR, 'skill-data.json');
const OUTPUT_HTML = join(DATA_DIR, 'dashboard.html');

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

function parseFrontmatter(text: string) {
  const match = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  if (!match) return {};
  const frontmatter: Record<string, string> = {};
  const lines = match[1].split('\n');
  let currentKey = '';
  let isLiteral = false;
  let isFolded = false;
  let literalIndent = 0;
  for (const raw of lines) {
    const line = raw.replace(/\r$/, '');
    if (isLiteral || isFolded) {
      const indent = line.search(/\S/);
      if (indent >= literalIndent && line.trim()) {
        const sep = isFolded ? ' ' : '';
        frontmatter[currentKey] += sep + line.trim();
      } else {
        isLiteral = false;
        isFolded = false;
        currentKey = '';
      }
      continue;
    }
    const kv = line.match(/^(\w+):\s*(.+)$/);
    if (kv) {
      currentKey = kv[1];
      const val = kv[2].trim();
      if (val === '|') {
        isLiteral = true;
        literalIndent = 0;
        frontmatter[currentKey] = '';
      } else if (val === '>') {
        isFolded = true;
        literalIndent = 0;
        frontmatter[currentKey] = '';
      } else {
        frontmatter[currentKey] = val.replace(/^['"]|['"]$/g, '');
      }
    }
  }
  return frontmatter;
}

function readUsageLog(): Record<string, { count: number; lastTs: string }> {
  const usage: Record<string, { count: number; lastTs: string }> = {};

  function ingest(filePath: string) {
    if (!existsSync(filePath)) return;
    const lines = readFileSync(filePath, 'utf-8').split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        const skillName = entry.skill || entry.name;
        if (skillName) {
          if (!usage[skillName]) usage[skillName] = { count: 0, lastTs: '' };
          usage[skillName].count++;
          const ts = entry.ts || entry.timestamp;
          if (ts && ts > usage[skillName].lastTs) usage[skillName].lastTs = ts;
        }
      } catch {}
    }
  }

  ingest(ANALYTICS_FILE);
  ingest(LOCAL_LOG);
  return usage;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

const CATEGORY_RULES: [RegExp, string][] = [
  [/^(playwright|qa|test|browse(r)?)/, '测试'],
  [/^(docx|pdf|pptx|document|make-pdf)/, '文档'],
  [/^(python|git|ship|review|.*-dev$|skillify|scrape|ios-|computer-use)/, '开发工具'],
  [/^(claude|plan-|gbrain|office-hours)/, 'AI'],
  [/^design-/, '设计'],
  [/^(cso|health|benchmark|canary|freeze|guard|retro|learn|context-|land-)/, '运维'],
];

function classify(name: string): string {
  for (const [pattern, category] of CATEGORY_RULES) {
    if (pattern.test(name)) return category;
  }
  return '其他';
}

const ICON_MAP: Record<string, string> = {
  '测试': '🧪',
  '文档': '📄',
  '开发工具': '🛠️',
  'AI': '🤖',
  '设计': '🎨',
  '运维': '🔧',
  '其他': '📦',
};

function getIcon(category: string): string {
  return ICON_MAP[category] || '📦';
}

function parseDescription(raw: string): string {
  let desc = raw.replace(/^["']|["']$/g, '').trim();
  const parenIdx = desc.indexOf('(');
  if (parenIdx > 0) desc = desc.substring(0, parenIdx).trim();
  const dotIdx = desc.indexOf('.');
  if (dotIdx > 0) desc = desc.substring(0, dotIdx + 1).trim();
  return desc || raw;
}

async function translateBatch(texts: string[], cache: Record<string, string>): Promise<Record<string, string>> {
  const uncached: { key: string; text: string }[] = [];
  const result: Record<string, string> = { ...cache };
  for (const t of texts) {
    const key = t.slice(0, 80);
    if (!cache[key]) uncached.push({ key, text: t });
  }
  if (uncached.length === 0) return result;

  const batchText = uncached.map((u, i) => `${i + 1}. ${u.text}`).join('\n');
  const prompt = `Translate each English skill description to concise professional Chinese. Return ONLY a JSON array of strings, one per line:\n\n${batchText}`;

  for (const provider of ['sss', 'easyrouter']) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      const baseURL = provider === 'easyrouter'
        ? 'https://easyrouter.io/v1'
        : 'https://node-hk.sssaicode.com/api/v1';
      const apiKey = provider === 'easyrouter'
        ? 'sk-hhLshG0b9a2y12JCotqnWSkdmB54Nwv0mqr3JL05BH70P60h'
        : 'sk-sssaicode-c5189d81b2853cd4a9c8f7912db49505272d603b265c77eb15498f8d4f4acdaf';
      const model = provider === 'easyrouter' ? 'deepseek-v4-pro' : 'gpt-5.4-mini';

      const response = await fetch(`${baseURL}/chat/completions`, {
        signal: controller.signal,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 4096,
          stream: true,
        }),
      });
      clearTimeout(timeout);
      if (!response.ok) continue;
      const reader = response.body?.getReader();
      if (!reader) continue;
      const decoder = new TextDecoder();
      let fullContent = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content || '';
              fullContent += delta;
            } catch {}
          }
        }
      }
      if (!fullContent.trim()) continue;
      const jsonMatch = fullContent.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        const translated: string[] = JSON.parse(jsonMatch[0]);
        if (Array.isArray(translated)) {
          for (let i = 0; i < uncached.length && i < translated.length; i++) {
            result[uncached[i].key] = translated[i];
          }
        }
      }
      break;
    } catch {}
  }

  writeFileSync(CACHE_FILE, JSON.stringify(result, null, 2));
  return result;
}

async function main() {
  const cache: Record<string, string> = existsSync(CACHE_FILE)
    ? JSON.parse(readFileSync(CACHE_FILE, 'utf-8'))
    : {};
  const usage = readUsageLog();

  const entries = readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() || d.isSymbolicLink())
    .map(d => {
      const skillDir = join(SKILLS_DIR, d.name);
      const skillFile = join(skillDir, 'SKILL.md');
      if (!existsSync(skillFile)) return null;
      const content = readFileSync(skillFile, 'utf-8');
      const meta = parseFrontmatter(content);
      const name = meta.name || d.name;
      const rawDesc = meta.description || '';
      const description = parseDescription(rawDesc);
      const category = classify(name);
      return { name, description, category, rawDesc, skillDir };
    })
    .filter(Boolean) as { name: string; description: string; category: string; rawDesc: string; skillDir: string }[];

  const translations = await translateBatch(
    entries.map(e => e.description),
    cache
  );

  const dirName = entries.map(e => e.skillDir.replace(/.*\//, ''));
  let skills = entries.map((e, i) => ({
    name: e.name,
    description: e.description,
    descriptionCn: translations[e.description.slice(0, 80)] || e.description,
    category: e.category,
    icon: getIcon(e.category),
    usageCount: usage[e.name]?.count || 0,
    lastUsed: usage[e.name]?.lastTs ? timeAgo(usage[e.name].lastTs) : '从未使用',
    lastUsedRaw: usage[e.name]?.lastTs || '',
    triggerCommand: '/' + e.name,
  }));

  skills.sort((a, b) => {
    if (b.usageCount !== a.usageCount) return b.usageCount - a.usageCount;
    return a.name.localeCompare(b.name);
  });

  writeFileSync(OUTPUT_JSON, JSON.stringify(skills, null, 2));

  const categories = [...new Set(skills.map(s => s.category))];
  const categoryBadges = ['全部', ...categories];

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Skills Dashboard</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
<style>
:root{--bg:#0f1419;--card:#1a1f26;--text:#e1e4e8;--muted:#6e7681;--border:#30363d;--accent:#eab308;--accent-subtle:rgba(234,179,8,0.12);--badge-bg:rgba(110,118,129,0.12);--input-bg:#0f1419;--overlay:rgba(0,0,0,0.7)}
@media(prefers-color-scheme:light){:root{--bg:#f8f9fa;--card:#fff;--text:#1f2328;--muted:#656d76;--border:#d8dee4;--accent:#b45309;--accent-subtle:rgba(180,83,9,0.08);--badge-bg:rgba(101,109,118,0.1);--input-bg:#f8f9fa;--overlay:rgba(0,0,0,0.25)}}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:var(--bg);color:var(--text);padding:16px}
.container{max-width:1400px;margin:0 auto}
h1{font-size:22px;margin-bottom:14px;display:flex;align-items:center;gap:8px;font-weight:600}
.controls{display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap;align-items:center}
.search{flex:1;min-width:180px;padding:8px 12px;border:1px solid var(--border);border-radius:8px;background:var(--input-bg);color:var(--text);font-size:14px}
.search:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-subtle)}
.sort-select{padding:8px 12px;border:1px solid var(--border);border-radius:8px;background:var(--card);color:var(--text);font-size:13px;cursor:pointer}
.tabs{display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap}
.tab{padding:5px 12px;border:1px solid var(--border);border-radius:16px;background:transparent;color:var(--muted);cursor:pointer;font-size:12px;transition:all .15s;white-space:nowrap}
.tab:hover{color:var(--text);border-color:var(--text)}
.tab.active{background:var(--accent);color:#0f1419;border-color:var(--accent);font-weight:500}
@media(prefers-color-scheme:light){.tab.active{color:#fff}}
.count{font-size:12px;color:var(--muted);margin-left:auto;white-space:nowrap}
.refresh-btn{padding:8px 14px;border:1px solid var(--border);border-radius:8px;background:var(--card);color:var(--text);cursor:pointer;font-size:12px;transition:all .15s;display:inline-flex;align-items:center;gap:6px}
.refresh-btn:hover{border-color:var(--accent);color:var(--accent)}
.refresh-btn:disabled{opacity:.5;cursor:not-allowed}
.refresh-btn.loading{color:var(--accent)}
.spinner{display:inline-block;width:12px;height:12px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:spin .5s linear infinite;vertical-align:middle}
@keyframes spin{to{transform:rotate(360deg)}}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px}
.card{display:flex;flex-direction:column;gap:8px;padding:14px 16px;background:var(--card);border:1px solid var(--border);border-radius:10px;cursor:pointer;transition:border-color .15s,transform .15s,box-shadow .15s}
.card:hover{border-color:var(--accent);transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,0.2)}
.card-row{display:flex;align-items:center;gap:10px}
.card-icon{font-size:20px;flex-shrink:0;width:28px;text-align:center}
.card-name{font-family:'JetBrains Mono','SF Mono','Fira Code',monospace;font-weight:600;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.card-desc{font-size:12px;color:var(--muted);line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.card-meta{display:flex;gap:8px;flex-wrap:wrap;align-items:center;font-size:11px}
.badge{font-size:10px;padding:2px 8px;border-radius:10px;font-weight:500}
.badge.测试{background:rgba(63,185,80,0.15);color:#3fb950}
.badge.文档{background:rgba(88,166,255,0.15);color:#58a6ff}
.badge.开发工具{background:rgba(210,168,255,0.15);color:#d2a8ff}
.badge.AI{background:rgba(210,153,34,0.15);color:#d29922}
.badge.设计{background:rgba(247,129,102,0.15);color:#f78166}
.badge.运维{background:rgba(121,192,255,0.15);color:#79c0ff}
.badge.其他{background:rgba(126,231,135,0.15);color:#7ee787}
.last-used{color:var(--muted)}
.last-used.never{opacity:.45}
.use-count{font-size:11px;color:var(--accent);margin-left:auto;opacity:.8}
@media(prefers-color-scheme:light){
.badge.测试{background:rgba(15,81,50,0.1);color:#0f5132}
.badge.文档{background:rgba(0,68,204,0.1);color:#0044cc}
.badge.开发工具{background:rgba(111,66,193,0.1);color:#6f42c1}
.badge.AI{background:rgba(133,100,4,0.1);color:#856404}
.badge.设计{background:rgba(192,57,43,0.1);color:#c0392b}
.badge.运维{background:rgba(0,51,153,0.1);color:#003399}
.badge.其他{background:rgba(15,81,50,0.1);color:#0f5132}
.empty-state{color:var(--muted)}}
@media(max-width:640px){.grid{grid-template-columns:1fr}}
.empty-state{text-align:center;padding:48px 16px;color:var(--muted)}
.empty-state-icon{font-size:40px;margin-bottom:12px}
.empty-state-text{font-size:14px;margin-bottom:4px}
.empty-state-hint{font-size:12px;opacity:.6}

.modal-overlay{display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:var(--overlay);z-index:1000;align-items:center;justify-content:center;padding:20px}
.modal-overlay.open{display:flex}
.modal{background:var(--card);border:1px solid var(--border);border-radius:14px;max-width:560px;width:100%;max-height:80vh;overflow-y:auto;padding:28px;position:relative;animation:modalIn .2s ease}
@keyframes modalIn{from{opacity:0;transform:translateY(12px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
.modal-close{position:absolute;top:14px;right:18px;background:none;border:none;color:var(--muted);font-size:22px;cursor:pointer;padding:4px;line-height:1;border-radius:6px;transition:background .12s}
.modal-close:hover{color:var(--text);background:var(--badge-bg)}
.modal-icon{font-size:36px;margin-bottom:10px}
.modal-name{font-family:'JetBrains Mono','SF Mono','Fira Code',monospace;font-size:20px;font-weight:600;margin-bottom:6px}
.modal-desc-en{font-size:13px;color:var(--muted);margin-bottom:6px;line-height:1.55}
.modal-desc-cn{font-size:14px;color:var(--text);margin-bottom:14px;line-height:1.55}
.modal-meta{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;font-size:12px}
.modal-stat{display:flex;align-items:center;gap:5px;color:var(--muted)}
.modal-stat strong{color:var(--text)}
.modal-cmd{background:var(--input-bg);border:1px solid var(--border);border-radius:8px;padding:12px 16px;margin-bottom:18px;display:flex;flex-direction:column;gap:4px}
.modal-cmd code{font-family:'JetBrains Mono','SF Mono','Fira Code',monospace;font-size:15px;color:var(--accent)}
.modal-cmd-hint{font-size:11px;color:var(--muted);font-family:'DM Sans',-apple-system,sans-serif}
.modal-use-btn{display:block;width:100%;padding:12px;border:none;border-radius:10px;background:var(--accent);color:#0f1419;font-size:15px;font-weight:600;cursor:pointer;transition:all .15s}
.modal-use-btn:hover{opacity:.9;transform:translateY(-1px)}
.modal-use-btn:active{transform:translateY(0);opacity:.8}
@media(prefers-color-scheme:light){.modal-use-btn{color:#fff}}
.copied-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--accent);color:#0f1419;padding:10px 20px;border-radius:10px;font-size:13px;font-weight:500;z-index:2000;opacity:0;transition:opacity .25s;pointer-events:none}
.copied-toast.show{opacity:1}
@media(prefers-color-scheme:light){.copied-toast{color:#fff}}
</style>
</head>
<body>
<div class="container">
  <div class="controls">
    <h1>Skills</h1>
    <input class="search" type="text" placeholder="搜索名称或描述..." id="search">
    <select class="sort-select" id="sort">
      <option value="count">调用次数</option>
      <option value="name">名称 A→Z</option>
    </select>
    <button class="refresh-btn" id="refreshBtn">刷新</button>
    <span class="count" id="count"></span>
  </div>
  <div class="tabs" id="tabs"></div>
  <div class="grid" id="grid"></div>
</div>
<div class="modal-overlay" id="modalOverlay">
  <div class="modal" id="modalContent"></div>
</div>
<div class="copied-toast" id="copiedToast"></div>
<script>
let skills=[],activeTab='全部';
const overlay=document.getElementById('modalOverlay');
const modal=document.getElementById('modalContent');
const toast=document.getElementById('copiedToast');
let toastTimer=null;

function showToast(msg){
  toast.textContent=msg;toast.classList.add('show');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),2000)
}

async function loadData(){
  const btn=document.getElementById('refreshBtn');
  const orig=btn.innerHTML;btn.disabled=true;btn.classList.add('loading');
  btn.innerHTML='<span class="spinner"></span>刷新中';
  try{
    const res=await fetch('skill-data.json?_='+Date.now());
    skills=await res.json();render();showToast('已刷新')
  }catch(e){
    document.getElementById('grid').innerHTML='<p style="color:var(--muted);padding:20px">加载失败</p>'
  }finally{
    btn.innerHTML=orig;btn.disabled=false;btn.classList.remove('loading')
  }
}
function render(){
  const q=(document.getElementById('search').value||'').toLowerCase();
  const sortBy=document.getElementById('sort').value;
  let f=skills.filter(s=>{
    if(activeTab!=='全部'&&s.category!==activeTab)return false;
    if(q&&!s.name.toLowerCase().includes(q)&&!(s.descriptionCn||'').toLowerCase().includes(q))return false;
    return true
  });
  if(sortBy==='count'){
    f.sort((a,b)=>{
      if(b.usageCount!==a.usageCount)return b.usageCount-a.usageCount;
      return a.name.localeCompare(b.name)
    })
  }else{
    f.sort((a,b)=>a.name.localeCompare(b.name))
  }
  document.getElementById('count').textContent=\`\${f.length}/\${skills.length}\`;
  if(f.length===0){document.getElementById('grid').innerHTML=\`<div class="empty-state"><div class="empty-state-icon">🔍</div><div class="empty-state-text">没有匹配的技能</div><div class="empty-state-hint">试试其他搜索词或分类</div></div>\`;return}
  document.getElementById('grid').innerHTML=f.map(s=>{
    const never=s.lastUsed==='从未使用';
    return \`<div class="card" data-name="\${s.name}">
      <div class="card-row">
        <div class="card-icon">\${s.icon}</div>
        <div class="card-name">\${s.name}</div>
        <span class="use-count">调用 \${s.usageCount} 次</span>
      </div>
      <div class="card-desc" title="\${s.description}">\${s.descriptionCn}</div>
      <div class="card-meta">
        <span class="badge \${s.category}">\${s.category}</span>
        <span class="last-used\${never?' never':''}">\${s.lastUsed}</span>
      </div>
    </div>\`
  }).join('');
  document.querySelectorAll('.card').forEach(el=>{
    el.addEventListener('click',()=>showDetail(el.dataset.name))
  })
}
function showDetail(name){
  const s=skills.find(x=>x.name===name);if(!s)return;
  const never=s.lastUsed==='从未使用';
  modal.innerHTML=\`
    <button class="modal-close" id="modalClose">&times;</button>
    <div class="modal-icon">\${s.icon}</div>
    <div class="modal-name">\${s.name}</div>
    <div class="modal-desc-en">\${s.description}</div>
    <div class="modal-desc-cn">\${s.descriptionCn}</div>
    <div class="modal-meta">
      <span class="badge \${s.category}">\${s.category}</span>
      <span class="modal-stat">调用 <strong>\${s.usageCount}</strong> 次</span>
      <span class="modal-stat">上次 <strong>\${never?'从未使用':s.lastUsed}</strong></span>
    </div>
    <div class="modal-cmd">
      <code>\${s.triggerCommand}</code>
      <span class="modal-cmd-hint">点击下方按钮复制到对话框</span>
    </div>
    <button class="modal-use-btn" data-cmd="\${s.triggerCommand}">使用此 Skill</button>
  \`;
  overlay.classList.add('open');
  document.getElementById('modalClose').addEventListener('click',()=>overlay.classList.remove('open'));
  overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.classList.remove('open')});
  modal.querySelector('.modal-use-btn').addEventListener('click',function(){
    const cmd=this.dataset.cmd;const skill=cmd.replace('/','');
    fetch('/api/use?skill='+encodeURIComponent(skill),{method:'POST'}).catch(()=>{});
    if(navigator.clipboard&&navigator.clipboard.writeText){
      navigator.clipboard.writeText(cmd).then(()=>showToast('已复制 '+cmd+'，粘贴到对话框后编辑使用')).catch(()=>fallbackCopy(cmd))
    }else{fallbackCopy(cmd)}
  })
}
function fallbackCopy(text){
  const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';
  document.body.appendChild(ta);ta.select();try{document.execCommand('copy');showToast('已复制 '+text)}catch(e){}
  document.body.removeChild(ta)
}
document.getElementById('search').addEventListener('input',render);
document.getElementById('sort').addEventListener('change',render);
document.getElementById('refreshBtn').addEventListener('click',loadData);
document.addEventListener('keydown',e=>{if(e.key==='Escape')overlay.classList.remove('open')});
const tabsEl=document.getElementById('tabs');
const tabNames=${JSON.stringify(categoryBadges)};
tabsEl.innerHTML=tabNames.map(t=>\`<button class="tab\${t==='全部'?' active':''}" data-tab="\${t}">\${t}</button>\`).join('');
tabsEl.addEventListener('click',e=>{
  const btn=e.target.closest('.tab');
  if(!btn)return;
  tabsEl.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');activeTab=btn.dataset.tab;render()
});
document.getElementById('grid').innerHTML='<div class="empty-state"><div class="spinner" style="width:24px;height:24px;border-width:3px;margin:0 auto 12px"></div><div class="empty-state-text">加载中...</div></div>';
loadData();setInterval(loadData,300000);
</script>
</body>
</html>`;

  writeFileSync(OUTPUT_HTML, html);

  appendFileSync(LOCAL_LOG, JSON.stringify({ skill: 'skill-board', ts: new Date().toISOString() }) + '\n');

  console.log(`✅ Generated ${skills.length} skills → ${OUTPUT_JSON}`);
  console.log(`✅ Dashboard → ${OUTPUT_HTML}`);
  console.log(`📡 Run 'bun ${join(SKILL_DIR, 'scripts/serve.ts')}' to start server`);
}

main().catch(e => { console.error(e); process.exit(1); });
