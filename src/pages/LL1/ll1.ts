enum SYMBOL_TYPE {
    EMPTY,
    VARIABLE,
    TERMINAL,
}

export interface StringToString {
    [propName: string]: string;
}

export class Symbol {
    symbol: string;
    type: SYMBOL_TYPE;

    constructor(symbol: string = "$", type: SYMBOL_TYPE = SYMBOL_TYPE.EMPTY) {
        this.symbol = symbol;
        this.type = type;
    }
}

const symbols: Map<string, Symbol> = new Map<string, Symbol>();

function getSymbol(str: string = "$", type?: SYMBOL_TYPE): Symbol {
    if (!symbols.has(str)) {
        symbols.set(str, new Symbol(str, type));
    }
    return symbols.get(str)!;
}

function cloneSymbolSet(symbolSet: Set<Symbol>): Set<Symbol> {
    const cloned: Set<Symbol> = new Set<Symbol>();
    symbolSet.forEach(symbol => cloned.add(symbol));
    return cloned;
}

export class Production {
    public left: Symbol;
    public candidates: Symbol[][] = [];
    public isValid = true;

    constructor(str: string) {
        this.left = getSymbol(str[0], SYMBOL_TYPE.VARIABLE);
        this.addCandidate(str);
    }

    addCandidate(str: string): void {
        if (str.length < 4 || !(str[1] === '-' && str[2] === '>')) {
            throw new Error(`无法解析产生式 ${str}`);
            // return;
        }
        for (const value of str.substr(3).split('|')) {
            const candidate: Symbol[] = [];
            for (const x of value) {
                let type: SYMBOL_TYPE = SYMBOL_TYPE.TERMINAL;
                if (x === '$') {
                    type = SYMBOL_TYPE.EMPTY;
                } else if (x >= 'A' && x <= 'Z') {
                    type = SYMBOL_TYPE.VARIABLE;
                }
                candidate.push(getSymbol(x, type));
            }
            this.candidates.push(candidate);
        }
    }
}

export class LL1 {
    private productions: Production[] = [];
    private first: Map<Symbol, Set<Symbol>> = new Map<Symbol, Set<Symbol>>();
    private stringFirst: Map<string, Set<Symbol>> = new Map<string, Set<Symbol>>();
    private follow: Map<Symbol, Set<Symbol>> = new Map<Symbol, Set<Symbol>>();
    private analyseTable: Map<Symbol, Map<Symbol, Symbol[]>> = new Map<Symbol, Map<Symbol, Symbol[]>>();
    private done: Map<Symbol, boolean> = new Map<Symbol, boolean>();
    private terminals: Set<Symbol> = new Set<Symbol>();
    private unfinishedAnalyseResult: { stack: string, remind: string, action: string }[] = [];

    constructor(productionInput: string) {
        symbols.clear();
        if (productionInput.length < 1) {
            return;
        }
        const tempMap: Map<string, number> = new Map<string, number>();
        let count: number = 0;
        for (const value of productionInput.split('\n')) {
            try {
                if (tempMap.has(value[0])) {
                    this.productions[tempMap.get(value[0])!].addCandidate(value);
                } else {
                    tempMap.set(value[0], count++);
                    this.productions.push(new Production(value));
                }
            } catch (e) {
                throw e;
            }
        }
        for (const production of this.productions) {
            for (const candidate of production.candidates) {
                for (const symbol of candidate) {
                    this.first.set(symbol, new Set<Symbol>());
                    if (symbol.type === SYMBOL_TYPE.TERMINAL) {
                        this.terminals.add(symbol);
                    }
                }
            }
            this.first.set(production.left, new Set<Symbol>());
            this.follow.set(production.left, new Set<Symbol>());
        }
        this.done.clear();
        this.productions.forEach(production => {    // 递归求解 first 集合
            this.calculateFirst(production.left);
        })
        this.productions.forEach(production => {    // 求解符号串 first 集合
            production.candidates.forEach(candidate => {
                const str: string = candidate.map(symbol => symbol.symbol).join("");
                this.stringFirst.set(str, new Set<Symbol>());
                for (let i = 0; i < candidate.length; ++i) {
                    const tempSet: Set<Symbol> = cloneSymbolSet(this.first.get(candidate[i])!);
                    if (i + 1 !== candidate.length) {    // 不是最后一个符号
                        tempSet.delete(getSymbol("$"));
                    }
                    const first = this.stringFirst.get(str)!;
                    tempSet.forEach(symbol => first.add(symbol));
                    if (!this.first.get(candidate[i])!.has(getSymbol("$"))) {  // 当前符号不能推出 $
                        break;
                    }
                }
            })
        })
        this.done.clear();
        this.productions.forEach(production => this.calculateFollow(production.left));
        this.constructAnalyseTable();
    }

