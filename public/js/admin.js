// Admin helpers: media uploads, pickers, delete confirmations and unsaved-change warnings.
const csrf = document.body.dataset.csrf;
const MAX_SIDE = 1600;
const MAX_BYTES = 3 * 1024 * 1024;

const readAsDataUrl = (blob) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = () => reject(new Error('Could not read the file.'));
  r.readAsDataURL(blob);
});

// Large photos are scaled down in the browser before upload. PNG keeps
// transparency; everything else becomes a JPEG. GIFs are left alone so they keep moving.
async function prepare(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return { data: await readAsDataUrl(file), name: file.name };
  const img = new Image();
  img.src = await readAsDataUrl(file);
  await img.decode();
  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  if (scale === 1 && file.size < 400 * 1024) return { data: img.src, name: file.name };
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext('2d');
  const png = file.type === 'image/png';
  if (!png) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return { data: canvas.toDataURL(png ? 'image/png' : 'image/jpeg', 0.85), name: file.name.replace(/\.\w+$/, png ? '.png' : '.jpg') };
}

async function upload(file) {
  const { data, name } = await prepare(file);
  if ((data.length * 3) / 4 > MAX_BYTES) throw new Error(`${file.name} is over 3 MB.`);
  const res = await fetch('/admin/media/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ _csrf: csrf, name, data, alt: name.replace(/\.\w+$/, '').replace(/[-_]+/g, ' ') }),
  });
  const out = await res.json().catch(() => ({ ok: false, error: `Upload failed (${res.status}).` }));
  if (!out.ok) throw new Error(out.error);
  return out.media;
}

function showPreview(box, url, kind) {
  const p = box.querySelector('.picker-preview');
  if (!p) return;
  p.textContent = '';
  if (!url) return;
  const el = document.createElement(kind === 'image' ? 'img' : 'audio');
  el.src = url;
  if (kind !== 'image') el.controls = true;
  p.append(el);
}

document.querySelectorAll('.picker').forEach((box) => {
  const kind = box.dataset.kind;
  const select = box.querySelector('select');
  const input = box.querySelector('input[type=file]');
  const status = box.querySelector('.picker-status');

  select?.addEventListener('change', () => showPreview(box, select.selectedOptions[0]?.dataset.url, kind));

  input.addEventListener('change', async () => {
    const files = [...input.files];
    if (!files.length) return;
    let done = 0;
    for (const file of files) {
      status.textContent = `Uploading ${file.name}…`;
      try {
        const m = await upload(file);
        done += 1;
        if (select) {
          const opt = new Option(m.name, m.id, true, true);
          opt.dataset.url = m.url;
          select.add(opt);
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      } catch (err) {
        status.textContent = err.message;
        input.value = '';
        return;
      }
    }
    input.value = '';
    status.textContent = select ? 'Uploaded. Remember to save.' : `${done} uploaded.`;
    if (box.hasAttribute('data-reload')) window.location.reload();
  });
});

// "Are you sure?" for delete buttons.
document.querySelectorAll('form[data-confirm]').forEach((form) => {
  form.addEventListener('submit', (e) => {
    if (!window.confirm(form.dataset.confirm)) e.preventDefault();
  });
});

// Warn before leaving a page with unsaved edits.
let dirty = null;
document.querySelectorAll('form[data-dirty]').forEach((form) => {
  form.addEventListener('input', () => { dirty = form; });
  form.addEventListener('change', () => { dirty = form; });
  form.addEventListener('submit', () => { dirty = null; });
});
window.addEventListener('beforeunload', (e) => {
  if (dirty) e.preventDefault();
});

// Click a file address to select it for copying.
document.querySelectorAll('.copy-url').forEach((el) => el.addEventListener('focus', () => el.select()));

// Fade the save message, and drop ?flash= from the address so a refresh doesn't repeat it.
const toast = document.querySelector('.alert.toast');
if (toast) {
  setTimeout(() => toast.classList.add('gone'), 6000);
  toast.addEventListener('click', () => toast.classList.add('gone'));
  const url = new URL(window.location.href);
  url.searchParams.delete('flash');
  window.history.replaceState(null, '', url);
}
