import { ListItemCache, MarkdownView, Plugin } from 'obsidian';

interface sortMethod {
	(x: string, y: string): number;
}

interface MyLine {
	source: string;
	formatted: string;
	headingLevel: number | undefined;
	lineNumber: number;
}

interface HeadingPart {
	to: number;
	title: MyLine;
	lines: MyLine[];
	headings: HeadingPart[];
}

interface ListPart {
	children: ListPart[];
	title: MyLine;
	lastLine: number;
}

export default class MyPlugin extends Plugin {
	compare: sortMethod;
	async onload() {
		console.log('loading ' + this.manifest.name);

		const { compare } = new Intl.Collator(navigator.language, {
			usage: 'sort',
			sensitivity: 'base',
			numeric: true,
			ignorePunctuation: true,
		});
		this.compare = compare;
		this.addCommand({
			id: 'sort-alphabetically-with-checkboxes',
			name: 'Sort alphabetically with checkboxes',
			callback: (() => this.sortAlphabetically(false, false)),
		});
		this.addCommand({
			id: 'sort-list-alphabetically-with-checkboxes',
			name: 'Sort current list alphabetically with checkboxes',
			callback: (() => this.sortAlphabetically(true, false)),
		});
		this.addCommand({
			id: 'sort-alphabetically',
			name: 'Sort alphabetically',
			callback: (() => this.sortAlphabetically(false, true)),
		});
		this.addCommand({
			id: 'sort-list-alphabetically',
			name: 'Sort current list alphabetically',
			callback: (() => this.sortAlphabetically(true, true)),
		});
		this.addCommand({
			id: 'sort-length',
			name: 'Sort by length of line',
			callback: (() => this.sortLengthOfLine()),
		});
		this.addCommand({
			id: 'sort-headings',
			name: 'Sort headings',
			callback: (() => this.sortHeadings()),
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
		this.addCommand({
			id: 'sort-list-recursively',
			name: 'Sort current list recursively',
			callback: (() => this.sortListRecursively(true)),
		});
		this.addCommand({
			id: 'sort-list-recursively-with-checkboxes',
			name: 'Sort current list recursively with checkboxes',
			callback: (() => this.sortListRecursively(false)),
		});

	}

	onunload() {
		console.log('unloading ' + this.manifest.name);
	}


	sortAlphabetically(fromCurrentList = false, ignoreCheckboxes = true) {
		const lines = this.getLines(fromCurrentList, ignoreCheckboxes);
		if (lines.length === 0) return;
		let sortFunc = (a: MyLine, b: MyLine) => this.compare(a.formatted.trim(), b.formatted.trim());

		lines.sort(sortFunc);
		this.setLines(lines, fromCurrentList);
	}

	sortListRecursively(ignoreCheckboxes: boolean) {
		const inputLines = this.getLines(true, ignoreCheckboxes);

		if (inputLines.length === 0 || inputLines.find(line => line.source.trim() == "")) return;
		const firstLineNumber = inputLines.first().lineNumber;
		const lines = [...new Array(firstLineNumber).fill(undefined), ...inputLines];
		let index = firstLineNumber;

		const cache = this.app.metadataCache.getFileCache(this.app.workspace.getActiveFile());
		const children: ListPart[] = [];

		while (index < lines.length) {
			const newChild = this.getSortedListParts(lines, cache.listItems, index);
			children.push(newChild);
			index = newChild.lastLine;

			index++;
		}
		children.sort((a, b) => this.compare(a.title.formatted.trim(), b.title.formatted.trim()));

		const res = children.reduce((acc, cur) => acc.concat(this.listPartToList(cur)), []);
		this.setLines(res, true);
	}

	getLineCacheFromLine(line: number, linesCache: ListItemCache[]): ListItemCache | undefined {
		return linesCache.find(cacheItem => cacheItem.position.start.line === line);
	}

	getSortedListParts(lines: MyLine[], linesCache: ListItemCache[], index: number): ListPart {
		const children: ListPart[] = [];
		const startListCache = this.getLineCacheFromLine(index, linesCache);

		const title = lines[index];

		while (startListCache.parent < this.getLineCacheFromLine(index + 1, linesCache)?.parent || (startListCache.parent < 0 && this.getLineCacheFromLine(index + 1, linesCache)?.parent >= 0)) {
			index++;

			const newChild = this.getSortedListParts(lines, linesCache, index);

			index = newChild.lastLine ?? index;
			children.push(newChild);
		};
		const lastLine = children.last()?.lastLine ?? index;

		children.sort((a, b) => this.compare(a.title.formatted.trim(), b.title.formatted.trim()));
		return {
			children: children,
			title: title,
			lastLine: lastLine,
		};
	}

	listPartToList(list: ListPart): MyLine[] {
		return list.children.reduce((acc, cur) => acc.concat(this.listPartToList(cur)), [list.title]);
	}

	sortHeadings() {
		const lines = this.getLines();
		const res = this.getSortedHeadings(lines, 0, { headingLevel: 0, formatted: "", source: "", lineNumber: -1 });
		this.setLines(this.headingsToString(res).slice(1));
	}

	headingsToString(heading: HeadingPart): MyLine[] {
		const list = [
			heading.title,
			...heading.lines
		];
		heading.headings.forEach((e) => list.push(...this.headingsToString(e)));
		return list;
	}

	getSortedHeadings(lines: MyLine[], from: number, heading: MyLine): HeadingPart {
		let headings: HeadingPart[] = [];
		let contentLines: MyLine[] = [];
		let currentIndex = from;
		while (currentIndex < lines.length) {
			const current = lines[currentIndex];
			if (current.headingLevel <= heading.headingLevel) {
				break;
			}

			if (current.headingLevel) {


				headings.push(this.getSortedHeadings(lines, currentIndex + 1, current));
				currentIndex = headings.last().to;


			} else {
				contentLines.push(current);
			}

			currentIndex++;
		}

		return {
			lines: contentLines,
			to: headings.length > 0 ? headings.last().to : (currentIndex - 1),
			headings: headings.sort((a, b) => {
				//First sort by heading level then alphabetically
				const res = a.title.headingLevel - b.title.headingLevel;
				if (res == 0) {
					return this.compare(a.title.formatted.trim(), b.title.formatted.trim());
				} else {
					return res;
				}
			}),
			title: heading,
		};
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

	getLines(fromCurrentList = false, ignoreCheckboxes = true): MyLine[] {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view)
			return;
		const editor = view.editor;
		const file = view.file;
		let lines = editor.getValue().split("\n");
		const cache = this.app.metadataCache.getFileCache(file);
		const { start, end } = this.getPosition(view, fromCurrentList);

		const headings = cache.headings;
		const links = [...cache?.links ?? [], ...cache?.embeds ?? []];
		const myLines = lines.map((line, index) => {
			const myLine: MyLine = { source: line, formatted: line, headingLevel: undefined, lineNumber: index };
			links.forEach(e => {
				if (e.position.start.line != index) return;
				const start = e.position.start;
				const end = e.position.end;
				myLine.formatted = myLine.formatted.replace(line.substring(start.col, end.col), e.displayText);
			});

			// Regex of all the supported alternate checkbox styles
			const cbRe = /^- \[[ x\/\-><?!*\"lbiSpcfkwud]\]/gi;
			if (ignoreCheckboxes) {
				myLine.formatted = myLine.formatted.replace(cbRe, "");
			} else {
				// Just a little bit dirty...
				myLine.formatted = myLine.formatted.replace(cbRe, "ZZZZZZZZZZZZZZZZZZZZZZZZZ");
			}

			return myLine;
		});

		headings?.map((heading) => myLines[heading.position.start.line].headingLevel = heading.level);

		if (start != end) {
			return myLines.slice(start, end + 1);
		} else {
			return myLines;
		}
	}

	setLines(lines: MyLine[], fromCurrentList: boolean = false) {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		const res = this.getPosition(view, fromCurrentList);

		const editor = view.editor;
		if (res.start != res.end) {
			editor.replaceRange(lines.map(e => e.source).join("\n"), { line: res.start, ch: 0 }, { line: res.end, ch: res.endLineLength });
		} else {
			editor.setValue(lines.map(e => e.source).join("\n"));
		}
	}

	getPosition(view: MarkdownView, fromCurrentList: boolean = false): { start: number; end: number; endLineLength: number; } | undefined {
		const cache = this.app.metadataCache.getFileCache(view.file);
		const editor = view.editor;

		let cursorStart = editor.getCursor("from").line;
		let cursorEnd = editor.getCursor("to").line;
		if (fromCurrentList) {
			const list = cache.sections.find((e) => {
				return e.position.start.line <= cursorStart && e.position.end.line >= cursorEnd;
			});
			if (list) {
				cursorStart = list.position.start.line;
				cursorEnd = list.position.end.line;
			}

		}
		const curserEndLineLength = editor.getLine(cursorEnd).length;
		let frontStart = cache.frontmatter?.position?.end?.line + 1;
		if (isNaN(frontStart)) {
			frontStart = 0;
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