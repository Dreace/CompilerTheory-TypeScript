import React from "react";
import {LL1, StringToString} from "./ll1"
import "./index.scss"
import {Row, Col, Card, Input, Table, List, message, Alert} from "antd"

interface LL1ComponentState {
    analyseTable: { variable: string, terminals: {} }[];
    terminals: string[];
    firstSet: { variable: string, set: string[] }[];
    followSet: { variable: string, set: string[] }[];
    result: { stack: string, remind: string, action: string }[];
    grammar: string;
    input: string;
}

const example = {
    grammar: "S->TA\n" +
        "A->+TA|$\n" +
        "T->FB\n" +
        "B->*FB|$\n" +
        "F->(S)|i",
    input: "(i+i)*(i+i)#",
};

export class LL1Component extends React.Component<{}, LL1ComponentState> {

    readonly state: LL1ComponentState = {
        analyseTable: [],
        terminals: [],
        firstSet: [],
        followSet: [],
        result: [],
        grammar: example.grammar,
        input: example.input,
    }
    ll1: LL1 = new LL1("");

    componentDidMount() {
        this.setGrammar(example.grammar);
        this.analyse(example.input);
    }

    analyse = (input: string) => {
        try {
            this.ll1.analyse(input);
            this.setState({
                result: this.ll1.analyse(input)
            })
            message.success("解析成功")
        } catch (e) {
            this.setState({
                result: this.ll1.getUnfinished(),
            })
            message.error(e.message);
        }
    }
    setGrammar = (grammarString: string) => {
        try {
            this.ll1 = new LL1(grammarString);
            this.setState({
                analyseTable: this.ll1.getAnalyseTable(),
                terminals: this.ll1.getTerminals(),
                firstSet: this.ll1.getFirstSet(),
                followSet: this.ll1.getFollowSet(),
            })
            this.analyse(this.state.input);
        } catch (e) {
            message.error(e.message);
        }
    }
    handleInputChange = (event: React.FocusEvent<HTMLTextAreaElement>) => {
        if (event.target.value.length < 1) {
            return;
        }
        this.setState({
            input: event.target.value,
        })
        this.analyse(event.target.value);
    }
    handleGrammarChange = (event: React.FocusEvent<HTMLTextAreaElement>) => {
        if (event.target.value.length < 1) {
            return;
        }
        this.setState({
            grammar: event.target.value,
        })
        this.setGrammar(event.target.value);
    }

    render() {
        this.ll1.getAnalyseTable();
        return (
            <div className="page">
                <Alert message={"输入串必须以 # 结尾，文法中使用 $ 代替 ε。"} type={"info"}/>
                <Row>
                    <Col span={6} className="col">
                        <Card title={"输入串"} bordered={false}>
                            <Input.TextArea
                                defaultValue={example.input}
                                placeholder={example.input}
                                onChange={this.handleInputChange}
                                rows={10}
                            />

                        </Card>
                        <Card title={"FIRST 集合"} bordered={false}>
                            <List
                                bordered
                                dataSource={this.state.firstSet}
                                renderItem={item => (<List.Item>
                                        {`FIRST(${item.variable})={${item.set.join()}}`}
                                    </List.Item>
                                )}
                            />
                        </Card>
                    </Col>
                    <Col span={6} className="col">
                        <Card title={"文法"} bordered={false}>
                            <Input.TextArea
                                defaultValue={example.grammar}
                                placeholder={example.grammar}
                                onChange={this.handleGrammarChange}
                                rows={10}
                            />
                        </Card>
                        <Card title={"FOLLOW 集合"} bordered={false}>
                            <List
                                bordered
                                dataSource={this.state.followSet}
                                renderItem={item => (<List.Item>
                                        {`FOLLOW(${item.variable})={${item.set.join()}}`}
                                    </List.Item>
                                )}
                            />
                        </Card>
                    </Col>
                    <Col span={12} className="col">
                        <Card title={"预测分析表"} bordered={false}>
                            <Table
                                dataSource={this.state.analyseTable}
                                pagination={false}
                                size={"small"}
                                rowKey={(record, index) => `${record.variable}-${index}`}
                                bordered
                            >
                                <Table.Column
                                    align="center"
                                    title="非终结符"
                                    key="variable"
                                    render={(text, record: { variable: string, terminals: StringToString }) => (
                                        <>
                                            {record.variable}
                                        </>
                                    )}/>
                                {
                                    this.state.terminals.map(value => {
                                        return <Table.Column
                                            align="center"
                                            title={value}
                                            key={value}
                                            render={(text, record: { variable: string, terminals: StringToString }) => (
                                                <>
                                                    {record.terminals[value]}
                                                </>
                                            )}
                                        />;
                                    })
                                }
                            </Table>
                        </Card>
                        <Card title={"分析过程"} bordered={false}>
                            <Table
                                dataSource={this.state.result}
                                pagination={false}
                                size={"small"}
                                rowClassName={(record => (record.action === '无法继续解析' ? 'row-error' : ''))}
                                rowKey={(record, index) => (`${record.stack}-${index}`)}
                            >
                                <Table.Column
                                    title="序号"
                                    align={"center"}
                                    render={(text, record, index) => (
                                        <>
                                            {index}
                                        </>
                                    )}/>
                                <Table.Column title="分析栈" dataIndex="stack"/>
                                <Table.Column title="剩余串" align={"right"} dataIndex="remind"/>
                                <Table.Column title="动作" align={"center"} dataIndex="action"/>
                            </Table>
                        </Card>
                    </Col>
                </Row>
            </div>
        );
    }
}
