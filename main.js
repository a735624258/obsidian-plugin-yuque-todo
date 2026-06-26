"use strict";
const obsidian = require('obsidian');
const { Plugin, MarkdownView } = obsidian;

class YuqueTodoPlugin extends Plugin {
	async onload() {
		console.log('YuqueTodo: onload');

		try {
			// 后处理器
			this.registerMarkdownPostProcessor((el, ctx) => {
				this.processChecklist(el);
			});

			// 点击处理
			this.registerDomEvent(document, 'click', (ev) => {
				this.handleClick(ev);
			}, true);

			console.log('YuqueTodo: registered OK');
		} catch (e) {
			console.error('YuqueTodo: error in onload', e);
		}
	}

	processChecklist(container) {
		const items = container.querySelectorAll('li.task-list-item');
		for (const li of items) {
			if (li.classList.contains('yq-proc')) continue;
			li.classList.add('yq-proc');

			const state = (li.getAttribute('data-task') || ' ').trim() || ' ';
			const cls = state === ' ' ? 'todo' : state === '/' ? 'doing' : 'done';

			const cb = li.querySelector('input.task-list-item-checkbox');
			if (cb) cb.style.display = 'none';

			const span = document.createElement('span');
			span.className = 'yq-cb yq-cb-' + cls;
			span.dataset.yqState = state;
			li.prepend(span);

			const sub = li.querySelector(':scope > ul, :scope > ol');
			if (sub) {
				const tog = document.createElement('span');
				tog.className = 'yq-tog';
				tog.textContent = '\u25BE';
				li.prepend(tog);
			}
		}
	}

	async handleClick(ev) {
		const ind = ev.target.closest('.yq-cb');
		if (!ind) {
			const t = ev.target.closest('.yq-tog');
			if (t) {
				ev.preventDefault();
				const li = t.closest('li');
				if (li) {
					li.classList.toggle('yq-col');
					t.textContent = li.classList.contains('yq-col') ? '\u25B8' : '\u25BE';
				}
			}
			return;
		}

		ev.preventDefault();
		ev.stopPropagation();
		ev.stopImmediatePropagation();

		const li = ind.closest('li.task-list-item');
		if (!li) return;

		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view || !view.editor) return;

		const ed = view.editor;
		const rect = ind.getBoundingClientRect();
		const cx = rect.left + rect.width / 2;
		const cy = rect.top + rect.height / 2;

		// 方法1：通过坐标定位
		const pos = ed.posAtCoords({ left: cx, top: cy });
		let lineNum = -1;
		let lineContent = '';

		if (pos && ed.getLine(pos.line).match(/^(\s*[-*+]\s+)\[/)) {
			lineNum = pos.line;
			lineContent = ed.getLine(lineNum);
		} else {
			// 方法2：扫描编辑器全文找匹配行
			const textToFind = li.textContent.trim().substring(0, 20);
			for (let i = 0; i < ed.lineCount(); i++) {
				const l = ed.getLine(i);
				if (l.match(/^(\s*[-*+]\s+)\[([ x\/])\]/) && l.includes(textToFind)) {
					lineNum = i;
					lineContent = l;
					break;
				}
			}
		}

		if (lineNum === -1) return;

		const m = lineContent.match(/^(\s*[-*+]\s+)\[([ x\/])\]/);
		if (!m) return;

		const map = { ' ': '/', '/': 'x', 'x': ' ' };
		const ns = map[m[2]] || ' ';
		ed.setLine(lineNum, lineContent.replace(m[0], m[1] + '[' + ns + ']'));
	}
}

module.exports = YuqueTodoPlugin;
