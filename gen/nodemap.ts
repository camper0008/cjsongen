import { fatal } from "../assert.ts";
import { Node } from "../repr/node.ts";

export class NodeMap {
    protected inner: Map<string, Node>;

    constructor(nodes: Node[]) {
        this.inner = new Map();
        for (const node of nodes) {
            if (this.inner.has(node.key)) {
                fatal(`encountered duplicate name '${node.key}'`);
            }
            this.inner.set(node.key, node);
        }
    }
    get(key: string): Node {
        const gotten = this.inner.get(key);
        if (!gotten) {
            fatal(`encountered non-existant node '${key}'`);
        }
        return gotten;
    }
}
