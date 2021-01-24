import { MarkdownView, Plugin } from 'obsidian';

interface sortMethod {
	(x: string, y: string): number;
}

export default class MyPlugin extends Plugin {
	compare: sortMethod;
	async onload() {
		console.log('loading ' + this.manifest.name);

		const { compare } = new Intl.Collator(undefined, {
			usage: 'sort',
			sensitivity: 'base',
			numeric: true,
			ignorePunctuation: true,
		});
		this.compare = compare;
		this.addCommand({
			id: 'sort-alphabetically',
			name: 'Sort alphabetically',
			callback: (() => this.sortAlphabetically()),
		});
		this.addCommand({
			id: 'sort-length',
			name: 'Sort by length of line',
			callback: (() => this.sortLengthOfLine()),
		});
		this.addCommand({
			id: 'permute-reverse',
			name: 'Reverse lines',
			callback: (() => this.permuteReverse()),
		});
		this.addCommand({
			id: 'permute-shuffle',
			name: 'Shuffle lines',
			callback: (() => this.permuteShuffle()),
		});

	}

	onunload() {
		console.log('unloading ' + this.manifest.name);
	}


	sortAlphabetically() {
		const lines = this.getLines(this.getEditor());
		if (!lines) return;
		let sortFunc = (a: string, b: string) => this.compare(a.trim(), b.trim());

		lines.sort(sortFunc);
		this.setLines(this.getEditor(), lines);
	}

	sortLengthOfLine() {
		const lines = this.getLines(this.getEditor());
		if (!lines) return;
		lines.sort((a, b) => a.length - b.length);

		this.setLines(this.getEditor(), lines);
	}

	permuteReverse() {
		const lines = this.getLines(this.getEditor());
		if (!lines) return;
		lines.reverse();
		this.setLines(this.getEditor(), lines);
	}

	permuteShuffle() {
		const lines = this.getLines(this.getEditor());
		if (!lines) return;
		lines.shuffle();
		this.setLines(this.getEditor(), lines);
	}

	getEditor(): CodeMirror.Editor {
		let view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view) return;

		let cm = view.sourceMode.cmEditor;
		return cm;
	}

	getLines(editor: CodeMirror.Editor): string[] {
		if (!editor) return;
		const selection = editor.getSelection();

		if (selection != "") {
			return selection.split("\n");
		} else {
			return editor.getValue().split("\n");
		}
	}

	setLines(editor: CodeMirror.Editor, lines: string[]) {
		const selection = editor.getSelection();
		if (selection != "") {
			editor.replaceSelection(lines.join("\n"));
		} else {
			editor.setValue(lines.join("\n"));
		}
	}
}