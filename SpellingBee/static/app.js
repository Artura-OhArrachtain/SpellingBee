const form = document.querySelector('#proofread-form');
const editor = document.querySelector('#source-text');
const button = document.querySelector('#check-button');
const status = document.querySelector('#status');
const resultCard = document.querySelector('#result-card');
const correctedText = document.querySelector('#corrected-text');
const explanationWrap = document.querySelector('#explanation-wrap');
const explanation = document.querySelector('#explanation');
const counter = document.querySelector('#text-count');
const documentFile = document.querySelector('#document-file');
const openDocumentButton = document.querySelector('#open-document-button');

editor.addEventListener('input', () => {
  counter.textContent = `${editor.value.length.toLocaleString()} / 12,000`;
});

openDocumentButton.addEventListener('click', () => documentFile.click());

documentFile.addEventListener('change', async () => {
  const file = documentFile.files?.[0];
  if (!file) return;
  if (editor.value.trim() && !window.confirm('Opening a document will replace the text in the editor. Continue?')) {
    documentFile.value = '';
    return;
  }

  openDocumentButton.disabled = true;
  openDocumentButton.textContent = 'Opening…';
  showStatus(`Opening ${file.name}…`);
  resultCard.hidden = true;
  try {
    const formData = new FormData();
    formData.append('document', file);
    const response = await fetch('/api/open-document', { method: 'POST', body: formData });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not open this document.');
    editor.value = result.text;
    counter.textContent = `${editor.value.length.toLocaleString()} / 12,000`;
    editor.focus();
    showStatus(`Opened ${file.name}. Review the text, then choose Check my writing.`);
  } catch (error) {
    showStatus(error.message || 'Could not open this document. Please try another file.', true);
  } finally {
    openDocumentButton.disabled = false;
    openDocumentButton.textContent = 'Open a document';
    documentFile.value = '';
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const text = editor.value.trim();
  if (!text) {
    editor.focus();
    showStatus('Add some text first, then I can check it.', true);
    return;
  }

  button.disabled = true;
  button.innerHTML = '<span class="spinner" aria-hidden="true"></span> Checking…';
  showStatus('Reading your text and looking for improvements…');
  resultCard.hidden = true;

  try {
    const response = await fetch('/api/proofread', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Something went wrong. Please try again.');
    correctedText.textContent = result.corrected_text;
    explanation.textContent = result.explanation;
    explanationWrap.hidden = !result.explanation;
    resultCard.hidden = false;
    showStatus('Your review is ready. Take a look at the suggestion below.');
  } catch (error) {
    showStatus(error.message || 'Could not check your text. Please try again.', true);
  } finally {
    button.disabled = false;
    button.innerHTML = '<span aria-hidden="true">✦</span> Check my writing';
  }
});

document.querySelector('#copy-button').addEventListener('click', async (event) => {
  try {
    await navigator.clipboard.writeText(correctedText.textContent);
    event.currentTarget.textContent = 'Copied!';
    window.setTimeout(() => { event.currentTarget.textContent = 'Copy text'; }, 1600);
  } catch {
    showStatus('Could not access the clipboard. Select the suggestion to copy it.', true);
  }
});

document.querySelector('#replace-button').addEventListener('click', () => {
  editor.value = correctedText.textContent;
  counter.textContent = `${editor.value.length.toLocaleString()} / 12,000`;
  editor.focus();
  showStatus('Replaced your text with the suggestion.');
});

function showStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle('error', isError);
  status.hidden = false;
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {
      // The checker still works when service workers are unavailable.
    });
  });
}

const installButton = document.querySelector('#install-button');
const installHelp = document.querySelector('#install-help');
let installPrompt;

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installPrompt = event;
  installButton.hidden = false;
});

installButton.addEventListener('click', async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = undefined;
  installButton.hidden = true;
});

window.addEventListener('appinstalled', () => {
  installButton.hidden = true;
  installHelp.hidden = true;
});

const isAppleMobile = /iPad|iPhone|iPod/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
if (isAppleMobile && !window.matchMedia('(display-mode: standalone)').matches) {
  installHelp.hidden = false;
}
