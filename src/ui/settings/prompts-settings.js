import { createSettingsKit } from './kit.js';
import { DEFAULT_MYKNOTS_STORY_CLOCK_PROMPT } from '../../story-clock.js';
import { DEFAULT_EXTRACTOR_GUIDANCE } from '../../v3/extractor.js';
import { DEFAULT_CSE_GUIDANCE } from '../../v3/cse-engine.js';
import { DEFAULT_PROFILE_GUIDANCE } from '../../v3/people-workspace.js';
import { BASE_PROCESSING_PROMPT } from '../../internal-processing-prompt.js';
import { normalizeMemoryTagList } from '../../memory-content-sanitizer.js';

// 长提示词在草稿弹窗内编辑，保存时一次写入；短设置仍即时生效。
export function createPromptsSettings({ settings, documentRef = globalThis.document, open = false, onToggle, onStoryClockChange, customImpl = null } = {}) {
  const { element, button, field, subDrawer } = createSettingsKit(documentRef);
  const { drawer, body } = subDrawer({ title: '提示词与包裹符', id: 'qqj-settings-prompts', open, onToggle });
  body.className += ' settings-drawer-list';
  const { drawer: wrapperDrawer, body: wrapperBody } = subDrawer({ title: '包裹符', id: 'qqj-settings-wrappers' });
  const current = settings.get();

  const keepTags = element('input', 'settings-input'); keepTags.value = current.sourceKeepTags ?? ''; keepTags.placeholder = '留空＝不清洗；示例：content, [[...]]';
  const extraTags = element('input', 'settings-input'); extraTags.value = current.sourceExtraTags ?? ''; extraTags.placeholder = '示例（不会自动生效）：think, reasoning, [[...]], {{...}}';
  const storyClockEnabled = element('input'); storyClockEnabled.type = 'checkbox'; storyClockEnabled.checked = current.storyClockEnabled !== false;
  const storyClockReferenceTags = element('input', 'settings-input'); storyClockReferenceTags.value = current.storyClockReferenceTags ?? ''; storyClockReferenceTags.placeholder = '填写成对标签名（可选）';
  const storyClockStatus = element('p', 'settings-result', onStoryClockChange?.({ readOnly: true })?.label ?? '时间戳状态会在下一次正文生成前刷新。');
  storyClockStatus.id = 'qqj-story-clock-status';
  const { drawer: storyClockDrawer, body: storyClockBody } = subDrawer({ title: '时间戳提示词', id: 'qqj-settings-story-clock' });
  const summaryPrompt = current.summaryPrompt ?? '', csePrompt = current.csePrompt ?? '', profilePrompt = current.profilePrompt ?? '', processingPrompt = current.processingPrompt ?? '';
  const { drawer: processingDrawer, body: processingBody } = subDrawer({ title: '破限提示词', id: 'qqj-settings-processing-prompt' });
  const { drawer: summaryDrawer, body: summaryBody } = subDrawer({ title: '摘要内容指导', id: 'qqj-settings-summary-prompt' });
  const { drawer: cseDrawer, body: cseBody } = subDrawer({ title: 'CSE 内容指导', id: 'qqj-settings-cse-prompt' });
  const { drawer: profileDrawer, body: profileBody } = subDrawer({ title: '人物资料内容指导', id: 'qqj-settings-profile-prompt' });

  // 保留/清洗两栏不得同名（对齐 ST-SevenDaysCal bindTagField 校验）：命中交集即拒绝落存、
  // 回退输入框为持久层当前值并给行内错误提示（本项目无 toast 体系，沿用 settings-result error 模式）。
  // 标签名与 `起始...结束` 字面量包裹规则都经 normalizeMemoryTagList 归一后参与比较，
  // 故两栏填同一条包裹规则（如都写 {{...}}）同样会被拦下。
  const tagClashHint = element('p', 'settings-result');
  const setTagClashHint = names => {
    if (!names) { tagClashHint.textContent = ''; tagClashHint.className = 'settings-result'; return; }
    tagClashHint.textContent = `「保留包裹符」与「清洗包裹符」两栏不能填相同标签：${names.join(',')}。请先从另一栏移除。`;
    tagClashHint.className = 'settings-result error';
  };
  const bindTagFieldWithClashCheck = (control, key, otherValue) => {
    control.addEventListener('change', () => {
      const normalized = normalizeMemoryTagList(control.value);
      const other = normalizeMemoryTagList(otherValue());
      const clash = normalized.filter(name => other.includes(name));
      if (clash.length) {
        // 回退读持久层当前值（= 最近一次成功保存值）：本面板只在 panel 初始化时创建一次，
        // 若用创建时快照，二次冲突会把用户刚保存的合法值回退成陈旧值。
        // 回退后显示归一化结果（如 Content → content），与真实落盘状态一致。
        control.value = settings.get()[key] ?? '';
        setTagClashHint(clash);
        return;
      }
      setTagClashHint(null);
      settings.update({ [key]: control.value });
    });
  };
  bindTagFieldWithClashCheck(keepTags, 'sourceKeepTags', () => settings.get().sourceExtraTags ?? '');
  bindTagFieldWithClashCheck(extraTags, 'sourceExtraTags', () => settings.get().sourceKeepTags ?? '');
  const refreshClock = () => {
    const result = onStoryClockChange?.() ?? null;
    storyClockStatus.textContent = result?.label ?? '时间戳状态会在下一次正文生成前刷新。';
  };
  storyClockEnabled.addEventListener('change', () => { settings.update({ storyClockEnabled: storyClockEnabled.checked }); refreshClock(); });
  storyClockReferenceTags.addEventListener('change', () => settings.update({ storyClockReferenceTags: storyClockReferenceTags.value }));
  const promptDialog = (title, value, defaultText, onSave) => {
    if (typeof customImpl !== 'function') return;
    const panel = element('section', 'qqj-editor-dialog');
    panel.append(element('p', 'qqj-editor-intro', '修改内容仅在保存后生效，取消不会更改当前提示词。'));
    const group = element('section', 'qqj-editor-group'); group.append(element('h3', '', title));
    const input = element('textarea', 'settings-input qqj-editor-textarea'); input.value = value; input.placeholder = '留空使用内置默认'; input.rows = 12;
    const actions = element('div', 'qqj-editor-inline-actions');
    actions.append(button('载入内置默认', 'secondary-action', () => { input.value = defaultText; }), button('恢复默认', 'secondary-action', () => { input.value = ''; }));
    group.append(input, actions); panel.append(group);
    void customImpl({ title: `编辑${title}`, content: panel, confirmText: '保存', cancelText: '取消', submit: async () => { await onSave(input.value); return true; } });
  };
  const promptButton = (bodyNode, title, key, value, defaultText, onSave) => {
    const status = element('p', 'settings-hint');
    const refresh = next => { const copy = String(next || '使用内置默认'); status.textContent = `当前${title}：${copy.slice(0, 100)}${copy.length > 100 ? '…' : ''}`; };
    refresh(value); bodyNode.append(status);
    bodyNode.append(button(`编辑${title}`, 'secondary-action', () => promptDialog(title, settings.get()[key] ?? '', defaultText, async text => { await onSave(text); refresh(text); })));
  };
  const clockToggle = element('label', 'setting-switch'); clockToggle.append(storyClockEnabled, element('span', '', '启用正文时间戳'));
  storyClockBody.append(
    clockToggle,
    storyClockStatus,
    element('p', 'settings-hint', '默认 QQJ-start/end，也兼容 SDC 和旧 myknots 格式。自定义文本原样发送，请保留成对 start/end 及 date、weekday、time 字段。'),
    field('正文时间参考标签', storyClockReferenceTags),
    element('p', 'settings-hint', '额外时间标签名用逗号或换行分隔，留空关闭。标准时间戳优先；补读故事时间，不改变正文清洗，也不受生成开关影响。'),
    element('p', 'settings-hint', '完整提示词在弹窗中编辑；保存后生效。'),
    button('编辑时间戳提示词', 'secondary-action', () => promptDialog('时间戳提示词', settings.get().storyClockPrompt ?? '', DEFAULT_MYKNOTS_STORY_CLOCK_PROMPT, async value => { settings.update({ storyClockPrompt: value }); refreshClock(); })),
  );

  const promptEditor = ({ body: editorBody, value, key, defaultText, label, hint = '这里只改内容要求；输出结构、人物绑定和信息范围由程序维护。恢复默认会使用内置文本。' }) => {
    editorBody.append(element('p', 'settings-hint', hint));
    promptButton(editorBody, label, key, value, defaultText, async text => settings.update({ [key]: text }));
  };
  promptEditor({ body: processingBody, value: processingPrompt, key: 'processingPrompt', defaultText: BASE_PROCESSING_PROMPT, label: '破限提示词', hint: '用于摘要、双丝网和人物整理。留空用默认；自定义文本原样发送，替换默认。' });
  promptEditor({ body: summaryBody, value: summaryPrompt, key: 'summaryPrompt', defaultText: DEFAULT_EXTRACTOR_GUIDANCE, label: '摘要内容指导' });
  promptEditor({ body: cseBody, value: csePrompt, key: 'csePrompt', defaultText: DEFAULT_CSE_GUIDANCE, label: 'CSE 内容指导' });
  promptEditor({ body: profileBody, value: profilePrompt, key: 'profilePrompt', defaultText: DEFAULT_PROFILE_GUIDANCE, label: '人物资料内容指导' });

  wrapperBody.append(field('保留包裹符', keepTags), field('清洗包裹符', extraTags), tagClashHint);
  body.append(
    wrapperDrawer,
    storyClockDrawer,
    processingDrawer,
    summaryDrawer,
    cseDrawer,
    profileDrawer,
  );
  return { node: drawer };
}
