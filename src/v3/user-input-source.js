import { isHostNarratorMessage, selectAssistantMessage } from './foundation-domain.js';
import { extraOnlySanitizerOptions, sanitizeMemoryContent } from '../memory-content-sanitizer.js';

function selectedUserInput(message, expectedChatId) {
  if (!message || typeof message !== 'object' || message.is_user !== true) return null;
  const autoHideMarker = message.extra?.qianqianjieAutoHide;
  const autoHidden = autoHideMarker?.schemaVersion === 1 && autoHideMarker.chatId === expectedChatId;
  const systemEvent = isHostNarratorMessage(message) || (message.is_system === true && Boolean(message.extra?.type));
  if (systemEvent || (message.is_system === true && !autoHidden)) return null;
  if (Array.isArray(message.swipes)) {
    const selectedSwipeIndex = Number.isSafeInteger(message.swipe_id) ? message.swipe_id : 0;
    const content = message.swipes[selectedSwipeIndex];
    if (typeof content !== 'string') return null;
    return Object.freeze({ content: content.replace(/\r\n?/g, '\n'), swipeId: message.swipe_id ?? selectedSwipeIndex, selectedSwipeIndex });
  }
  if (typeof message.mes !== 'string') return null;
  return Object.freeze({ content: message.mes.replace(/\r\n?/g, '\n'), swipeId: message.swipe_id ?? null, selectedSwipeIndex: null });
}

export function capturePrecedingUserInputFromSnapshot(snapshot, floor, options) {
  const expectedChatId = floor?.chatId;
  if (String(snapshot.context?.chatMetadata?.qianqianjie?.chatId ?? '').trim() !== expectedChatId) return null;
  const targetIndex = floor?.hostLocator?.messageIndex;
  if (!Number.isSafeInteger(targetIndex) || !selectAssistantMessage(snapshot.chat?.[targetIndex])) return null;
  const messages = [];
  // 本仓移植（v1.1.1 合并）：非 AI 正文来源按 extra-only 隔离清洗（AGENTS §3.2）——上游 v1.1.1
  // 把本函数自 memory-runtime.js 外移成文件，本仓「用户输入不得被 M2/M3 洗空」适配随迁至此。
  const userSanitizerOptions = extraOnlySanitizerOptions(options);
  for (let messageIndex = targetIndex - 1; messageIndex >= 0; messageIndex -= 1) {
    const selected = selectedUserInput(snapshot.chat?.[messageIndex], expectedChatId);
    if (!selected) break;
    const content = sanitizeMemoryContent(selected.content, userSanitizerOptions);
    if (!content) break;
    messages.push(Object.freeze({ content, messageIndex, swipeId: selected.swipeId, selectedSwipeIndex: selected.selectedSwipeIndex }));
    if (messages.length >= 40) break;
  }
  messages.reverse();
  return messages.length ? Object.freeze({ messages: Object.freeze(messages) }) : null;
}

// A history source only owns the USER snapshot saved for that exact source floor.
export function storedSourceUserInput(memory, floorId = memory?.floorId) {
  if (!memory) return null;
  const ids = memory.sourceFloorIds ?? [memory.floorId];
  if (ids.length > 1) return memory.sourceFloorSnapshots?.find(source => source.floorId === floorId)?.sourceUserInputSnapshot ?? null;
  return ids[0] === floorId ? memory.sourceUserInputSnapshot ?? null : null;
}

export function memoriesBySourceFloor(memories = []) {
  return new Map(memories.filter(memory => memory.recordStatus === 'active')
    .flatMap(memory => (memory.sourceFloorIds ?? [memory.floorId]).map(floorId => [floorId, memory])));
}
