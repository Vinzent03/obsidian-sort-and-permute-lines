import { MarkdownView, Plugin } from 'obsidian';

interface sortMethod {
	(x: string, y: string): number;
}

interface MyLine {
	source: string;
	formatted: string;
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
		const lines = this.getLines();
		if (lines.length === 0) return;
		let sortFunc = (a: MyLine, b: MyLine) => this.compare(a.formatted.trim(), b.formatted.trim());

		lines.sort(sortFunc);
		this.setLines(lines);
	}

	sortLengthOfLine() {
		const lines = this.getLines();
		if (lines.length === 0) return;
		lines.sort((a, b) => a.formatted.length - b.formatted.length);

		this.setLines(lines);
	}

	permuteReverse() {
		const lines = this.getLines();
		if (lines.length === 0) return;
		lines.reverse();
		this.setLines(lines);
	}

	permuteShuffle() {
		const lines = this.getLines();
		if (lines.length === 0) return;
		lines.shuffle();
		this.setLines(lines);
	}

	getLines(): MyLine[] {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view)
			return;
		const editor = view.editor;
		const file = view.file;
		let lines = editor.getValue().split("\n");

		const start = editor.getCursor("from").line;
		const end = editor.getCursor("to").line;
		const cache = this.app.metadataCache.getFileCache(file);



		const links = [...cache?.links ?? [], ...cache?.embeds ?? []];
		const myLines = lines.map((line, index) => {
			const myLine: MyLine = { source: line, formatted: line };
			links.forEach(e => {
				if (e.position.start.line != index) return;
				const start = e.position.start;
				const end = e.position.end;
				myLine.formatted = myLine.formatted.replace(line.substring(start.col, end.col), e.displayText);
			});

			return myLine;
		});
		if (start != end) {
			return myLines.slice(start, end + 1);
		} else if (cache.frontmatter) {
			return myLines.slice(cache.frontmatter.position.end.line + 1);
		} else {
			return myLines;
		}
	}

	setLines(lines: MyLine[]) {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		const res = this.getPosition(view);
		const editor = view.editor;
		if (res.start != res.end) {
			editor.replaceRange(lines.map(e => e.source).join("\n"), { line: res.start, ch: 0 }, { line: res.end, ch: res.endLineLength });
		} else {
			editor.setValue(lines.map(e => e.source).join("\n"));
		}
	}

	getPosition(view: MarkdownView): { start: number; end: number; endLineLength: number; } | undefined {
		const cache = this.app.metadataCache.getFileCache(view.file);
		const editor = view.editor;

		const cursorStart = editor.getCursor("from").line;
		const cursorEnd = editor.getCursor("to").line;
		const curserEndLineLength = editor.getLine(cursorEnd).length;

		let frontStart = cache.frontmatter?.position?.end?.line + 1;
		if (isNaN(frontStart)){
			frontStart = 0
		}
		const frontEnd = editor.lastLine();
		const frontEndLineLength = editor.getLine(frontEnd).length;

		if (cursorStart != cursorEnd) {
			return {
				start: cursorStart,
				end: cursorEnd,
				endLineLength: curserEndLineLength,
			};
		} else {
			return {
				start: frontStart,
				end: frontEnd,
				endLineLength: frontEndLineLength,
			};
		}
	}
}