    private calculateFirst(symbol: Symbol) {
        if (this.done.has(symbol)) {
            return;
        }
        if (symbol.type === SYMBOL_TYPE.TERMINAL || symbol.type === SYMBOL_TYPE.EMPTY) {
            this.first.get(symbol)!.add(symbol);
            this.done.set(symbol, true);
            return;
        }
        for (const production of this.productions) {
            if (production.left === symbol) {
                for (const candidate of production.candidates) {
                    for (let i = 0; i < candidate.length; ++i) {
                        this.calculateFirst(candidate[i]);
                        const first = this.first.get(symbol)!;
                        if (candidate[i].type !== SYMBOL_TYPE.VARIABLE || !this.first.get(candidate[i])!.has(getSymbol("$"))) {
                            this.first.get(candidate[i])!.forEach(value => first.add(value));
                            break;
                        }
                        const tempSet: Set<Symbol> = cloneSymbolSet(this.first.get(candidate[i])!);
                        if (i + 1 !== candidate.length) {
                            tempSet.delete(getSymbol("$"));
                        }
                        tempSet.forEach(value => first.add(value));
                    }
                }
                break;
            }
        }
        this.done.set(symbol, true);
    }

    private calculateFollow(symbol: Symbol) {
        if (this.done.has(symbol)) {
            return;
        } else {
            this.done.set(symbol, true);
        }
        if (symbol.symbol === "S") {
            this.follow.get(symbol)!.add(getSymbol("#", SYMBOL_TYPE.TERMINAL));
        }
        for (const production of this.productions) {
            for (const candidate of production.candidates) {
                for (let i = 0; i < candidate.length; ++i) {
                    if (candidate[i] === symbol) {  // 找到这个符号
                        if (i + 1 === candidate.length) {   // 最后一个符号
                            this.calculateFollow(production.left);
                            const follow = this.follow.get(candidate[i])!;
                            this.follow.get(production.left)!.forEach(symbol => follow.add(symbol));
                            continue;
                        }
                        if (candidate[i + 1].type === SYMBOL_TYPE.TERMINAL) {
                            this.follow.get(candidate[i])!.add(candidate[i + 1]);
                        } else {
                            const tempSet = cloneSymbolSet(this.first.get(candidate[i + 1])!);
                            tempSet.delete(getSymbol("$"));
                            const follow = this.follow.get(candidate[i])!;
                            tempSet.forEach(symbol => follow.add(symbol));
                            if (this.first.get(candidate[i + 1])!.has(getSymbol("$"))) {    // 下一个符号的 first 有 $
                                this.calculateFollow(production.left);
                                const follow = this.follow.get(candidate[i])!;
                                this.follow.get(production.left)!.forEach(symbol => follow.add(symbol));
                            }
                        }
                    }
                }
            }
        }
    }

    private constructAnalyseTable() {
        for (const production of this.productions) {
            this.analyseTable.set(production.left, new Map<Symbol, Symbol[]>());
            for (const candidate of production.candidates) {
                const str: string = candidate.map(symbol => symbol.symbol).join("");
                this.stringFirst.get(str)!.forEach(symbol => {
                    if (symbol.type !== SYMBOL_TYPE.EMPTY) {
                        this.analyseTable.get(production.left)!.set(symbol, candidate);
                    }
                });
                if (this.stringFirst.get(str)!.has(getSymbol("$"))) {
                    this.follow.get(production.left)!.forEach(symbol => {
                        if (symbol.type !== SYMBOL_TYPE.EMPTY) {
                            this.analyseTable.get(production.left)!.set(symbol, candidate);
                        }
                    })
                    if (this.follow.get(production.left)!.has(getSymbol("#"))) {
                        this.analyseTable.get(production.left)!.set(getSymbol("#"), candidate);
                    }
                }
            }
        }
    }

