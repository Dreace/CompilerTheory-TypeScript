export enum CLangType {
    ERROR,                  // 错误
    KEY_WORD,               // 保留字
    DELIMITER,              // 定界符
    OPERATOR,               // 算数运算
    NUMBER,                 // 数字
    IDENTIFIER,             // 标识符
    CHAR,                   // 字符
    STRING,                 // 字符串
    COMMENT,                // 注释
    MULTIPLE_LINE_COMMENT,  // 多行注释
}

export class Result {
    public type: CLangType = CLangType.ERROR;
    public line: number = -1;
    public column: number = -1;
    public token: string = "";
}

function isAlpha(str: string): boolean {
    return /^[a-zA-Z]$/.test(str);
}

function isDigit(str: string): boolean {
    return /^\d$/.test(str);
}

function isAlphanumeric(str: string): boolean {
    return /^\w$/.test(str);
}

export class Lexical {
    private recognized: Map<string, CLangType> = new Map<string, CLangType>();
    private static keyWordIDMap: Map<string, number> = new Map<string, number>();
    private static operators: Map<string, CLangType> = new Map<string, CLangType>();
    private static typeStringsChinese: string[] = [
        "错误", "保留字", "分界符", "运算符", "数字", "标识符", "字符", "字符串", "注释", "多行注释",
    ];
    private static typeStringsEnglish: string[] = [
        "ERROR", "KEY_WORD", "DELIMITER", "OPERATOR", "NUMBER", "IDENTIFIER",
        "CHAR", "STRING", "COMMENT", "MULTIPLE_LINE_COMMENT",
    ];
    private static keyWords: string[] = [
        "auto", "double", "int", "struct", "break", "else", "long", "switch", "case", "enum", "register",
        "typedef", "char", "extern", "return", "union", "const", "float", "short", "unsigned", "continue",
        "for", "signed", "void", "default", "goto", "sizeof", "volatile", "do", "if", "while", "static",
    ];


    constructor() {
        let id = 0;
        for (const keyWord of Lexical.keyWords) {
            Lexical.keyWordIDMap.set(keyWord, id);
            ++id;
        }
        const delimiters = [
            ",", ";", "(", ")", "[", "]", "{", "}",
        ];
        const operators = [
            "+", "-", "*", "/", "%", "++", "--", "<<", ">>", "&", "|", "^", "~", ">", "<", ">=",
            "<=", "!=", "==", "=", "||", "&&", "!", "+=", "-=", "*=", "/=", "&=", "|=", "^=",
            "<<=", ">>=", "->", ".", "sizeof", "?", ":"
        ];
        for (const delimiter of delimiters) {
            Lexical.operators.set(delimiter, CLangType.DELIMITER);
        }
        for (const operator of operators) {
            Lexical.operators.set(operator, CLangType.OPERATOR);
        }
    }

