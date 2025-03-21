type IndentItem = { tag: "begin" | "line" | "close"; line: string };

export class Indent {
    items: IndentItem[] = [];

    begin(line: string): void {
        this.items.push({ tag: "begin", line });
    }

    push(line: string): void {
        this.items.push({ tag: "line", line });
    }

    close(line: string): void {
        this.items.push({ tag: "close", line });
    }

    private formatted(line: string, level: number): string {
        const ind = "    ".repeat(level);
        return `${ind}${line}\n`;
    }

    eval(): string {
        let level = 0;
        let result = "";
        const lines = this.items.toReversed();
        while (true) {
            const item = lines.pop();
            if (item === undefined) break;
            switch (item.tag) {
                case "begin":
                    result += this.formatted(item.line, level);
                    level += 1;
                    break;
                case "line":
                    result += this.formatted(item.line, level);
                    break;
                case "close":
                    level -= 1;
                    result += this.formatted(item.line, level);
                    break;
                default:
                    assertUnreachable(item.tag);
            }
        }
        if (level > 0) {
            console.log("_begin not ended");
        }
        return result;
    }
}