    private mapToArray(map: Map<Symbol, Set<Symbol>>): { variable: string, set: string[] }[] {
        const res: { variable: string, set: string[] }[] = [];
        map.forEach((value, key) => {
            if (key.type !== SYMBOL_TYPE.VARIABLE) {
                return;
            }
            const temp: string[] = [];
            value.forEach(value => temp.push(value.symbol.replace(/\$/, 'ε')));
            res.push({variable: key.symbol, set: temp});
        })
        return res;
    }

    public analyse(input: string): { stack: string, remind: string, action: string }[] {
        if (!input.endsWith("#")) {
            throw new Error("输入串需要以 # 结尾")
        }
        const res: { stack: string, remind: string, action: string }[] = [];
        const analyseStack: Symbol[] = [];
        const symbols: Symbol[] = [];
        for (const s of input) {
            symbols.push(getSymbol(s, SYMBOL_TYPE.TERMINAL));
        }
        analyseStack.push(getSymbol("#", SYMBOL_TYPE.TERMINAL));
        analyseStack.push(getSymbol("S", SYMBOL_TYPE.TERMINAL));
        let i = 0;
        while (i !== symbols.length) {
            if (analyseStack.length === 1) {
                res.push({
                    stack: analyseStack.map(x => x.symbol).join(""),
                    remind: symbols.slice(i).map(x => x.symbol).join(""),
                    action: "解析成功",
                })
                break;
            }
            const back = analyseStack.pop()!;
            if (back.type === SYMBOL_TYPE.TERMINAL && back === symbols[i]) {
                res.push({
                    stack: analyseStack.map(x => x.symbol).join("").concat(back.symbol),
                    remind: symbols.slice(i).map(x => x.symbol).join(""),
                    action: `${symbols[i].symbol} 匹配`,
                })
                ++i;
                continue;
            }
            if (!this.analyseTable.has(back)) {
                res.push({
                    stack: analyseStack.map(x => x.symbol).join(""),
                    remind: symbols.slice(i).map(x => x.symbol).join(""),
                    action: "无法继续解析",
                })
                this.unfinishedAnalyseResult = res;
                throw new Error(`未定义的非终结符 ${back.symbol}`)
            }
            if (this.analyseTable.get(back)!.has(symbols[i])) { // 查找分析表
                const production = this.analyseTable.get(back)!.get(symbols[i])!;
                res.push({
                    stack: analyseStack.map(x => x.symbol).join("").concat(back.symbol),
                    remind: symbols.slice(i).map(x => x.symbol).join(""),
                    action: `${back.symbol}->${production.map(x => x.symbol).join("")}`,
                })
                let j = production.length;
                if (production[j - 1].type !== SYMBOL_TYPE.EMPTY) { // 处理为 $ 时
                    while (true) {
                        --j;
                        analyseStack.push(production[j]);
                        if (j === 0) {
                            break;
                        }
                    }
                }
            } else {
                res.push({
                    stack: analyseStack.map(x => x.symbol).join(""),
                    remind: symbols.slice(i).map(x => x.symbol).join(""),
                    action: "无法继续解析",
                })
                this.unfinishedAnalyseResult = res;
                throw new Error(`无法从 ${back.symbol} 推导 ${symbols[i].symbol}`)
            }
        }
        return res;
    }

    public getFirstSet(): { variable: string, set: string[] }[] {
        return this.mapToArray(this.first);
    }

    public getFollowSet(): { variable: string; set: string[] }[] {
        return this.mapToArray(this.follow);
    }

    public getAnalyseTable(): { variable: string, terminals: {} }[] {
        const res: { variable: string, terminals: StringToString }[] = [];
        this.analyseTable.forEach((value, key) => {
            const temp: StringToString = {};
            value.forEach((value, key) => {
                temp[key.symbol] = value.map(value => value.symbol.replace(/\$/, 'ε')).join("");
            })
            res.push({variable: key.symbol, terminals: temp});
        })
        return res;
    }

    public getTerminals(): string[] {
        const res: string[] = [];
        this.terminals.forEach(value => res.push(value.symbol.replace(/\$/, 'ε')));
        res.push("#");
        return res;
    }

    public getUnfinished(): { stack: string, remind: string, action: string }[] {
        return this.unfinishedAnalyseResult;
    }
}
