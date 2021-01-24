import { Plugin } from 'obsidian';

interface sortMethod {
	(a: string, b: string): number;
}

export default class MyPlugin extends Plugin {
	cm: CodeMirror.Editor;
	async onload() {
		console.log('loading ' + this.manifest.name);
		this.registerCodeMirror((cm) => this.cm = cm);
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
		const lines = this.getLines();
		lines.sort((a, b) => this.modifyLine(a, b, (a, b) => a.localeCompare(b)));
		this.setLines(lines);
	}

	sortLengthOfLine() {
		const lines = this.getLines();
		lines.sort((a, b) => this.modifyLine(a, b, (a, b) => a.length - b.length));

		this.setLines(lines);
	}

	permuteReverse() {
		const lines = this.getLines();
		lines.reverse();
		this.setLines(lines);
	}

	permuteShuffle() {
		const lines = this.getLines();
		lines.shuffle();
		this.setLines(lines);
	}

	getLines(): string[] {
		const selection = this.cm.getSelection();

		if (selection != "") {
			return selection.split("\n");
		} else {
			return this.cm.getValue().split("\n");
		}
	}

	setLines(lines: string[]) {
		const sel = this.cm.getSelection();
		if (sel != "") {
			this.cm.replaceSelection(lines.join("\n"));
		} else {
			this.cm.setValue(lines.join("\n"));
		}
	}

	modifyLine(a: string, b: string, func: sortMethod): number {
		const reg = new RegExp("[a-zA-Z0-9]");
		a = a.split("").filter((char) => reg.test(char)).join("");
		b = b.split("").filter((char) => reg.test(char)).join("");

		return func(a, b);
	}
}