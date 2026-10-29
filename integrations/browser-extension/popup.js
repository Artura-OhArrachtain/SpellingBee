const settingsForm = document.querySelector('#settings-form');
const apiUrlField = document.querySelector('#api-url');
const sourceField = document.querySelector('#source-text');
const checkButton = document.querySelector('#check-button');
const status = document.querySelector('#status');
const result = document.querySelector('#result');
const correctedField = document.querySelector('#corrected-text');
let activeTabId;

document.addEventListener('DOMContentLoaded', initialize);

async function initialize() {
  const saved = await chrome.storage.local.get(['apiUrl']);
  apiUrlField.value = saved.apiUrl || 'http://127.0.0.1:5000';
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  activeTabId = tab?.id;
  if (!activeTabId || !/^https?:/.test(tab.url || '')) {
    setStatus('Open a writing page first. Browser-internal pages cannot be read.', true);
    return;
  }

  try {
    const [page] = await chrome.scripting.executeScript({ target: { tabId: activeTabId }, func: captureEditorText });
    sourceField.value = page?.result?.text || '';
    if (!sourceField.value) setStatus('Select text or click inside an editor before opening the extension.');
  } catch {
    setStatus('This page does not allow extensions to read its text. Use the Google Docs add-on if this is a Google document.', true);
  }
}

settingsForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const address = new URL(apiUrlField.value.trim());
    if (!['http:', 'https:'].includes(address.protocol)) throw new Error('Use an http or https app address.');
    const permitted = await chrome.permissions.request({ origins: [`${address.origin}/*`] });
    if (!permitted) throw new Error('Allow access to the SpellingBee app address to continue.');
    apiUrlField.value = address.origin.replace(/\/$/, '');
    await chrome.storage.local.set({ apiUrl: apiUrlField.value });
    setStatus('App address saved.');
  } catch (error) {
    setStatus(error.message || 'Enter a valid app address.', true);
  }
});

checkButton.addEventListener('click', async () => {
  const text = sourceField.value.trim();
  if (!text) return setStatus('Select text or click inside an editor first.', true);
  if (text.length > 12000) return setStatus('Select 12,000 characters or fewer.', true);

  checkButton.disabled = true;
  setStatus('Checking your writing…');
  result.hidden = true;
  try {
    const address = apiUrlField.value.trim().replace(/\/$/, '');
    const response = await fetch(`${address}/api/proofread`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not check the selected text.');
    correctedField.value = data.corrected_text;
    document.querySelector('#explanation').textContent = data.explanation || '';
    result.hidden = false;
    setStatus('Suggestion ready. Review it before replacing the text in the page.');
  } catch (error) {
    setStatus(error.message || 'Could not reach SpellingBee. Check the app address and try again.', true);
  } finally {
    checkButton.disabled = false;
  }
});

document.querySelector('#replace-button').addEventListener('click', async () => {
  try {
    const [page] = await chrome.scripting.executeScript({
      target: { tabId: activeTabId },
      func: replaceEditorText,
      args: [correctedField.value],
    });
    if (!page?.result?.ok) throw new Error(page?.result?.error || 'Could not replace text in this editor.');
    setStatus('Replaced the selected text in the page.');
  } catch (error) {
    setStatus(error.message || 'Could not replace text in the page.', true);
  }
});

function setStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle('error', isError);
}

function captureEditorText() {
  const active = document.activeElement;
  const isTextInput = active && (active.tagName === 'TEXTAREA'
    || (active.tagName === 'INPUT' && ['text', 'search', 'url', 'email'].includes(active.type)));
  if (isTextInput) {
    const start = active.selectionStart ?? 0;
    const end = active.selectionEnd ?? 0;
    const selected = start !== end;
    globalThis.__spellingBeeTarget = { kind: 'input', element: active, start: selected ? start : 0, end: selected ? end : active.value.length };
    return { text: selected ? active.value.slice(start, end) : active.value };
  }

  const editable = active?.closest?.('[contenteditable="true"], [role="textbox"]')
    || (active?.isContentEditable ? active : null);
  const selection = window.getSelection();
  if (editable) {
    const selected = selection?.toString() || '';
    globalThis.__spellingBeeTarget = {
      kind: 'editable', element: editable,
      range: selected ? selection.getRangeAt(0).cloneRange() : null,
    };
    return { text: selected || editable.innerText || editable.textContent || '' };
  }
  if (selection?.rangeCount && selection.toString()) {
    const range = selection.getRangeAt(0).cloneRange();
    const ancestor = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
      ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement;
    const target = ancestor?.closest?.('[contenteditable="true"], [role="textbox"]');
    if (target) {
      globalThis.__spellingBeeTarget = { kind: 'editable', element: target, range };
      return { text: selection.toString() };
    }
    return { text: selection.toString(), error: 'Selected text is not inside an editable field.' };
  }
  return { text: '' };
}

function replaceEditorText(text) {
  const target = globalThis.__spellingBeeTarget;
  if (!target?.element?.isConnected) return { ok: false, error: 'Re-select the text in the page, then open the extension again.' };
  const element = target.element;
  if (target.kind === 'input') {
    const value = element.value;
    element.value = value.slice(0, target.start) + text + value.slice(target.end);
    element.setSelectionRange(target.start + text.length, target.start + text.length);
    element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return { ok: true };
  }
  if (target.range && element.contains(target.range.commonAncestorContainer)) {
    const range = target.range;
    range.deleteContents();
    const inserted = document.createTextNode(text);
    range.insertNode(inserted);
    range.setStartAfter(inserted);
    range.collapse(true);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  } else {
    element.textContent = text;
  }
  element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
  return { ok: true };
}