    public analysis(input: string): Result[] {
        input += " ";   // 保证最后一个字符是空白符
        const results: Result[] = [];
        const inputLength = input.length;
        let lines = 1;
        let column = 0, columnStartAt = 0;
        while (column < inputLength) {
            const result = new Result();
            result.column = column;
            result.line = lines;
            const c = input.charAt(column);
            let j = 0;
            let str = "";
            if (c === '\n') {   // 输入源码换行
                ++lines;
                ++column;
                columnStartAt = column;
                continue;
            } else if (isAlpha(c)) {    // 标识符
                for (j = column + 1; j < inputLength; ++j) {
                    if (!isAlphanumeric(input[j]) || input[j] === '_') {
                        break;
                    }
                }
                str = input.substr(column, j - column);
                if (Lexical.isKeyWord(str)) {   // 保留字
                    result.type = CLangType.KEY_WORD;
                } else if (Lexical.isIdentifier(str)) { // 合法标识符
                    result.type = CLangType.IDENTIFIER;
                } else {    // 无法识别
                    result.type = CLangType.ERROR;
                }
                column = j;
            } else if (isDigit(c)) {    // 数字
                for (j = column + 1; j < inputLength; ++j) {
                    if (!isAlphanumeric(input[j])) {    // 跟着字母或数字
                        break;
                    }
                }
                str = input.substr(column, j - column);
                result.type = Lexical.isNumber(str) ? CLangType.NUMBER : CLangType.ERROR;   // 合法数字
                column = j;
            } else if (c === '/' && (input[column + 1] === '*' || input[column + 1] === '/')) { // 两种注释
                if (input[column + 1] === '*') {   // 多行注释
                    for (j = column + 2; j < inputLength - 2; ++j) {
                        if (input[j] === '*' && input[j + 1] === '/') { // 找到配对的 */
                            str = input.substr(column + 2, j - column - 2);
                            column = j + 2;
                            break;
                        }
                    }
                    if (j < inputLength - 2) {
                        result.type = CLangType.MULTIPLE_LINE_COMMENT;
                    } else {    // 到最后还没找到
                        str = input.substr(column, inputLength - column);
                        result.type = CLangType.ERROR;
                        column = inputLength;
                    }

                } else {    // 单行注释
                    for (j = column + 2; j < inputLength; ++j) {
                        if (input[j] === '\n') {    // 换行则注释结束
                            break;
                        }
                    }
                    str = input.substr(column + 2, j - column - 2);
                    result.type = CLangType.COMMENT;
                    column = j;
                }
            } else if (Lexical.isOperator(c)) { // 各种运算符与定界符
                if (Lexical.operators.get(c) === CLangType.DELIMITER) { // 定界符
                    result.type = CLangType.DELIMITER;
                    str = c;
                    ++column;
                } else {
                    for (j = column + 1; j < inputLength; ++j) {
                        if (!Lexical.isOperator(input.substr(column, j - column))) {    // 最长匹配合法运算符
                            break;
                        }
                    }
                    str = input.substr(column, j - column - 1);
                    result.type = Lexical.operators.get(str) as CLangType;
                    column = j - 1;
                }
            } else if (c === '"' || c === '\'') {
                for (j = column + 1; j < inputLength; ++j) {
                    if (input[j] === '\\') {    // 转义符起始，跳过下一个字符
                        ++j;
                    } else if (input[j] === c) {
                        break;
                    }
                }
                str = input.substr(column + 1, j - column - 1);
                if (j >= inputLength) { // 引号没有配对
                    result.type = CLangType.ERROR;
                } else if (c === '"') { // 字符串
                    result.type = CLangType.STRING;
                } else {
                    if (str.length === 1 || (str[0] === '\\' && str.length === 2)) {    // 类似 ‘a’、‘\n’
                        result.type = CLangType.CHAR;
                    } else {
                        let sub = str.substr(1, str.length - 1);
                        if (Lexical.isNumber(sub) && Number(sub) < 377) {   // 合法的字符编码
                            result.type = CLangType.CHAR;
                        } else {
                            result.type = CLangType.ERROR;
                        }
                    }
                }
                column = j + 1;
            } else {
                ++column;
                continue;
            }
            result.token = str;
            result.column -= (columnStartAt - 1);
            this.recognized.set(str, result.type);
            results.push(result);
        }
        return results;
    }

    public static cLangTypeToStringChinese(clangType: CLangType): string {
        return Lexical.typeStringsChinese[clangType];
    }

    public static cLangTypeToStringEnglish(clangType: CLangType): string {
        return Lexical.typeStringsEnglish[clangType];
    }

    private static isKeyWord(str: string): boolean {
        return Lexical.keyWordIDMap.has(str);
    }

    private static isNumber(str: string): boolean {
        return /^\d+$/.test(str);
    }

    private static isIdentifier(str: string): boolean {
        return /^[a-zA-Z_]\w*$/.test(str);
    }

    private static isOperator(str: string): boolean {
        return Lexical.operators.has(str);
    }
}

