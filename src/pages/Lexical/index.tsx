import React from 'react';
import {Row, Col, Input, Table, Card, Button, List, Popover} from 'antd'
import './index.scss';
import {CLangType, Lexical, Result} from './lexicalAnalysis';

const colors = [
    "#E74C3C",  //错误
    "#AB47BC",  //保留字
    "#17202A",  //分界符
    "#D4E157",  //算数运算符
    "#80CBC4",  //关系运算符
    "#21618C",  //数字
    "#2E86C1",  //标识符
    "#1ABC9C",  //字符
    "#4CAF50",  //字符串
    "#B0BEC5",  //注释
    "#B0BEC5",  //多行注释
]
const example: string = "int ans = 0;\n" +
    "for(int i = 1; i < 100; ++i) {\n" +
    "    ans += i;\n" +
    "}\n" +
    "printf(\"ans = %d\", ans);";

class LexicalComponent extends React.Component {
    state = {
        input: example,
    }
    lexical = new Lexical();
    onTextareaChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        this.setState({
            input: event.target.value,
        })
    }

    render(): React.ReactNode {
        const results = this.lexical.analysis(this.state.input);
        const lineList: Array<Result[]> = new Array<Result[]>();
        results.forEach(item => {
            if (!lineList[item.line]) {
                lineList[item.line] = []
            }
            lineList[item.line].push(item)
        })
        const tokenNodes = lineList.map((item, index) => {
            return <List.Item style={{justifyContent: "left"}}>
                <Button size={"large"}>#{index}</Button>
                <div className="list-item-detail">
                    {
                        item.map(item => {
                            return <Popover
                                title={Lexical.cLangTypeToStringChinese(item.type)}
                                content={
                                    <>
                                        <p>位置：{`${item.line}行${item.column}列`}</p>
                                        <p>类别：{Lexical.cLangTypeToStringEnglish(item.type)}</p>
                                    </>
                                }>
                                <Button
                                    style={{backgroundColor: colors[item.type], color: "white"}}
                                    size={"middle"}>{item.token}</Button>
                            </Popover>
                        })
                    }
                </div>
            </List.Item>
        })
        return (
            <div className="page">
                <Row>
                    <Col span={14}>
                        <Card title={`C 源码（共 ${this.state.input.length} 个字符）`} bordered={false}>
                            <Input.TextArea
                                rows={12}
                                onChange={this.onTextareaChange}
                                defaultValue={example}
                            />
                        </Card>
                        <Card
                            title={`词法分析结果#2（共 ${results[results.length - 1] ? results[results.length - 1].line : 0} 行）`}
                            bordered={false}>
                            <List>{tokenNodes}</List>
                        </Card>
                    </Col>
                    <Col span={10}>
                        <div className="res-table">
                            <Card title={`词法分析结果#1（共 ${results.length} 个单词）`} bordered={false}>
                                <Table
                                    dataSource={results}
                                    rowClassName={record => record.type === CLangType.ERROR ? 'row-error' : ''}
                                    pagination={false}
                                    bordered
                                    size="small">
                                    <Table.Column
                                        title="序号"
                                        key="id"
                                        render={(text, record, index) => (
                                            <>
                                                {index}
                                            </>
                                        )}
                                    />
                                    <Table.Column
                                        title="单词"
                                        key="token"
                                        dataIndex="token"
                                    />
                                    <Table.Column
                                        title="类别"
                                        key="type"
                                        render={(text, record: Result) => (
                                            <>
                                                {Lexical.cLangTypeToStringChinese(record.type)}
                                            </>
                                        )}
                                    />
                                    <Table.Column
                                        title="位置"
                                        key="line-column"
                                        render={(text, record: Result) => (
                                            <>
                                                {`${record.line}:${record.column}`}
                                            </>
                                        )}
                                    />
                                </Table>
                            </Card>
                        </div>
                    </Col>
                </Row>
            </div>
        )
    }
}

export default LexicalComponent;
