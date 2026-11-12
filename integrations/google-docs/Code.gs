const SPELLINGBEE_APP_URL = 'https://tab.pythonanywhere.com';

function onOpen() {
  DocumentApp.getUi()
    .createMenu('SpellingBee')
    .addItem('Open writing checker', 'showSpellingBeeSidebar')
    .addToUi();
}
function showSpellingBeeSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('Sidebar')
    .setTitle('SpellingBee');
  DocumentApp.getUi().showSidebar(html);
}

function getCurrentSelectionText() {
  const selection = DocumentApp.getActiveDocument().getSelection();
  if (!selection) throw new Error('Select text in the document first.');
  const ranges = selection.getRangeElements();
  if (ranges.length !== 1 || ranges[0].getElement().getType() !== DocumentApp.ElementType.TEXT) {
    throw new Error('Select text within one paragraph so corrections can be marked in place.');
  }
  const range = ranges[0];
  const textElement = range.getElement().asText();
  const start = range.isPartial() ? range.getStartOffset() : 0;
  const end = range.isPartial() ? range.getEndOffsetInclusive() : textElement.getText().length - 1;
  const text = textElement.getText().substring(start, end + 1);
  if (!text.trim()) throw new Error('Select some text in the document first.');
  return text;
}

function checkAndMarkSelection() {
  const text = getCurrentSelectionText();
  const response = UrlFetchApp.fetch(SPELLINGBEE_APP_URL + '/api/proofread', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ text: text }),
    muteHttpExceptions: true,
  });
  const status = response.getResponseCode();
  const result = JSON.parse(response.getContentText());
  if (status < 200 || status >= 300) throw new Error(result.error || 'The SpellingBee app could not check this text.');
  markSelection(text, result.corrected_text);
  return result.corrected_text.trim() === text.trim()
    ? 'No corrections suggested.'
    : 'Corrections were applied and highlighted in the document.';
}

function markSelection(original, corrected) {
  const selection = DocumentApp.getActiveDocument().getSelection();
  if (!selection) throw new Error('Select the text to mark in the document.');
  const ranges = selection.getRangeElements();
  if (ranges.length !== 1 || ranges[0].getElement().getType() !== DocumentApp.ElementType.TEXT) {
    throw new Error('Select text within one paragraph so corrections can be marked in place.');
  }

  const range = ranges[0];
  const textElement = range.getElement().asText();
  const start = range.isPartial() ? range.getStartOffset() : 0;
  const end = range.isPartial() ? range.getEndOffsetInclusive() : textElement.getText().length - 1;
  const selectedText = textElement.getText().substring(start, end + 1);
  if (selectedText !== original) {
    throw new Error('The document selection changed. Select the passage again, then check it.');
  }
  const changedRanges = findChangedRanges(original, corrected);

  textElement.deleteText(start, end);
  textElement.insertText(start, corrected);
  changedRanges.forEach(function (changedRange) {
    const changedStart = start + changedRange.start;
    const changedEnd = start + changedRange.end - 1;
    if (changedEnd >= changedStart) {
      textElement.setBackgroundColor(changedStart, changedEnd, '#fff2a8');
      textElement.setUnderline(changedStart, changedEnd, true);
    }
  });
}

function findChangedRanges(original, corrected) {
  if (original === corrected) return [];
  const prefixLength = commonPrefixLength(original, corrected);
  let originalEnd = original.length;
  let correctedEnd = corrected.length;
  while (originalEnd > prefixLength && correctedEnd > prefixLength
    && original.charAt(originalEnd - 1) === corrected.charAt(correctedEnd - 1)) {
    originalEnd -= 1;
    correctedEnd -= 1;
  }
  return [{ start: prefixLength, end: correctedEnd }];
}

function commonPrefixLength(first, second) {
  let index = 0;
  const limit = Math.min(first.length, second.length);
  while (index < limit && first.charAt(index) === second.charAt(index)) index += 1;
  return index;
}
